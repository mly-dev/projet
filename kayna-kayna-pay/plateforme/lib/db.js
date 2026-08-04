const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://kkp:kkp@localhost:5432/kaynakaynapay",
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
