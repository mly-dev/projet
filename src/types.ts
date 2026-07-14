/** Un commit GitHub simplifié, tel que consommé par le générateur. */
export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string; // ISO 8601
}

/** Une tâche Notion terminée. */
export interface NotionTask {
  title: string;
  completedAt: string; // ISO 8601
}

/** L'activité collectée sur la période, source du storytelling. */
export interface Activity {
  repo: string;
  projectName: string;
  since: string; // ISO 8601
  until: string; // ISO 8601
  commits: Commit[];
  notionTasks: NotionTask[];
  /** Métriques Stripe (MRR, revenus) — présent si STRIPE_SECRET_KEY est configuré. */
  stripe?: import("./collectors/stripe.js").StripeMetrics;
}

/** Les posts générés par l'IA, un par plateforme. */
export interface GeneratedPosts {
  /** Thread X : chaque élément est un tweet (≤ 280 caractères). */
  x_thread: string[];
  /** Post LinkedIn : narratif, avec sauts de ligne. */
  linkedin: string;
  /** Post Reddit : titre + corps, ton authentique r/SaaS. */
  reddit: {
    title: string;
    body: string;
  };
}

export type Platform = "x" | "linkedin" | "reddit";

export interface GenerateOptions {
  platforms: Platform[];
  lang: "fr" | "en";
  /** Contexte produit optionnel fourni par l'utilisateur (pitch, audience…). */
  productContext?: string;
}
