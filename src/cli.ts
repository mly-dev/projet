#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { loadDotEnv, readConfig } from "./config.js";
import { fetchCommits } from "./collectors/github.js";
import { fetchCompletedTasks } from "./collectors/notion.js";
import { fetchStripeMetrics } from "./collectors/stripe.js";
import { buildProgressChart, buildRevenueChart } from "./chart.js";
import { generatePosts, explainApiError } from "./generator.js";
import { writeDrafts, findLatestDraftDir } from "./output.js";
import { readXCredentials, publishThread } from "./publishers/x.js";
import { demoActivity } from "./demo.js";
import type { Activity, GeneratedPosts, Platform } from "./types.js";

const HELP = `bip — l'assistant Build in Public automatisé

Transforme vos commits GitHub et tâches Notion en posts prêts à publier
sur X, LinkedIn et Reddit, avec un graphique de progression.

Usage :
  bip generate [options]     Collecte l'activité et rédige les brouillons
  bip publish [options]      Publie le dernier thread X généré

Options (generate) :
  --repo <owner/repo>     Dépôt GitHub à analyser (ou GITHUB_REPO dans .env)
  --days <n>              Période analysée en jours (défaut : 7)
  --platforms <liste>     x,linkedin,reddit (défaut : les trois)
  --lang <fr|en>          Langue des posts (défaut : en)
  --context <texte>       Contexte produit pour l'IA (pitch, audience…)
  --out <dossier>         Dossier de sortie (défaut : ./output)
  --demo                  Utilise des données d'exemple (aucun accès réseau GitHub/Notion)
  --skip-posts            Génère uniquement les graphiques (pas d'appel IA)
  --help                  Affiche cette aide

Options (publish) :
  --dir <dossier>         Dossier de brouillons à publier (défaut : le plus récent)
  --yes                   Confirme la publication (sans ce flag : aperçu seul)

Variables d'environnement (.env) :
  ANTHROPIC_API_KEY       Requis pour la génération des posts
  GITHUB_TOKEN            Optionnel (dépôts privés, rate limit étendue)
  GITHUB_REPO             Dépôt par défaut
  NOTION_TOKEN            Optionnel (source Notion)
  NOTION_DATABASE_ID      Base Notion des tâches
  NOTION_STATUS_PROPERTY  Propriété de statut (défaut : Status)
  NOTION_DONE_VALUE       Valeur "terminé" (défaut : Done)
  STRIPE_SECRET_KEY       Optionnel (MRR + graphique de revenus)
  X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET
                          Requis pour bip publish (developer.x.com)

Exemples :
  bip generate --demo --skip-posts
  bip generate --repo marclou/shipfast --days 7 --lang en
  bip generate --platforms x --context "SaaS d'emailing pour créateurs"
  bip publish --yes
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
      dir: { type: "string" },
      yes: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  const command = positionals[0];
  if (values.help || (command !== "generate" && command !== "publish")) {
    console.log(HELP);
    process.exit(values.help ? 0 : 1);
  }

  loadDotEnv();
  const config = readConfig();

  if (command === "publish") {
    await publishCommand(values.dir, values.out ?? "./output", values.yes ?? false);
    return;
  }

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

    if (process.env.STRIPE_SECRET_KEY) {
      console.log("→ Lecture des métriques Stripe (MRR, revenus)…");
      try {
        activity.stripe =
          (await fetchStripeMetrics(since, process.env.STRIPE_SECRET_KEY)) ?? undefined;
      } catch (error) {
        // Stripe est une source bonus : on prévient sans interrompre le flux.
        console.warn(`  ⚠ Stripe ignoré : ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  // 2. Graphiques (progression + revenus si Stripe est présent)
  console.log("→ Génération des graphiques…");
  const chartSvg = buildProgressChart(activity);
  const revenueSvg = buildRevenueChart(activity);

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
  const dir = writeDrafts(
    values.out ?? "./output",
    activity,
    posts,
    platforms,
    chartSvg,
    revenueSvg,
  );
  console.log(`\n✓ Brouillons écrits dans ${dir}`);
  if (posts) {
    console.log(`  Aperçu du hook X : "${posts.x_thread[0]?.slice(0, 100) ?? ""}…"`);
    console.log("  Pour publier le thread : bip publish --yes");
  }
  console.log("\nRelisez, ajustez, publiez. Le marketing est fait — retournez coder.");
}

/**
 * Publie le thread X du dernier dossier de brouillons (ou de --dir).
 * Sans --yes, affiche un aperçu et s'arrête — la publication est une
 * action irréversible, elle exige une confirmation explicite.
 */
async function publishCommand(
  dirArg: string | undefined,
  outDir: string,
  confirmed: boolean,
): Promise<void> {
  const dir = dirArg ?? findLatestDraftDir(outDir);
  if (!dir || !fs.existsSync(path.join(dir, "posts.json"))) {
    fail("Aucun brouillon trouvé. Lancez d'abord : bip generate");
  }

  const posts = JSON.parse(
    fs.readFileSync(path.join(dir, "posts.json"), "utf8"),
  ) as GeneratedPosts;

  console.log(`Thread X à publier (${dir}) :\n`);
  posts.x_thread.forEach((tweet, i) => {
    console.log(`  ${i + 1}/${posts.x_thread.length} ${tweet}\n`);
  });

  const tooLong = posts.x_thread.filter((t) => t.length > 280);
  if (tooLong.length > 0) {
    fail(`${tooLong.length} tweet(s) dépassent 280 caractères. Corrigez posts.json avant de publier.`);
  }

  if (!confirmed) {
    console.log("Aperçu seulement. Ajoutez --yes pour publier réellement.");
    return;
  }

  const creds = readXCredentials();
  if (!creds) {
    fail(
      "Identifiants X manquants. Définissez X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN et X_ACCESS_SECRET dans votre .env (developer.x.com, accès Read and write).",
    );
  }

  console.log("→ Publication du thread sur X…");
  const ids = await publishThread(posts.x_thread, creds);
  console.log(`\n✓ Thread publié (${ids.length} tweets).`);
  console.log(`  https://x.com/i/status/${ids[0]}`);
  console.log(
    "\nAstuce : joignez le graphique (progression.svg) au premier tweet depuis l'app X — l'upload d'images arrive dans une prochaine version.",
  );
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
