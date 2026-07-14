/** Trafic du site sur la période (Plausible Analytics). */
export interface PlausibleStats {
  visitors: number;
  pageviews: number;
}

interface PlausibleAggregate {
  results: {
    visitors: { value: number };
    pageviews: { value: number };
  };
}

/**
 * Récupère visiteurs et pages vues sur la période via l'API Stats de
 * Plausible. Source optionnelle : retourne null si PLAUSIBLE_API_KEY ou
 * PLAUSIBLE_SITE_ID est absent. PLAUSIBLE_API_URL permet le self-hosted.
 */
export async function fetchPlausibleStats(
  since: Date,
  until: Date,
  opts: { apiKey?: string; siteId?: string; apiUrl?: string },
): Promise<PlausibleStats | null> {
  if (!opts.apiKey || !opts.siteId) return null;

  const base = (opts.apiUrl ?? "https://plausible.io").replace(/\/$/, "");
  const params = new URLSearchParams({
    site_id: opts.siteId,
    period: "custom",
    date: `${since.toISOString().slice(0, 10)},${until.toISOString().slice(0, 10)}`,
    metrics: "visitors,pageviews",
  });

  const res = await fetch(`${base}/api/v1/stats/aggregate?${params}`, {
    headers: { Authorization: `Bearer ${opts.apiKey}` },
  });

  if (res.status === 401) {
    throw new Error("Clé Plausible invalide. Vérifiez PLAUSIBLE_API_KEY dans votre .env.");
  }
  if (!res.ok) {
    throw new Error(`Erreur Plausible API (${res.status}) : ${await res.text()}`);
  }

  const data = (await res.json()) as PlausibleAggregate;
  return {
    visitors: data.results.visitors.value,
    pageviews: data.results.pageviews.value,
  };
}
