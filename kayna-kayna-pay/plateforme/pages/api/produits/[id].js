import { query } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  const id = Number(req.query.id);
  if (!Number.isInteger(id)) return res.status(400).json({ ok: false, erreur: "Identifiant invalide." });

  const r = await query(
    `SELECT p.id, p.nom, p.description, p.prix_affiche, p.photos, p.modalites_remise,
            p.disponible, c.nom AS categorie, c.slug AS categorie_slug,
            pa.id AS partenaire_id, pa.enseigne AS partenaire
     FROM produits p
     JOIN categories c ON c.id = p.categorie_id
     JOIN partenaires pa ON pa.id = p.partenaire_id
     WHERE p.id = $1 AND p.statut_validation = 'valide'`,
    [id]
  );
  if (!r.rows.length) return res.status(404).json({ ok: false, erreur: "Produit introuvable." });
  res.json({ ok: true, produit: r.rows[0] });
}
