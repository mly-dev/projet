import fs from "node:fs";
import path from "node:path";
import type { Activity, GeneratedPosts, Platform } from "./types.js";

/**
 * Écrit les brouillons générés (markdown + JSON + graphique SVG) dans un
 * dossier daté, ex. output/2026-07-14/. Retourne le chemin du dossier.
 */
export function writeDrafts(
  outDir: string,
  activity: Activity,
  posts: GeneratedPosts | null,
  platforms: Platform[],
  chartSvg: string | null,
  revenueSvg: string | null = null,
): string {
  const dateSlug = new Date().toISOString().slice(0, 10);
  const dir = path.join(outDir, dateSlug);
  fs.mkdirSync(dir, { recursive: true });

  if (chartSvg) {
    fs.writeFileSync(path.join(dir, "progression.svg"), chartSvg, "utf8");
  }
  if (revenueSvg) {
    fs.writeFileSync(path.join(dir, "revenus.svg"), revenueSvg, "utf8");
  }

  if (posts) {
    fs.writeFileSync(
      path.join(dir, "posts.json"),
      JSON.stringify(posts, null, 2),
      "utf8",
    );

    if (platforms.includes("x")) {
      const thread = posts.x_thread
        .map((tweet, i) => `## Tweet ${i + 1}/${posts.x_thread.length}\n\n${tweet}`)
        .join("\n\n---\n\n");
      fs.writeFileSync(
        path.join(dir, "x-thread.md"),
        `# Thread X — ${activity.projectName}\n\n${thread}\n`,
        "utf8",
      );
    }

    if (platforms.includes("linkedin")) {
      fs.writeFileSync(
        path.join(dir, "linkedin.md"),
        `# Post LinkedIn — ${activity.projectName}\n\n${posts.linkedin}\n`,
        "utf8",
      );
    }

    if (platforms.includes("reddit")) {
      fs.writeFileSync(
        path.join(dir, "reddit.md"),
        `# Post Reddit — ${activity.projectName}\n\n**Titre :** ${posts.reddit.title}\n\n${posts.reddit.body}\n`,
        "utf8",
      );
    }
  }

  return dir;
}

/**
 * Retourne le dossier de brouillons le plus récent (output/AAAA-MM-JJ),
 * ou null s'il n'y en a aucun.
 */
export function findLatestDraftDir(outDir: string): string | null {
  if (!fs.existsSync(outDir)) return null;
  const dirs = fs
    .readdirSync(outDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map((e) => e.name)
    .sort();
  const latest = dirs.at(-1);
  return latest ? path.join(outDir, latest) : null;
}
