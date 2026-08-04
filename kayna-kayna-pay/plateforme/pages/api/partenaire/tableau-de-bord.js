import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["partenaire"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const rp = await query("SELECT id, enseigne FROM partenaires WHERE user_id = $1", [user.id]);
  if (!rp.rows.length) return res.status(404).json({ ok: false, erreur: "Profil partenaire introuvable." });
  const partenaire = rp.rows[0];

  const [enCours, aPreparer, historiques] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS n,
              COALESCE(SUM(a.montant_verse), 0)::bigint AS verse,
              COALESCE(SUM(a.prix_total), 0)::bigint AS total
       FROM achats a JOIN produits p ON p.id = a.produit_id
       WHERE p.partenaire_id = $1 AND a.statut = 'en_cours'`,
      [partenaire.id]
    ),
    query(
      `SELECT COUNT(*)::int AS n FROM achats a JOIN produits p ON p.id = a.produit_id
       WHERE p.partenaire_id = $1 AND a.statut IN ('complete', 'en_preparation')`,
      [partenaire.id]
    ),
    query(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(p.prix_partenaire), 0)::bigint AS chiffre
       FROM achats a JOIN produits p ON p.id = a.produit_id
       WHERE p.partenaire_id = $1 AND a.statut = 'livre'`,
      [partenaire.id]
    ),
  ]);

  res.json({
    ok: true,
    partenaire,
    stats: {
      achats_en_cours: enCours.rows[0],
      commandes_a_preparer: aPreparer.rows[0].n,
      ventes_livrees: historiques.rows[0],
    },
  });
}
