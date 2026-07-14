import type { Activity } from "./types.js";

/**
 * Jeu de données d'exemple pour tester le CLI sans dépôt GitHub ni Notion
 * (`bip generate --demo`). Les dates sont recalculées relativement à
 * aujourd'hui pour que le graphique reste réaliste.
 */
export function demoActivity(days: number): Activity {
  const until = new Date();
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const day = (offset: number, h = 10) => {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + offset);
    d.setUTCHours(h, 0, 0, 0);
    return d.toISOString();
  };

  return {
    repo: "demo/saas-boilerplate",
    projectName: "ShipFast Clone",
    since: since.toISOString(),
    until: until.toISOString(),
    commits: [
      { sha: "a1b2c3d", message: "feat: intégration Stripe checkout + webhooks", author: "demo", date: day(0, 9) },
      { sha: "b2c3d4e", message: "fix: webhook signature verification failing in prod", author: "demo", date: day(0, 15) },
      { sha: "c3d4e5f", message: "feat: page pricing avec toggle mensuel/annuel", author: "demo", date: day(1, 11) },
      { sha: "d4e5f6a", message: "refactor: extraction du module d'emails transactionnels", author: "demo", date: day(2, 10) },
      { sha: "e5f6a7b", message: "feat: magic link auth (suppression des mots de passe)", author: "demo", date: day(2, 14) },
      { sha: "f6a7b8c", message: "fix: session expirée après 5 min à cause d'un mauvais maxAge", author: "demo", date: day(2, 18) },
      { sha: "a7b8c9d", message: "chore: migration Next.js 15", author: "demo", date: day(4, 9) },
      { sha: "b8c9d0e", message: "feat: dashboard analytics v1 (MRR, churn, signups)", author: "demo", date: day(4, 13) },
      { sha: "c9d0e1f", message: "feat: export CSV des métriques", author: "demo", date: day(4, 17) },
      { sha: "d0e1f2a", message: "fix: fuseau horaire des graphiques du dashboard", author: "demo", date: day(5, 10) },
      { sha: "e1f2a3b", message: "docs: guide d'onboarding pour les premiers beta testeurs", author: "demo", date: day(6, 11) },
      { sha: "f2a3b4c", message: "feat: waitlist avec position en temps réel", author: "demo", date: day(6, 16) },
    ],
    notionTasks: [
      { title: "Interviewer 3 beta testeurs", completedAt: day(3, 12) },
      { title: "Rédiger la page de vente", completedAt: day(5, 15) },
    ],
    stripe: {
      mrrCents: 84700, // 847 €/mois
      currency: "eur",
      revenueByDay: [
        { date: day(0).slice(0, 10), amountCents: 2900 },
        { date: day(1).slice(0, 10), amountCents: 5800 },
        { date: day(3).slice(0, 10), amountCents: 2900 },
        { date: day(4).slice(0, 10), amountCents: 11600 },
        { date: day(6).slice(0, 10), amountCents: 8700 },
      ],
    },
  };
}
