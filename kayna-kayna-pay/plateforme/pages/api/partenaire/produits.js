import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";

// Espace partenaire réduit (MVP) : consultation du catalogue de l'enseigne,
// avec progression agrégée des achats en cours par produit.
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["partenaire"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const rp = await query("SELECT id FROM partenaires WHERE user_id = $1", [user.id]);
  if (!rp.rows.length) return res.status(404).json({ ok: false, erreur: "Profil partenaire introuvable." });

  const r = await query(
    `SELECT p.id, p.nom, p.prix_partenaire, p.prix_affiche, p.disponible, c.nom AS categorie,
            (SELECT COUNT(*)::int FROM achats a WHERE a.produit_id = p.id AND a.statut = 'en_cours') AS achats_en_cours,
            (SELECT COUNT(*)::int FROM achats a WHERE a.produit_id = p.id AND a.statut IN ('complete', 'en_preparation', 'livre')) AS commandes
     FROM produits p JOIN categories c ON c.id = p.categorie_id
     WHERE p.partenaire_id = $1
     ORDER BY p.cree_le DESC`,
    [rp.rows[0].id]
  );
  res.json({ ok: true, produits: r.rows });
}
