import { query } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  const r = await query("SELECT id, nom, slug FROM categories WHERE active = TRUE ORDER BY ordre, nom");
  res.json({ ok: true, categories: r.rows });
}
