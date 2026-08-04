import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";

// Commandes complétées à préparer et historique des ventes de l'enseigne.
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["partenaire"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const rp = await query("SELECT id FROM partenaires WHERE user_id = $1", [user.id]);
  if (!rp.rows.length) return res.status(404).json({ ok: false, erreur: "Profil partenaire introuvable." });

  const r = await query(
    `SELECT a.id, a.reference, a.statut, a.prix_total, a.complete_le, a.maj_le,
            p.nom AS produit_nom, p.prix_partenaire
     FROM achats a JOIN produits p ON p.id = a.produit_id
     WHERE p.partenaire_id = $1 AND a.statut IN ('complete', 'en_preparation', 'livre')
     ORDER BY a.maj_le DESC LIMIT 200`,
    [rp.rows[0].id]
  );
  res.json({ ok: true, commandes: r.rows });
}
