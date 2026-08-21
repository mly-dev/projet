const { Pool } = require("pg");
const { sslBase } = require("./config");

const URL = process.env.DATABASE_URL || "postgres://kkp:kkp@localhost:5432/kaynakaynapay";
const ssl = sslBase(URL);

const pool = new Pool({
  connectionString: URL,
  // `undefined` laisse pg lire le sslmode de l'URL ; toute autre valeur
  // l'emporte. Voir lib/config.js pour la règle appliquée.
  ...(ssl === undefined ? {} : { ssl }),
});

// Un certificat auto-signé est le premier obstacle d'une mise en ligne, et son
// message d'origine ne dit pas quoi faire. Celui-ci le dit.
pool.on("error", (e) => {
  if (/self.signed certificate|unable to verify the first certificate/i.test(e.message)) {
    console.error(
      "\n  ✗ La base refuse son certificat à la vérification.\n" +
        "    Certains hébergeurs (Render, Heroku) signent le leur eux-mêmes.\n" +
        "    Ajoutez alors la variable :   DATABASE_SSL=no-verify\n"
    );
  } else {
    console.error("Erreur de connexion à la base :", e.message);
  }
});

async function query(text, params) {
  return pool.query(text, params);
}

// Exécute fn dans une transaction ; rollback sur toute erreur.
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getParametre(cle, defaut) {
  const r = await query("SELECT valeur FROM parametres WHERE cle = $1", [cle]);
  return r.rows.length ? r.rows[0].valeur : defaut;
}

async function setParametre(cle, valeur) {
  await query(
    `INSERT INTO parametres (cle, valeur) VALUES ($1, $2)
     ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur`,
    [cle, JSON.stringify(valeur)]
  );
}

module.exports = { pool, query, tx, getParametre, setParametre };
