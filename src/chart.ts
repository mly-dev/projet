import type { Activity } from "./types.js";
import { formatAmount } from "./collectors/stripe.js";

// Palette validée (surface claire) — images statiques destinées aux réseaux
// sociaux, donc pas de mode sombre : la couleur de fond est explicite.
const SURFACE = "#fcfcfb";
const SERIES_COMMITS = "#2a78d6"; // bleu, slot catégoriel 1
const SERIES_REVENUE = "#1baf7a"; // aqua, slot catégoriel 2 (second contexte)
const INK_PRIMARY = "#0b0b0b";
const INK_SECONDARY = "#52514e";
const INK_MUTED = "#898781";
const GRIDLINE = "#e1e0d9";
const BASELINE = "#c3c2b7";

const WIDTH = 1200;
const HEIGHT = 675; // ratio 16:9 (carte X/Twitter)
const PLOT = { top: 210, right: 80, bottom: 90, left: 80 };

/**
 * Graphique de progression : commits par jour, total en chiffre héros.
 * Conçu pour être joint tel quel à un post.
 */
export function buildProgressChart(activity: Activity): string {
  const total = activity.commits.length;
  const counts = new Map<string, number>();
  for (const c of activity.commits) {
    const key = c.date.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const tasksDone = activity.notionTasks.length;
  const subtitle2 =
    tasksDone > 0
      ? `+ ${tasksDone} tâche${tasksDone > 1 ? "s" : ""} Notion terminée${tasksDone > 1 ? "s" : ""}`
      : "";

  return renderBarChart({
    hero: `${total} commit${total > 1 ? "s" : ""}`,
    subtitle: `${activity.projectName} — ${formatPeriod(activity.since, activity.until)}`,
    subtitle2,
    days: fillDays(activity.since, activity.until, counts),
    color: SERIES_COMMITS,
    formatValue: (v) => String(v),
  });
}

/**
 * Graphique des revenus : encaissements nets par jour (Stripe), avec le
 * MRR actuel en chiffre héros. Généré uniquement si Stripe est configuré.
 */
export function buildRevenueChart(activity: Activity): string | null {
  const stripe = activity.stripe;
  if (!stripe) return null;

  const amounts = new Map<string, number>();
  for (const d of stripe.revenueByDay) {
    amounts.set(d.date, d.amountCents);
  }
  const totalCents = stripe.revenueByDay.reduce((s, d) => s + d.amountCents, 0);

  return renderBarChart({
    hero: `MRR ${formatAmount(stripe.mrrCents, stripe.currency)}`,
    subtitle: `${activity.projectName} — ${formatPeriod(activity.since, activity.until)}`,
    subtitle2: `${formatAmount(totalCents, stripe.currency)} encaissés sur la période`,
    days: fillDays(activity.since, activity.until, amounts),
    color: SERIES_REVENUE,
    formatValue: (v) => formatAmount(v, stripe.currency),
  });
}

interface DayBucket {
  label: string;
  value: number;
}

interface BarChartSpec {
  hero: string;
  subtitle: string;
  subtitle2: string;
  days: DayBucket[];
  color: string;
  formatValue: (v: number) => string;
}

function renderBarChart(spec: BarChartSpec): string {
  const { days } = spec;
  const maxValue = Math.max(...days.map((d) => d.value), 1);

  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const slot = plotWidth / days.length;
  const barWidth = Math.max(Math.min(slot - 2, 72), 1); // barres fines, 2px d'écart
  const baselineY = PLOT.top + plotHeight;

  // Étiquettes de jours : au plus ~14 pour éviter les collisions sur les
  // longues périodes (une sur N sinon).
  const labelEvery = Math.ceil(days.length / 14);

  // Lignes de grille horizontales (pas "rond", max 4 lignes au-dessus de 0)
  const step = niceStep(maxValue);
  const gridValues: number[] = [];
  for (let v = step; v <= maxValue; v += step) gridValues.push(v);

  const grid = gridValues
    .map((v) => {
      const y = baselineY - (v / maxValue) * plotHeight;
      return (
        `<line x1="${PLOT.left}" y1="${y}" x2="${WIDTH - PLOT.right}" y2="${y}" stroke="${GRIDLINE}" stroke-width="1"/>` +
        `<text x="${PLOT.left - 12}" y="${y + 4}" text-anchor="end" fill="${INK_MUTED}" font-size="18">${escapeXml(spec.formatValue(v))}</text>`
      );
    })
    .join("\n  ");

  const maxIndex = days.reduce((mi, d, i) => (d.value > days[mi].value ? i : mi), 0);

  const bars = days
    .map((d, i) => {
      const x = PLOT.left + i * slot + (slot - barWidth) / 2;
      const h = (d.value / maxValue) * plotHeight;
      const y = baselineY - h;
      const label =
        i % labelEvery === 0
          ? `<text x="${x + barWidth / 2}" y="${baselineY + 32}" text-anchor="middle" fill="${INK_MUTED}" font-size="18">${escapeXml(d.label)}</text>`
          : "";
      if (d.value <= 0) return label;
      // Barre à sommet arrondi, ancrée à la ligne de base
      const r = Math.min(4, h, barWidth / 2);
      const bar = `<path d="M ${x} ${baselineY} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + barWidth - r} Q ${x + barWidth} ${y} ${x + barWidth} ${y + r} V ${baselineY} Z" fill="${spec.color}"/>`;
      // Étiquette directe sélective : uniquement la valeur maximale
      const valueLabel =
        i === maxIndex
          ? `<text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" fill="${INK_SECONDARY}" font-size="20" font-weight="600">${escapeXml(spec.formatValue(d.value))}</text>`
          : "";
      return bar + valueLabel + label;
    })
    .join("\n  ");

  const subtitle2Line = spec.subtitle2
    ? `<text x="${PLOT.left}" y="168" fill="${INK_SECONDARY}" font-size="24">${escapeXml(spec.subtitle2)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${SURFACE}"/>
  <text x="${PLOT.left}" y="76" fill="${INK_PRIMARY}" font-size="64" font-weight="700">${escapeXml(spec.hero)}</text>
  <text x="${PLOT.left}" y="126" fill="${INK_SECONDARY}" font-size="26">${escapeXml(spec.subtitle)}</text>
  ${subtitle2Line}
  ${grid}
  <line x1="${PLOT.left}" y1="${baselineY}" x2="${WIDTH - PLOT.right}" y2="${baselineY}" stroke="${BASELINE}" stroke-width="1"/>
  ${bars}
  <text x="${WIDTH - PLOT.right}" y="${HEIGHT - 24}" text-anchor="end" fill="${INK_MUTED}" font-size="16">#buildinpublic</text>
</svg>
`;
}

/** Construit un seau par jour de la période, valeurs manquantes à 0. */
function fillDays(
  sinceIso: string,
  untilIso: string,
  values: Map<string, number>,
): DayBucket[] {
  const until = new Date(untilIso);
  const buckets: DayBucket[] = [];

  const cursor = new Date(sinceIso);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= until) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.push({
      label: cursor.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      value: values.get(key) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return buckets;
}

function niceStep(max: number): number {
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  for (const m of [1, 2, 5, 10]) {
    if (raw <= m * magnitude) return m * magnitude;
  }
  return 10 * magnitude;
}

function formatPeriod(sinceIso: string, untilIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  return `du ${fmt(sinceIso)} au ${fmt(untilIso)}`;
}

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
