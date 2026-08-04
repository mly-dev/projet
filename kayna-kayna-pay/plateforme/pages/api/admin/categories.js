import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { auditer } from "../../../lib/audit";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;

  if (req.method === "GET") {
    const r = await query("SELECT * FROM categories ORDER BY ordre, nom");
    return res.json({ ok: true, categories: r.rows });
  }

  if (req.method === "POST") {
    const { nom } = req.body || {};
    if (!nom || !nom.trim()) return res.status(400).json({ ok: false, erreur: "Nom requis." });
    const slug = nom.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      const r = await query(
        "INSERT INTO categories (nom, slug) VALUES ($1, $2) RETURNING *",
        [nom.trim(), slug]
      );
      await auditer(user.id, "categorie.creee", "categorie", r.rows[0].id, { nom });
      return res.json({ ok: true, categorie: r.rows[0] });
    } catch (e) {
      return res.status(400).json({ ok: false, erreur: "Cette catégorie existe déjà." });
    }
  }

  if (req.method === "PUT") {
    const { id, nom, active, ordre } = req.body || {};
    if (!Number.isInteger(id)) return res.status(400).json({ ok: false, erreur: "Identifiant requis." });
    await query(
      `UPDATE categories SET
         nom = COALESCE($2, nom),
         active = COALESCE($3, active),
         ordre = COALESCE($4, ordre)
       WHERE id = $1`,
      [id, nom || null, typeof active === "boolean" ? active : null, Number.isInteger(ordre) ? ordre : null]
    );
    await auditer(user.id, "categorie.modifiee", "categorie", id, {});
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
}
