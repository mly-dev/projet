import { utilisateurRequis } from "../../../../lib/auth";
import { query } from "../../../../lib/db";

// Consultation d'un versement (page d'attente : repli si le socket est coupé).
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["client"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const r = await query(
    `SELECT id, reference, achat_id, operateur, montant_declare, montant_valide,
            statut, motif_rejet, initie_le, depot_confirme_le, statut_maj_le
     FROM versements WHERE id = $1 AND client_id = $2`,
    [Number(req.query.id), user.id]
  );
  if (!r.rows.length) return res.status(404).json({ ok: false, erreur: "Versement introuvable." });
  res.json({ ok: true, versement: r.rows[0] });
}
