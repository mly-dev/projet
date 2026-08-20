// Vérifie que tout est en place avant de démarrer : Node, fichier .env,
// PostgreSQL joignable, base créée, migrations appliquées, données de démo.
//
//   npm run verifier
//
// Chaque point manquant est accompagné de la commande qui le répare.
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const WIN = process.platform === "win32";
const OK = "  [OK]   ";
const KO = "  [MANQUE] ";
let problemes = 0;

function ok(texte) {
  console.log(OK + texte);
}
function ko(texte, reparation) {
  problemes += 1;
  console.log(KO + texte);
  for (const l of reparation) console.log("           " + l);
  console.log("");
}

async function principal() {
  console.log("");
  console.log("  Vérification de l'installation — Kayna Kayna Pay");
  console.log("  " + "-".repeat(52));
  console.log("");

  // ── 1. Node ────────────────────────────────────────────────────────────────
  const majeure = Number(process.versions.node.split(".")[0]);
  if (majeure >= 18) {
    ok(`Node ${process.versions.node}`);
  } else {
    ko(`Node ${process.versions.node} — version 18 minimum requise`, [
      "Installez une version récente : https://nodejs.org (choisissez « LTS »)",
    ]);
  }

  // ── 2. Dépendances installées ──────────────────────────────────────────────
  if (fs.existsSync(path.join(__dirname, "..", "node_modules", "pg"))) {
    ok("Dépendances installées");
  } else {
    ko("Dépendances non installées", ["Lancez :  npm install"]);
  }

  // ── 3. Fichier .env ────────────────────────────────────────────────────────
  const cheminEnv = path.join(__dirname, "..", ".env");
  if (fs.existsSync(cheminEnv)) {
    ok("Fichier .env présent");
  } else {
    ko("Fichier .env absent", [
      WIN ? "Lancez :  copy .env.example .env" : "Lancez :  cp .env.example .env",
    ]);
  }

  // ── 4. PostgreSQL joignable + base + migrations ────────────────────────────
  const url =
    process.env.DATABASE_URL || "postgres://kkp:kkp@localhost:5432/kaynakaynapay";
  const masquee = url.replace(/:\/\/([^:]+):[^@]*@/, "://$1:****@");

  let pool;
  try {
    ({ pool } = require("../lib/db"));
  } catch (e) {
    ko("Impossible de charger le module de base de données", ["Lancez :  npm install"]);
    return terminer();
  }

  try {
    await pool.query("SELECT 1");
    ok(`PostgreSQL joignable  (${masquee})`);
  } catch (e) {
    if (e.code === "ECONNREFUSED" || /ECONNREFUSED/.test(e.message || "")) {
      ko("PostgreSQL ne répond pas", [
        "Soit il n'est pas installé :  https://www.postgresql.org/download/",
        "  (Windows : choisissez la version 17, colonne « Windows x86-64 »)",
        "Soit il est arrêté :",
        WIN
          ? "  touche Windows → « Services » → démarrez « postgresql-x64-17 »"
          : "  sudo service postgresql start",
      ]);
    } else if (e.code === "3D000") {
      ko("La base de données n'existe pas", [
        "Créez-la (le mot de passe demandé est celui de l'installation) :",
        WIN
          ? '  psql -U postgres -c "CREATE USER kkp WITH PASSWORD \'kkp\' CREATEDB;"'
          : '  sudo -u postgres psql -c "CREATE USER kkp WITH PASSWORD \'kkp\' CREATEDB;"',
        WIN
          ? '  psql -U postgres -c "CREATE DATABASE kaynakaynapay OWNER kkp;"'
          : '  sudo -u postgres psql -c "CREATE DATABASE kaynakaynapay OWNER kkp;"',
      ]);
    } else if (e.code === "28P01" || e.code === "28000") {
      ko("Identifiants refusés par PostgreSQL", [
        "L'utilisateur « kkp » n'existe pas, ou le mot de passe diffère.",
        WIN
          ? '  psql -U postgres -c "CREATE USER kkp WITH PASSWORD \'kkp\' CREATEDB;"'
          : '  sudo -u postgres psql -c "CREATE USER kkp WITH PASSWORD \'kkp\' CREATEDB;"',
        "Vérifiez aussi DATABASE_URL dans le fichier .env",
      ]);
    } else {
      ko("Connexion à la base impossible", ["Détail : " + (e.message || e.code)]);
    }
    return terminer();
  }

  // ── 5. Migrations ──────────────────────────────────────────────────────────
  try {
    const r = await pool.query("SELECT COUNT(*)::int AS n FROM schema_migrations");
    const attendues = fs
      .readdirSync(path.join(__dirname, "..", "db", "migrations"))
      .filter((f) => f.endsWith(".sql")).length;
    if (r.rows[0].n >= attendues) {
      ok(`Migrations appliquées  (${r.rows[0].n}/${attendues})`);
    } else {
      ko(`Migrations incomplètes  (${r.rows[0].n}/${attendues})`, [
        "Lancez :  npm run db:migrer",
      ]);
    }
  } catch (e) {
    ko("Structure de la base absente", ["Lancez :  npm run db:migrer"]);
    return terminer();
  }

  // ── 6. Données de démonstration ────────────────────────────────────────────
  try {
    const r = await pool.query("SELECT COUNT(*)::int AS n FROM produits");
    if (r.rows[0].n > 0) {
      ok(`Données de démonstration présentes  (${r.rows[0].n} produits)`);
    } else {
      ko("Aucune donnée de démonstration", ["Lancez :  npm run db:seed"]);
    }
  } catch (e) {
    ko("Impossible de lire le catalogue", ["Lancez :  npm run db:migrer && npm run db:seed"]);
  }

  // ── 7. Code source réellement versionné ────────────────────────────────────
  //
  // Une règle de .gitignore trop large peut exclure du dépôt un fichier de
  // code : il fonctionne alors chez celui qui l'a écrit, et manque partout
  // ailleurs. C'est arrivé à pages/api/medias/, exclu par une règle
  // « medias/ » destinée aux photos envoyées — le catalogue renvoyait 404 sur
  // chaque image, sans que rien ne l'explique.
  try {
    const { execSync } = require("child_process");
    const ignores = execSync(
      'git ls-files --others --ignored --exclude-standard -- pages lib composants client scripts styles db',
      { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    )
      .split("\n")
      .filter((f) => f && !f.includes("node_modules/"));

    if (ignores.length === 0) {
      ok("Tout le code source est versionné");
    } else {
      ko(`${ignores.length} fichier(s) de code exclus du dépôt par .gitignore`, [
        ...ignores.slice(0, 5).map((f) => `  ${f}`),
        ignores.length > 5 ? `  … et ${ignores.length - 5} autre(s)` : null,
        "Ces fichiers manqueront sur toute autre machine.",
        "Corrigez la règle en cause dans .gitignore — une règle sans barre",
        "oblique initiale vise tous les dossiers de ce nom, à toute profondeur.",
      ].filter(Boolean));
    }
  } catch (e) {
    // Hors dépôt git, ou git absent : ce contrôle ne s'applique pas.
  }

  // ── 8. Secret de production ────────────────────────────────────────────────
  if (process.env.NODE_ENV === "production" &&
      (!process.env.JWT_SECRET || /changez-moi/.test(process.env.JWT_SECRET))) {
    ko("JWT_SECRET non personnalisé alors que NODE_ENV=production", [
      "Définissez un secret long et unique dans le fichier .env",
    ]);
  }

  terminer();
}

function terminer() {
  console.log("  " + "-".repeat(52));
  if (problemes === 0) {
    console.log("  Tout est prêt. Démarrez avec :  npm run dev");
    console.log("");
    process.exit(0);
  } else {
    console.log(`  ${problemes} point(s) à régler — voir ci-dessus.`);
    console.log("");
    process.exit(1);
  }
}

principal().catch((e) => {
  console.error("\n  Vérification interrompue :", e.message, "\n");
  process.exit(1);
});
