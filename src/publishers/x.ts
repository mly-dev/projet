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
 * Publie un thread sur X : chaque tweet répond au précédent.
 * Retourne les IDs des tweets publiés (le premier est le hook).
 */
export async function publishThread(
  tweets: string[],
  creds: XCredentials,
): Promise<string[]> {
  const url = "https://api.x.com/2/tweets";
  const ids: string[] = [];
  let replyTo: string | undefined;

  for (const text of tweets) {
    const body = replyTo
      ? { text, reply: { in_reply_to_tweet_id: replyTo } }
      : { text };

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
 * Construit l'en-tête Authorization OAuth 1.0a (user context) exigé par
 * l'API X v2 pour poster. Le corps étant du JSON, seuls les paramètres
 * oauth_* entrent dans la signature.
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
