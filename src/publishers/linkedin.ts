export interface LinkedInCredentials {
  accessToken: string;
  /** URN de l'auteur (urn:li:person:xxx). Déduit du token si absent. */
  authorUrn?: string;
}

/**
 * Lit les identifiants LinkedIn depuis l'environnement. Retourne null si la
 * publication LinkedIn n'est pas configurée.
 */
export function readLinkedInCredentials(): LinkedInCredentials | null {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) return null;
  return { accessToken: token, authorUrn: process.env.LINKEDIN_AUTHOR_URN };
}

/**
 * Publie un post texte sur le profil LinkedIn de l'auteur via l'API Posts.
 * Le token doit porter les scopes openid + w_member_social.
 * Retourne l'URN du post créé.
 */
export async function publishLinkedInPost(
  text: string,
  creds: LinkedInCredentials,
): Promise<string> {
  const author = creds.authorUrn ?? (await resolveAuthorUrn(creds.accessToken));

  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "LinkedIn-Version": "202506",
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author,
      commentary: escapeLittleText(text),
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (res.status === 401) {
    throw new Error(
      "Token LinkedIn invalide ou expiré. Regénérez LINKEDIN_ACCESS_TOKEN (scopes openid + w_member_social).",
    );
  }
  if (!res.ok) {
    throw new Error(`Erreur LinkedIn API (${res.status}) : ${await res.text()}`);
  }

  return res.headers.get("x-restli-id") ?? "(post créé)";
}

/** Récupère l'URN de la personne connectée via OpenID userinfo. */
async function resolveAuthorUrn(token: string): Promise<string> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(
      `Impossible de déterminer l'auteur LinkedIn (${res.status}). Définissez LINKEDIN_AUTHOR_URN (urn:li:person:xxx) ou ajoutez le scope openid au token.`,
    );
  }
  const data = (await res.json()) as { sub: string };
  return `urn:li:person:${data.sub}`;
}

/**
 * Échappe les caractères réservés du format "Little Text" de l'API Posts,
 * sans quoi LinkedIn rejette ou déforme le texte.
 */
function escapeLittleText(text: string): string {
  return text.replace(/[(){}<>\[\]*_~|@\\]/g, (c) => `\\${c}`);
}
