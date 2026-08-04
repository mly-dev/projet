import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { auditer } from "../../../lib/audit";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;

  if (req.method === "GET") {
    const { q, role } = req.query;
    const conditions = ["statut != 'supprime'"];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(nom ILIKE $${params.length} OR telephone ILIKE $${params.length})`);
    }
    if (role && ["client", "partenaire", "admin", "superadmin"].includes(role)) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    const r = await query(
      `SELECT id, telephone, nom, role, statut, telephone_verifie, cree_le
       FROM users WHERE ${conditions.join(" AND ")} ORDER BY cree_le DESC LIMIT 300`,
      params
    );
    return res.json({ ok: true, utilisateurs: r.rows });
  }

  if (req.method === "PUT") {
    const { user_id, statut } = req.body || {};
    if (!Number.isInteger(user_id) || !["actif", "suspendu"].includes(statut)) {
      return res.status(400).json({ ok: false, erreur: "Paramètres invalides." });
    }
    const cible = await query("SELECT role FROM users WHERE id = $1", [user_id]);
    if (!cible.rows.length) return res.status(404).json({ ok: false, erreur: "Utilisateur introuvable." });
    if (["admin", "superadmin"].includes(cible.rows[0].role) && user.role !== "superadmin") {
      return res.status(403).json({ ok: false, erreur: "Seul le super-admin gère les comptes administrateurs." });
    }
    await query("UPDATE users SET statut = $2 WHERE id = $1", [user_id, statut]);
    await auditer(user.id, "utilisateur.statut", "user", user_id, { statut });
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
}
