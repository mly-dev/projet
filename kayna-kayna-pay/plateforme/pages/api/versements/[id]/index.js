import { utilisateurRequis } from "../../../../lib/auth";
import { query, getParametre } from "../../../../lib/db";

// Consultation d'un versement (page d'attente : repli si le socket est coupé,
// et reprise d'un versement laissé « initié »).
//
// Le numéro de dépôt est renvoyé avec le versement : sans lui, un client qui
// revient sur un versement initié n'a plus l'information la plus importante —
// où envoyer l'argent.
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

  const versement = r.rows[0];
  const numeros = await getParametre("numeros_depot", {});
  res.json({
    ok: true,
    versement,
    instructions: {
      operateur: versement.operateur,
      numero_depot: numeros[versement.operateur] || null,
      montant: versement.montant_declare,
      reference: versement.reference,
      frais: "Les frais de dépôt mobile money sont à votre charge.",
    },
  });
}
