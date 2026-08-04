import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";

// Journal d'audit — consultable par le super-admin (cahier des charges §8).
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["superadmin"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const r = await query(
    `SELECT j.*, u.nom AS utilisateur FROM audit_journal j
     LEFT JOIN users u ON u.id = j.user_id
     ORDER BY j.id DESC LIMIT 300`
  );
  res.json({ ok: true, journal: r.rows });
}
