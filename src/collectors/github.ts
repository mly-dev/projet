import type { Commit } from "../types.js";

interface GitHubCommitApi {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
}

/**
 * Récupère les commits d'un dépôt GitHub depuis une date donnée.
 * Fonctionne sans token pour les dépôts publics (rate limit plus basse) ;
 * un GITHUB_TOKEN étend la limite et donne accès aux dépôts privés.
 */
export async function fetchCommits(
  repo: string,
  since: Date,
  token?: string,
): Promise<Commit[]> {
  const commits: Commit[] = [];
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "bip-assistant",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let page = 1;
  // Pagination bornée : 5 pages × 100 commits couvrent largement une semaine.
  while (page <= 5) {
    const url = new URL(`https://api.github.com/repos/${repo}/commits`);
    url.searchParams.set("since", since.toISOString());
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const res = await fetch(url, { headers });
    if (res.status === 404) {
      throw new Error(
        `Dépôt GitHub introuvable : "${repo}". Vérifiez le format owner/repo et vos droits d'accès.`,
      );
    }
    if (res.status === 403 || res.status === 429) {
      throw new Error(
        "Rate limit GitHub atteinte. Définissez GITHUB_TOKEN dans votre .env pour l'augmenter.",
      );
    }
    if (!res.ok) {
      throw new Error(`Erreur GitHub API (${res.status}) : ${await res.text()}`);
    }

    const batch = (await res.json()) as GitHubCommitApi[];
    for (const c of batch) {
      commits.push({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split("\n")[0],
        author: c.commit.author?.name ?? "inconnu",
        date: c.commit.author?.date ?? new Date().toISOString(),
      });
    }
    if (batch.length < 100) break;
    page++;
  }

  return commits;
}
