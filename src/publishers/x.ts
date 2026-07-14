import crypto from "node:crypto";

export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

/**
 * Lit les identifiants X depuis l'environnement. Retourne null si la
 * publication X n'est pas configurée.
 */
export function readXCredentials(): XCredentials | null {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    return null;
  }
  return {
    apiKey: X_API_KEY,
    apiSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_SECRET,
  };
}

/**
 * Publie un thread sur X : chaque tweet répond au précédent. Un média
 * (l'ID retourné par uploadMedia) peut être joint au premier tweet.
 * Retourne les IDs des tweets publiés (le premier est le hook).
 */
export async function publishThread(
  tweets: string[],
  creds: XCredentials,
  firstTweetMediaId?: string,
): Promise<string[]> {
  const url = "https://api.x.com/2/tweets";
  const ids: string[] = [];
  let replyTo: string | undefined;

  for (const text of tweets) {
    const body: Record<string, unknown> = replyTo
      ? { text, reply: { in_reply_to_tweet_id: replyTo } }
      : { text };
    if (!replyTo && firstTweetMediaId) {
      body.media = { media_ids: [firstTweetMediaId] };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: oauth1Header("POST", url, creds),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      throw new Error(
        "Rate limit X atteinte. Le plan gratuit limite le nombre de tweets par jour — réessayez plus tard.",
      );
    }
    if (!res.ok) {
      throw new Error(`Erreur X API (${res.status}) : ${await res.text()}`);
    }

    const data = (await res.json()) as { data: { id: string } };
    ids.push(data.data.id);
    replyTo = data.data.id;
  }

  return ids;
}

/**
 * Téléverse une image PNG sur X et retourne son media_id, à joindre à un
 * tweet. Essaie l'endpoint v2 puis retombe sur v1.1 si indisponible.
 */
export async function uploadMedia(
  png: Buffer,
  creds: XCredentials,
): Promise<string> {
  const attempt = async (url: string): Promise<Response> => {
    const form = new FormData();
    form.append("media", new Blob([new Uint8Array(png)], { type: "image/png" }), "chart.png");
    form.append("media_category", "tweet_image");
    return fetch(url, {
      method: "POST",
      headers: { Authorization: oauth1Header("POST", url, creds) },
      body: form,
    });
  };

  let res = await attempt("https://api.x.com/2/media/upload");
  if (res.status === 404 || res.status === 400) {
    res = await attempt("https://upload.twitter.com/1.1/media/upload.json");
  }
  if (!res.ok) {
    throw new Error(`Erreur X media upload (${res.status}) : ${await res.text()}`);
  }

  const data = (await res.json()) as {
    data?: { id?: string; media_key?: string };
    media_id_string?: string;
  };
  const id = data.data?.id ?? data.media_id_string;
  if (!id) {
    throw new Error("Réponse X media upload inattendue : identifiant du média absent.");
  }
  return id;
}

/**
 * Construit l'en-tête Authorization OAuth 1.0a (user context) exigé par
 * l'API X v2 pour poster. Le corps étant du JSON ou du multipart, seuls
 * les paramètres oauth_* entrent dans la signature.
 */
function oauth1Header(method: string, url: string, creds: XCredentials): string {
  const params: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${pct(k)}=${pct(params[k])}`)
    .join("&");
  const baseString = [method.toUpperCase(), pct(url), pct(paramString)].join("&");
  const signingKey = `${pct(creds.apiSecret)}&${pct(creds.accessSecret)}`;
  params.oauth_signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  return (
    "OAuth " +
    Object.keys(params)
      .sort()
      .map((k) => `${pct(k)}="${pct(params[k])}"`)
      .join(", ")
  );
}

/** Encodage pourcent strict RFC 3986 (OAuth 1.0a). */
function pct(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}
