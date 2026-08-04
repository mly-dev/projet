import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const { statut, annulations } = req.query;
  const conditions = [];
  const params = [];
  if (statut && ["en_cours", "complete", "en_preparation", "livre", "annule", "rembourse"].includes(statut)) {
    params.push(statut);
    conditions.push(`a.statut = $${params.length}`);
  }
  if (annulations === "1") conditions.push("a.annulation_demandee = TRUE AND a.statut = 'en_cours'");

  const r = await query(
    `SELECT a.*, p.nom AS produit_nom, pa.enseigne AS partenaire,
            u.nom AS client_nom, u.telephone AS client_telephone
     FROM achats a
     JOIN produits p ON p.id = a.produit_id
     JOIN partenaires pa ON pa.id = p.partenaire_id
     JOIN users u ON u.id = a.client_id
     ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
     ORDER BY a.maj_le DESC LIMIT 300`,
    params
  );
  res.json({ ok: true, achats: r.rows });
}
