import { query } from "../../lib/db";

// Catalogue public : recherche par mot-clé et filtres (catégorie, fourchette
// de prix, partenaire, mis en avant). Consultable sans compte (visiteur).
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const { q, categorie, prix_min, prix_max, partenaire, mis_en_avant, limite } = req.query;
  const conditions = ["p.disponible = TRUE", "p.statut_validation = 'valide'", "pa.statut = 'actif'"];
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(p.nom ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }
  if (categorie) {
    params.push(categorie);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (prix_min && /^\d+$/.test(prix_min)) {
    params.push(Number(prix_min));
    conditions.push(`p.prix_affiche >= $${params.length}`);
  }
  if (prix_max && /^\d+$/.test(prix_max)) {
    params.push(Number(prix_max));
    conditions.push(`p.prix_affiche <= $${params.length}`);
  }
  if (partenaire && /^\d+$/.test(partenaire)) {
    params.push(Number(partenaire));
    conditions.push(`pa.id = $${params.length}`);
  }
  if (mis_en_avant === "1") conditions.push("p.mis_en_avant = TRUE");

  params.push(Math.min(Number(limite) || 50, 100));
  const r = await query(
    `SELECT p.id, p.nom, p.description, p.prix_affiche, p.photos, p.mis_en_avant,
            p.modalites_remise, c.nom AS categorie, c.slug AS categorie_slug,
            pa.id AS partenaire_id, pa.enseigne AS partenaire
     FROM produits p
     JOIN categories c ON c.id = p.categorie_id
     JOIN partenaires pa ON pa.id = p.partenaire_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.mis_en_avant DESC, p.cree_le DESC
     LIMIT $${params.length}`,
    params
  );
  res.json({ ok: true, produits: r.rows });
}
