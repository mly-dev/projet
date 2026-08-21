// Exécuteur de migrations versionnées.
//
// Chaque fichier de db/migrations/ est appliqué une seule fois, dans l'ordre de
// son numéro, à l'intérieur d'une transaction, puis enregistré dans la table
// schema_migrations. Relancer la commande sur une base à jour ne fait rien.
//
//   npm run db:migrer            applique les migrations en attente
//   npm run db:migrer -- --etat  affiche l'état sans rien appliquer
//
// Convention de nommage : NNN_description.sql (001_schema_initial.sql).
// Une migration déjà appliquée ne doit JAMAIS être modifiée : créez-en une
// nouvelle. Le contrôle d'empreinte ci-dessous le signale si cela arrive.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pool } = require("../lib/db");

const DOSSIER = path.join(__dirname, "..", "db", "migrations");

function migrationsDisponibles() {
  return fs
    .readdirSync(DOSSIER)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((fichier) => {
      const contenu = fs.readFileSync(path.join(DOSSIER, fichier), "utf8");
      return {
        fichier,
        contenu,
        empreinte: crypto.createHash("sha256").update(contenu).digest("hex").slice(0, 16),
      };
    });
}

async function assurerTableMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      fichier    TEXT PRIMARY KEY,
      empreinte  TEXT NOT NULL,
      applique_le TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
}

// Une base créée avant l'introduction des migrations contient déjà le schéma
// initial : on l'enregistre comme appliqué au lieu de le rejouer.
async function baseliner(client, migrations) {
  const dejaLa = await client.query(
    "SELECT to_regclass('public.versements') IS NOT NULL AS existe"
  );
  if (!dejaLa.rows[0].existe) return false;
  const initiale = migrations[0];
  await client.query(
    `INSERT INTO schema_migrations (fichier, empreinte) VALUES ($1, $2)
     ON CONFLICT (fichier) DO NOTHING`,
    [initiale.fichier, initiale.empreinte]
  );
  console.log(`Base existante détectée : ${initiale.fichier} marqué comme déjà appliqué.`);
  return true;
}

async function principal() {
  const etatSeulement = process.argv.includes("--etat");
  const migrations = migrationsDisponibles();
  if (!migrations.length) {
    console.log("Aucune migration dans db/migrations/.");
    return;
  }

  const client = await pool.connect();
  try {
    await assurerTableMigrations(client);

    const appliquees = new Map(
      (await client.query("SELECT fichier, empreinte FROM schema_migrations")).rows.map((r) => [
        r.fichier,
        r.empreinte,
      ])
    );

    if (appliquees.size === 0) await baseliner(client, migrations);
    const aJour = new Map(
      (await client.query("SELECT fichier, empreinte FROM schema_migrations")).rows.map((r) => [
        r.fichier,
        r.empreinte,
      ])
    );

    // Une migration appliquée dont le contenu a changé depuis est une erreur :
    // la base et le dépôt ne disent plus la même chose.
    for (const m of migrations) {
      const empreinteConnue = aJour.get(m.fichier);
      if (empreinteConnue && empreinteConnue !== m.empreinte) {
        throw new Error(
          `${m.fichier} a été modifié après avoir été appliqué. ` +
            `Créez une nouvelle migration plutôt que de modifier celle-ci.`
        );
      }
    }

    const enAttente = migrations.filter((m) => !aJour.has(m.fichier));

    if (etatSeulement) {
      console.log("Migrations :");
      for (const m of migrations) {
        console.log(`  ${aJour.has(m.fichier) ? "✓ appliquée" : "· en attente"}  ${m.fichier}`);
      }
      return;
    }

    if (!enAttente.length) {
      console.log(`Base à jour (${aJour.size} migration(s) appliquée(s)).`);
      return;
    }

    for (const m of enAttente) {
      process.stdout.write(`Application de ${m.fichier}… `);
      try {
        await client.query("BEGIN");
        await client.query(m.contenu);
        await client.query(
          "INSERT INTO schema_migrations (fichier, empreinte) VALUES ($1, $2)",
          [m.fichier, m.empreinte]
        );
        await client.query("COMMIT");
        console.log("fait.");
      } catch (e) {
        await client.query("ROLLBACK");
        throw new Error(`échec sur ${m.fichier} : ${e.message}`);
      }
    }
    console.log(`${enAttente.length} migration(s) appliquée(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

// Diagnostic : une erreur de connexion à la base est le cas le plus fréquent au
// premier démarrage. Plutôt qu'un message technique (parfois vide), on explique
// ce qui manque et on donne la commande qui répare.
function expliquer(e) {
  const url = process.env.DATABASE_URL || "postgres://kkp:kkp@localhost:5432/kaynakaynapay";
  const socle = [
    "",
    "  Base visée : " + url.replace(/:\/\/([^:]+):[^@]*@/, "://$1:****@"),
    "",
  ];

  if (e.code === "ECONNREFUSED" || /ECONNREFUSED/.test(e.message || "")) {
    return socle.concat([
      "  PostgreSQL ne répond pas. Deux causes possibles :",
      "",
      "   1. Il n'est pas installé  →  https://www.postgresql.org/download/",
      "   2. Il est installé mais arrêté :",
      "        Windows : ouvrez « Services », démarrez « postgresql-x64-… »",
      "        Linux   : sudo service postgresql start",
      "        macOS   : brew services start postgresql",
      "",
    ]);
  }

  if (e.code === "3D000") {
    return socle.concat([
      "  La base de données n'existe pas encore. Créez-la :",
      "",
      '    psql -U postgres -c "CREATE USER kkp WITH PASSWORD \'kkp\' CREATEDB;"',
      '    psql -U postgres -c "CREATE DATABASE kaynakaynapay OWNER kkp;"',
      "",
      "  (sous Linux/macOS, préfixez chaque ligne par : sudo -u postgres)",
      "",
    ]);
  }

  if (e.code === "28P01" || e.code === "28000") {
    return socle.concat([
      "  Identifiants refusés par PostgreSQL.",
      "",
      "  Soit l'utilisateur « kkp » n'existe pas :",
      '    psql -U postgres -c "CREATE USER kkp WITH PASSWORD \'kkp\' CREATEDB;"',
      "",
      "  Soit le mot de passe ne correspond pas : vérifiez DATABASE_URL dans le",
      "  fichier .env (copiez .env.example si vous ne l'avez pas encore fait).",
      "",
    ]);
  }

  if (e.code === "ENOTFOUND" || e.code === "EAI_AGAIN") {
    return socle.concat(["  L'adresse du serveur de base est introuvable. Vérifiez DATABASE_URL.", ""]);
  }

  // Les deux faces du chiffrement. Le message d'origine de pg est exact mais
  // ne dit pas quoi faire, et la réponse n'est pas la même dans les deux sens.
  if (/does not support SSL/i.test(e.message || "")) {
    return socle.concat([
      "  Cette base n'accepte pas les connexions chiffrées, alors qu'une",
      "  connexion chiffrée a été demandée.",
      "",
      "  C'est normal pour une base d'un réseau privé — pile Docker, réseau",
      "  interne d'un hébergeur. Déclarez-le :",
      "",
      "     DATABASE_SSL=off",
      "",
      "  Si en revanche cette base est joignable depuis Internet, ne le faites",
      "  pas : les identifiants circuleraient en clair. Activez plutôt TLS du",
      "  côté du serveur de base.",
      "",
    ]);
  }

  if (/self.signed certificate|unable to verify the first certificate/i.test(e.message || "")) {
    return socle.concat([
      "  La base présente un certificat que l'on ne peut pas vérifier.",
      "  Certains hébergeurs (Render, Heroku) signent le leur eux-mêmes.",
      "",
      "     DATABASE_SSL=no-verify",
      "",
    ]);
  }

  return socle.concat([
    "  Détail : " + (e.message || e.code || String(e)),
    "",
  ]);
}

principal().catch((e) => {
  console.error("\n  ✗ Migration interrompue.");
  console.error(expliquer(e).join("\n"));
  process.exit(1);
});
