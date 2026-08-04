import { utilisateurRequis } from "../../../lib/auth";
import { query, getParametre } from "../../../lib/db";
import { auditer } from "../../../lib/audit";

// Gestion du catalogue par l'administration (MVP : le catalogue partenaire
// est géré par l'admin ; l'espace partenaire est en consultation).
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;

  if (req.method === "GET") {
    const r = await query(
      `SELECT p.*, c.nom AS categorie, pa.enseigne AS partenaire
       FROM produits p
       JOIN categories c ON c.id = p.categorie_id
       JOIN partenaires pa ON pa.id = p.partenaire_id
       ORDER BY p.cree_le DESC LIMIT 300`
    );
    return res.json({ ok: true, produits: r.rows });
  }

  if (req.method === "POST") {
    const { partenaire_id, categorie_id, nom, description, prix_partenaire, modalites_remise, mis_en_avant } = req.body || {};
    if (!Number.isInteger(partenaire_id) || !Number.isInteger(categorie_id) || !nom || !Number.isInteger(prix_partenaire) || prix_partenaire <= 0) {
      return res.status(400).json({ ok: false, erreur: "Partenaire, catégorie, nom et prix partenaire (entier positif) sont requis." });
    }
    // Prix affiché = prix partenaire + commission, arrondi aux 5 F supérieurs.
    const commission = Number(await getParametre("commission_pct", 5));
    const prixAffiche = Math.ceil((prix_partenaire * (1 + commission / 100)) / 5) * 5;
    const r = await query(
      `INSERT INTO produits (partenaire_id, categorie_id, nom, description, prix_partenaire,
                             prix_affiche, modalites_remise, mis_en_avant, statut_validation)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'Retrait chez le partenaire'), COALESCE($8, FALSE), 'valide')
       RETURNING *`,
      [partenaire_id, categorie_id, nom.trim(), description || "", prix_partenaire, prixAffiche,
       modalites_remise || null, typeof mis_en_avant === "boolean" ? mis_en_avant : null]
    );
    await auditer(user.id, "produit.cree", "produit", r.rows[0].id, { nom, prix_partenaire, prix_affiche: prixAffiche });
    return res.json({ ok: true, produit: r.rows[0] });
  }

  if (req.method === "PUT") {
    const { id, disponible, mis_en_avant, description, statut_validation, modalites_remise } = req.body || {};
    if (!Number.isInteger(id)) return res.status(400).json({ ok: false, erreur: "Identifiant requis." });
    await query(
      `UPDATE produits SET
         disponible = COALESCE($2, disponible),
         mis_en_avant = COALESCE($3, mis_en_avant),
         description = COALESCE($4, description),
         statut_validation = COALESCE($5, statut_validation),
         modalites_remise = COALESCE($6, modalites_remise),
         maj_le = now()
       WHERE id = $1`,
      [id,
       typeof disponible === "boolean" ? disponible : null,
       typeof mis_en_avant === "boolean" ? mis_en_avant : null,
       description || null,
       ["en_attente", "valide", "refuse"].includes(statut_validation) ? statut_validation : null,
       modalites_remise || null]
    );
    await auditer(user.id, "produit.modifie", "produit", id, {});
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
}
