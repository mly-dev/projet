/** Métriques financières Stripe injectées dans le storytelling. */
export interface StripeMetrics {
  /** MRR actuel en centimes (somme des abonnements actifs, normalisée au mois). */
  mrrCents: number;
  /** Revenus nets encaissés sur la période, par jour, en centimes. */
  revenueByDay: Array<{ date: string; amountCents: number }>;
  currency: string;
}

interface StripeList<T> {
  data: T[];
  has_more: boolean;
}

interface StripeSubscription {
  items: {
    data: Array<{
      quantity?: number;
      price: {
        unit_amount: number | null;
        currency: string;
        recurring: { interval: "day" | "week" | "month" | "year"; interval_count: number } | null;
      };
    }>;
  };
}

interface StripeBalanceTransaction {
  id: string;
  type: string;
  net: number;
  currency: string;
  created: number; // epoch seconds
}

/** Facteur de conversion d'un intervalle de facturation vers le mois. */
const PER_MONTH: Record<string, number> = {
  day: 30,
  week: 4.33,
  month: 1,
  year: 1 / 12,
};

/**
 * Calcule le MRR actuel et les revenus quotidiens de la période via l'API
 * Stripe. Source optionnelle : retourne null si STRIPE_SECRET_KEY est absent.
 */
export async function fetchStripeMetrics(
  since: Date,
  secretKey?: string,
): Promise<StripeMetrics | null> {
  if (!secretKey) return null;

  const [mrr, revenue] = await Promise.all([
    computeMrr(secretKey),
    computeDailyRevenue(secretKey, since),
  ]);

  return {
    mrrCents: mrr.cents,
    currency: mrr.currency || revenue.currency || "eur",
    revenueByDay: revenue.byDay,
  };
}

async function computeMrr(
  key: string,
): Promise<{ cents: number; currency: string }> {
  let cents = 0;
  let currency = "";
  let startingAfter: string | undefined;

  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ status: "active", limit: "100" });
    params.append("expand[]", "data.items.data.price");
    if (startingAfter) params.set("starting_after", startingAfter);

    const list = await stripeGet<StripeList<StripeSubscription & { id: string }>>(
      key,
      `/v1/subscriptions?${params}`,
    );

    for (const sub of list.data) {
      for (const item of sub.items.data) {
        const { price } = item;
        if (!price.recurring || price.unit_amount == null) continue;
        const monthly =
          (price.unit_amount * (item.quantity ?? 1) * PER_MONTH[price.recurring.interval]) /
          price.recurring.interval_count;
        cents += monthly;
        currency ||= price.currency;
      }
    }

    if (!list.has_more || list.data.length === 0) break;
    startingAfter = list.data[list.data.length - 1].id;
  }

  return { cents: Math.round(cents), currency };
}

async function computeDailyRevenue(
  key: string,
  since: Date,
): Promise<{ byDay: Array<{ date: string; amountCents: number }>; currency: string }> {
  const byDay = new Map<string, number>();
  let currency = "";
  let startingAfter: string | undefined;

  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      limit: "100",
      "created[gte]": String(Math.floor(since.getTime() / 1000)),
    });
    if (startingAfter) params.set("starting_after", startingAfter);

    const list = await stripeGet<StripeList<StripeBalanceTransaction>>(
      key,
      `/v1/balance_transactions?${params}`,
    );

    for (const tx of list.data) {
      if (tx.type !== "charge" && tx.type !== "payment") continue;
      const date = new Date(tx.created * 1000).toISOString().slice(0, 10);
      byDay.set(date, (byDay.get(date) ?? 0) + tx.net);
      currency ||= tx.currency;
    }

    if (!list.has_more || list.data.length === 0) break;
    startingAfter = list.data[list.data.length - 1].id;
  }

  return {
    byDay: [...byDay.entries()]
      .map(([date, amountCents]) => ({ date, amountCents }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    currency,
  };
}

async function stripeGet<T>(key: string, path: string): Promise<T> {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status === 401) {
    throw new Error("Clé Stripe invalide. Vérifiez STRIPE_SECRET_KEY dans votre .env.");
  }
  if (!res.ok) {
    throw new Error(`Erreur Stripe API (${res.status}) : ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Formate un montant en centimes vers un libellé lisible ("1 234 €"). */
export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
