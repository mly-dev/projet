// Contrôle des règles de configuration.
//
//   npm run verifier:config
//
// Ces règles décident si le serveur démarre et s'il chiffre sa connexion à la
// base. Elles ne se voient pas à l'usage : une erreur s'y découvre au
// déploiement, c'est-à-dire au plus mauvais moment.
//
// Deux cas de ce fichier viennent d'une panne réelle. La première version de
// estLocale() énumérait des noms d'hôtes — localhost, postgres, db — au lieu de
// raisonner sur ce que l'adresse dit d'elle-même. Elle a donc jugé distante la
// base de sa propre pile d'essai, dont le service s'appelle « base », exigé TLS
// d'un serveur qui n'en propose pas, et arrêté la migration sur « The server
// does not support SSL connections ». Railway, dont l'adresse interne est
// « postgres.railway.internal », aurait échoué pareil — mais en ligne.
process.env.NODE_ENV = "production";

const { execFileSync } = require("child_process");
const path = require("path");
const config = require("../lib/config");

let echecs = 0;

function critere(intitule, obtenu, attendu) {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (!bon) echecs++;
  console.log(`  ${bon ? "[OK]  " : "[FAUX]"} ${intitule}`);
  if (!bon) {
    console.log(`         attendu : ${JSON.stringify(attendu)}`);
    console.log(`         obtenu  : ${JSON.stringify(obtenu)}`);
  }
}

// ── Où passe la connexion à la base ─────────────────────────────────────────
console.log("\n  Adresses jugées locales (aucun réseau public traversé)");
console.log("  " + "-".repeat(68));

const LOCALES = [
  ["pile Docker de ce dépôt", "postgres://kkp:kkp@base:5432/kaynakaynapay"],
  ["réseau interne Railway", "postgresql://postgres:x@postgres.railway.internal:5432/railway"],
  ["réseau interne Fly.io", "postgres://u:p@kkp-db.flycast:5432/db"],
  ["poste de développement", "postgres://kkp:kkp@localhost:5432/kaynakaynapay"],
  ["boucle locale", "postgres://kkp:kkp@127.0.0.1:5433/kaynakaynapay"],
  ["conteneur voisin", "postgres://u:p@db:5432/x"],
  ["hôte depuis un conteneur", "postgres://u:p@host.docker.internal:5432/x"],
  ["réseau privé 10.x", "postgres://u:p@10.0.0.5:5432/db"],
  ["réseau privé 192.168.x", "postgres://u:p@192.168.1.50:5432/db"],
  ["réseau privé 172.16-31.x", "postgres://u:p@172.17.0.2:5432/db"],
];
for (const [quoi, url] of LOCALES) critere(quoi, config.estLocale(url), true);

console.log("\n  Adresses jugées distantes (chiffrement exigé)");
console.log("  " + "-".repeat(68));

const DISTANTES = [
  ["Neon", "postgres://u:p@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require"],
  ["Render", "postgres://u:p@dpg-x.frankfurt-postgres.render.com/db"],
  ["adresse publique", "postgres://u:p@8.8.8.8:5432/db"],
  ["juste avant la plage privée", "postgres://u:p@172.15.0.2:5432/db"],
  ["juste après la plage privée", "postgres://u:p@172.32.0.2:5432/db"],
  ["domaine ordinaire", "postgres://u:p@base.kaynakaynapay.ne:5432/db"],
];
for (const [quoi, url] of DISTANTES) critere(quoi, config.estLocale(url), false);

// ── Ce qui en découle ───────────────────────────────────────────────────────
console.log("\n  Chiffrement retenu");
console.log("  " + "-".repeat(68));

delete process.env.DATABASE_SSL;
critere("locale → aucun chiffrement", config.sslBase("postgres://kkp:kkp@base:5432/x"), false);
critere("distante → chiffrée et vérifiée",
  config.sslBase("postgres://u:p@h.render.com/db"), { rejectUnauthorized: true });
critere("sslmode dans l'URL → c'est l'URL qui décide",
  config.sslBase("postgres://u:p@h.neon.tech/db?sslmode=require"), undefined);

process.env.DATABASE_SSL = "no-verify";
critere("DATABASE_SSL=no-verify → chiffrée, certificat non vérifié",
  config.sslBase("postgres://u:p@h.render.com/db"), { rejectUnauthorized: false });

process.env.DATABASE_SSL = "off";
critere("DATABASE_SSL=off → aucun chiffrement, même distante",
  config.sslBase("postgres://u:p@h.render.com/db"), false);

process.env.DATABASE_SSL = "require";
critere("DATABASE_SSL=require → chiffrée, même en local",
  config.sslBase("postgres://kkp:kkp@base:5432/x"), { rejectUnauthorized: true });
delete process.env.DATABASE_SSL;

// ── Ce qui empêche de démarrer ──────────────────────────────────────────────
console.log("\n  Refus de démarrage en production");
console.log("  " + "-".repeat(68));

function erreursAvec(env) {
  const sauvegarde = { ...process.env };
  Object.assign(process.env, env);
  const r = config.controler();
  for (const cle of Object.keys(env)) delete process.env[cle];
  Object.assign(process.env, sauvegarde);
  return r.erreurs.length;
}

const BON = "x".repeat(48);
critere("secret d'exemple refusé",
  erreursAvec({ JWT_SECRET: "changez-moi-en-production", DATABASE_URL: "postgres://u:p@base/x" }) > 0, true);
critere("secret trop court refusé",
  erreursAvec({ JWT_SECRET: "trop-court", DATABASE_URL: "postgres://u:p@base/x" }) > 0, true);
critere("secret absent refusé",
  erreursAvec({ JWT_SECRET: "", DATABASE_URL: "postgres://u:p@base/x" }) > 0, true);
critere("base absente refusée",
  erreursAvec({ JWT_SECRET: BON, DATABASE_URL: "" }) > 0, true);
critere("configuration correcte acceptée",
  erreursAvec({ JWT_SECRET: BON, DATABASE_URL: "postgres://u:p@base/x" }), 0);

// ── Et le développement doit rester sans friction ───────────────────────────
// Dans un processus séparé : NODE_ENV est lu au chargement du module.
console.log("\n  Hors production, les mêmes défauts n'arrêtent rien");
console.log("  " + "-".repeat(68));

const sonde = `
  const c = require(${JSON.stringify(path.join(__dirname, "..", "lib", "config.js"))});
  process.stdout.write(String(c.controler().erreurs.length));
`;
const horsProduction = execFileSync(process.execPath, ["-e", sonde], {
  env: { PATH: process.env.PATH, JWT_SECRET: "", DATABASE_URL: "" },
  encoding: "utf8",
});
critere("aucun refus de démarrage sans NODE_ENV=production", horsProduction, "0");

console.log("\n  " + "-".repeat(68));
if (echecs === 0) {
  console.log("  Toutes les règles de configuration sont respectées.\n");
  process.exit(0);
}
console.log(`  ${echecs} règle(s) en échec.\n`);
process.exit(1);
