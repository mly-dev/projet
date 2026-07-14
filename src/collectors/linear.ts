import type { NotionTask } from "../types.js";

interface LinearIssuesResponse {
  data?: {
    issues: {
      nodes: Array<{ title: string; completedAt: string | null }>;
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * Récupère les issues Linear terminées depuis une date donnée (GraphQL).
 * Source optionnelle : retourne [] si LINEAR_API_KEY est absent.
 */
export async function fetchCompletedIssues(
  since: Date,
  apiKey?: string,
): Promise<NotionTask[]> {
  if (!apiKey) return [];

  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `query CompletedIssues($since: DateTimeOrDuration!) {
        issues(filter: { completedAt: { gte: $since } }, first: 100) {
          nodes { title completedAt }
        }
      }`,
      variables: { since: since.toISOString() },
    }),
  });

  if (res.status === 401) {
    throw new Error("Clé Linear invalide. Vérifiez LINEAR_API_KEY dans votre .env.");
  }
  if (!res.ok) {
    throw new Error(`Erreur Linear API (${res.status}) : ${await res.text()}`);
  }

  const data = (await res.json()) as LinearIssuesResponse;
  if (data.errors?.length) {
    throw new Error(`Erreur Linear GraphQL : ${data.errors[0].message}`);
  }

  return (data.data?.issues.nodes ?? [])
    .filter((n): n is { title: string; completedAt: string } => n.completedAt !== null)
    .map((n) => ({ title: n.title, completedAt: n.completedAt }));
}
