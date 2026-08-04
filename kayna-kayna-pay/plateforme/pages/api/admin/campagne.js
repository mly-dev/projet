import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { notifier } from "../../../lib/notifications";
import { auditer } from "../../../lib/audit";

// Campagnes d'incitation au versement : notification à tous les clients
// actifs (ou aux seuls clients ayant un achat en cours).
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const { titre, corps, cible } = req.body || {};
  if (!titre || !corps) return res.status(400).json({ ok: false, erreur: "Titre et corps requis." });

  const cibleAchatsEnCours = cible === "achats_en_cours";
  const r = await query(
    cibleAchatsEnCours
      ? `SELECT DISTINCT u.id FROM users u JOIN achats a ON a.client_id = u.id
         WHERE u.role = 'client' AND u.statut = 'actif' AND a.statut = 'en_cours'`
      : `SELECT id FROM users WHERE role = 'client' AND statut = 'actif'`
  );
  for (const ligne of r.rows) {
    await notifier(ligne.id, "campagne", titre, corps, {});
  }
  await auditer(user.id, "campagne.envoyee", "notification", null, { titre, cible: cible || "tous", destinataires: r.rows.length });
  res.json({ ok: true, destinataires: r.rows.length });
}
