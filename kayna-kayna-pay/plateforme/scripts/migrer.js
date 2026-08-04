// Applique le schéma SQL (idempotent : CREATE ... IF NOT EXISTS).
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../lib/db");

async function principal() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Schéma appliqué.");
  await pool.end();
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
