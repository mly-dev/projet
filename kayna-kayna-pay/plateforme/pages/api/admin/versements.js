import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";

// File de validation : versements en attente (et en vérification), en temps
// réel côté client via socket ; cette route sert le chargement initial.
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const statut = ["en_attente", "en_verification", "valide", "rejete"].includes(req.query.statut)
    ? req.query.statut
    : "en_attente";
  const r = await query(
    `SELECT v.*, a.reference AS achat_reference, a.prix_total, a.montant_verse,
            p.nom AS produit_nom, u.telephone AS client_telephone, u.nom AS client_nom
     FROM versements v
     JOIN achats a ON a.id = v.achat_id
     JOIN produits p ON p.id = a.produit_id
     JOIN users u ON u.id = v.client_id
     WHERE v.statut = $1
     ORDER BY v.depot_confirme_le ASC NULLS LAST, v.id ASC
     LIMIT 200`,
    [statut]
  );
  res.json({ ok: true, versements: r.rows });
}
