#!/usr/bin/env node
import { parseArgs } from "node:util";
import { loadDotEnv, readConfig } from "./config.js";
import { fetchCommits } from "./collectors/github.js";
import { fetchCompletedTasks } from "./collectors/notion.js";
import { buildProgressChart } from "./chart.js";
import { generatePosts, explainApiError } from "./generator.js";
import { writeDrafts } from "./output.js";
import { demoActivity } from "./demo.js";
import type { Activity, Platform } from "./types.js";

const HELP = `bip — l'assistant Build in Public automatisé

Transforme vos commits GitHub et tâches Notion en posts prêts à publier
sur X, LinkedIn et Reddit, avec un graphique de progression.

Usage :
  bip generate [options]

Options :
  --repo <owner/repo>     Dépôt GitHub à analyser (ou GITHUB_REPO dans .env)
  --days <n>              Période analysée en jours (défaut : 7)
  --platforms <liste>     x,linkedin,reddit (défaut : les trois)
  --lang <fr|en>          Langue des posts (défaut : en)
  --context <texte>       Contexte produit pour l'IA (pitch, audience…)
  --out <dossier>         Dossier de sortie (défaut : ./output)
  --demo                  Utilise des données d'exemple (aucun accès réseau GitHub/Notion)
  --skip-posts            Génère uniquement le graphique (pas d'appel IA)
  --help                  Affiche cette aide

Variables d'environnement (.env) :
  ANTHROPIC_API_KEY       Requis pour la génération des posts
  GITHUB_TOKEN            Optionnel (dépôts privés, rate limit étendue)
  GITHUB_REPO             Dépôt par défaut
  NOTION_TOKEN            Optionnel (source Notion)
  NOTION_DATABASE_ID      Base Notion des tâches
  NOTION_STATUS_PROPERTY  Propriété de statut (défaut : Status)
  NOTION_DONE_VALUE       Valeur "terminé" (défaut : Done)

Exemples :
  bip generate --demo --skip-posts
  bip generate --repo marclou/shipfast --days 7 --lang en
  bip generate --platforms x --context "SaaS d'emailing pour créateurs"
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      repo: { type: "string" },
      days: { type: "string", default: "7" },
      platforms: { type: "string", default: "x,linkedin,reddit" },
      lang: { type: "string", default: "en" },
      context: { type: "string" },
      out: { type: "string", default: "./output" },
      demo: { type: "boolean", default: false },
      "skip-posts": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help || positionals[0] !== "generate") {
    console.log(HELP);
    process.exit(values.help ? 0 : 1);
  }

  loadDotEnv();
  const config = readConfig();

  const days = Math.max(1, Number.parseInt(values.days ?? "7", 10) || 7);
  const lang = values.lang === "fr" ? "fr" : "en";
  const platforms = parsePlatforms(values.platforms ?? "");
  const skipPosts = values["skip-posts"] ?? false;

  // 1. Collecte de l'activité
  let activity: Activity;
  if (values.demo) {
    console.log("→ Mode démo : données d'exemple");
    activity = demoActivity(days);
  } else {
    const repo = values.repo ?? config.githubRepo;
    if (!repo) {
      fail("Aucun dépôt spécifié. Utilisez --repo owner/repo ou GITHUB_REPO dans .env.");
    }
    const until = new Date();
    const since = new Date(until);
    since.setUTCDate(since.getUTCDate() - (days - 1));
    since.setUTCHours(0, 0, 0, 0);

    console.log(`→ Lecture des commits de ${repo} (${days} derniers jours)…`);
    const commits = await fetchCommits(repo, since, config.githubToken);
    console.log(`  ${commits.length} commit(s) trouvé(s)`);

    let notionTasks: Awaited<ReturnType<typeof fetchCompletedTasks>> = [];
    if (config.notionToken && config.notionDatabaseId) {
      console.log("→ Lecture des tâches Notion terminées…");
      notionTasks = await fetchCompletedTasks(since, {
        token: config.notionToken,
        databaseId: config.notionDatabaseId,
        statusProperty: config.notionStatusProperty,
        doneValue: config.notionDoneValue,
      });
      console.log(`  ${notionTasks.length} tâche(s) terminée(s)`);
    }

    if (commits.length === 0 && notionTasks.length === 0) {
      fail("Aucune activité trouvée sur la période. Rien à raconter aujourd'hui !");
    }

    activity = {
      repo,
      projectName: repo.split("/")[1] ?? repo,
      since: since.toISOString(),
      until: until.toISOString(),
      commits,
      notionTasks,
    };
  }

  // 2. Graphique de progression
  console.log("→ Génération du graphique de progression…");
  const chartSvg = buildProgressChart(activity);

  // 3. Storytelling par l'IA
  let posts = null;
  if (!skipPosts) {
    console.log("→ Rédaction des posts par Claude…");
    try {
      posts = await generatePosts(activity, {
        platforms,
        lang,
        productContext: values.context,
      });
    } catch (error) {
      fail(explainApiError(error));
    }
  }

  // 4. Écriture des brouillons
  const dir = writeDrafts(values.out ?? "./output", activity, posts, platforms, chartSvg);
  console.log(`\n✓ Brouillons écrits dans ${dir}`);
  if (posts) {
    console.log(`  Aperçu du hook X : "${posts.x_thread[0]?.slice(0, 100) ?? ""}…"`);
  }
  console.log("\nRelisez, ajustez, publiez. Le marketing est fait — retournez coder.");
}

function parsePlatforms(raw: string): Platform[] {
  const valid: Platform[] = ["x", "linkedin", "reddit"];
  const parsed = raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is Platform => (valid as string[]).includes(p));
  return parsed.length > 0 ? parsed : valid;
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(`✗ Erreur inattendue : ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
