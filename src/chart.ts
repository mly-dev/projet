import type { Activity } from "./types.js";

// Palette validée (surface claire) — image statique destinée aux réseaux
// sociaux, donc pas de mode sombre : la couleur de fond est explicite.
const SURFACE = "#fcfcfb";
const SERIES = "#2a78d6"; // bleu, slot catégoriel 1
const INK_PRIMARY = "#0b0b0b";
const INK_SECONDARY = "#52514e";
const INK_MUTED = "#898781";
const GRIDLINE = "#e1e0d9";
const BASELINE = "#c3c2b7";

const WIDTH = 1200;
const HEIGHT = 675; // ratio 16:9 (carte X/Twitter)
const PLOT = { top: 210, right: 80, bottom: 90, left: 80 };

/**
 * Génère un graphique SVG de progression : commits par jour sur la période,
 * avec le total en chiffre héros. Conçu pour être joint tel quel à un post.
 */
export function buildProgressChart(activity: Activity): string {
  const days = groupByDay(activity);
  const total = activity.commits.length;
  const tasksDone = activity.notionTasks.length;
  const maxCount = Math.max(...days.map((d) => d.count), 1);

  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const slot = plotWidth / days.length;
  const barWidth = Math.min(slot - 2, 72); // barres fines, 2px d'écart minimum
  const baselineY = PLOT.top + plotHeight;

  // Lignes de grille horizontales (pas entier, max 4 lignes au-dessus de 0)
  const step = niceStep(maxCount);
  const gridValues: number[] = [];
  for (let v = step; v <= maxCount; v += step) gridValues.push(v);

  const grid = gridValues
    .map((v) => {
      const y = baselineY - (v / maxCount) * plotHeight;
      return (
        `<line x1="${PLOT.left}" y1="${y}" x2="${WIDTH - PLOT.right}" y2="${y}" stroke="${GRIDLINE}" stroke-width="1"/>` +
        `<text x="${PLOT.left - 12}" y="${y + 4}" text-anchor="end" fill="${INK_MUTED}" font-size="18">${v}</text>`
      );
    })
    .join("\n  ");

  const maxIndex = days.reduce((mi, d, i) => (d.count > days[mi].count ? i : mi), 0);

  const bars = days
    .map((d, i) => {
      const x = PLOT.left + i * slot + (slot - barWidth) / 2;
      const h = (d.count / maxCount) * plotHeight;
      const y = baselineY - h;
      const label = `<text x="${x + barWidth / 2}" y="${baselineY + 32}" text-anchor="middle" fill="${INK_MUTED}" font-size="18">${d.label}</text>`;
      if (d.count === 0) return label;
      // Barre à sommet arrondi (4px), ancrée à la ligne de base
      const r = Math.min(4, h);
      const bar = `<path d="M ${x} ${baselineY} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + barWidth - r} Q ${x + barWidth} ${y} ${x + barWidth} ${y + r} V ${baselineY} Z" fill="${SERIES}"/>`;
      // Étiquette directe sélective : uniquement la valeur maximale
      const valueLabel =
        i === maxIndex
          ? `<text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" fill="${INK_SECONDARY}" font-size="20" font-weight="600">${d.count}</text>`
          : "";
      return bar + valueLabel + label;
    })
    .join("\n  ");

  const periodLabel = formatPeriod(activity.since, activity.until);
  const tasksLine =
    tasksDone > 0
      ? `<text x="${PLOT.left}" y="168" fill="${INK_SECONDARY}" font-size="24">+ ${tasksDone} tâche${tasksDone > 1 ? "s" : ""} Notion terminée${tasksDone > 1 ? "s" : ""}</text>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${SURFACE}"/>
  <text x="${PLOT.left}" y="76" fill="${INK_PRIMARY}" font-size="64" font-weight="700">${escapeXml(String(total))} commit${total > 1 ? "s" : ""}</text>
  <text x="${PLOT.left}" y="126" fill="${INK_SECONDARY}" font-size="26">${escapeXml(activity.projectName)} — ${escapeXml(periodLabel)}</text>
  ${tasksLine}
  ${grid}
  <line x1="${PLOT.left}" y1="${baselineY}" x2="${WIDTH - PLOT.right}" y2="${baselineY}" stroke="${BASELINE}" stroke-width="1"/>
  ${bars}
  <text x="${WIDTH - PLOT.right}" y="${HEIGHT - 24}" text-anchor="end" fill="${INK_MUTED}" font-size="16">#buildinpublic</text>
</svg>
`;
}

interface DayBucket {
  label: string;
  count: number;
}

function groupByDay(activity: Activity): DayBucket[] {
  const since = new Date(activity.since);
  const until = new Date(activity.until);
  const buckets: DayBucket[] = [];
  const counts = new Map<string, number>();

  for (const c of activity.commits) {
    const key = c.date.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const cursor = new Date(since);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= until) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.push({
      label: cursor.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      count: counts.get(key) ?? 0,
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
