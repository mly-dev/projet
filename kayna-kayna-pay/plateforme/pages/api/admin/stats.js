import { utilisateurRequis } from "../../../lib/auth";
import { query } from "../../../lib/db";

// Tableau de bord : volumes de versements, montants collectés, achats
// complétés, commissions générées, partenaires les plus actifs.
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const [attente, jour, semaine, mois, achats, commissions, partenaires] = await Promise.all([
    query("SELECT COUNT(*)::int AS n FROM versements WHERE statut IN ('en_attente', 'en_verification')"),
    query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(montant_valide), 0)::bigint AS total
           FROM versements WHERE statut = 'valide' AND statut_maj_le > now() - interval '1 day'`),
    query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(montant_valide), 0)::bigint AS total
           FROM versements WHERE statut = 'valide' AND statut_maj_le > now() - interval '7 days'`),
    query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(montant_valide), 0)::bigint AS total
           FROM versements WHERE statut = 'valide' AND statut_maj_le > now() - interval '30 days'`),
    query(`SELECT statut, COUNT(*)::int AS n FROM achats GROUP BY statut`),
    query(`SELECT COALESCE(SUM(a.prix_total - p.prix_partenaire), 0)::bigint AS total
           FROM achats a JOIN produits p ON p.id = a.produit_id
           WHERE a.statut IN ('complete', 'en_preparation', 'livre')`),
    query(`SELECT pa.enseigne, COUNT(a.id)::int AS achats
           FROM achats a
           JOIN produits p ON p.id = a.produit_id
           JOIN partenaires pa ON pa.id = p.partenaire_id
           GROUP BY pa.enseigne ORDER BY achats DESC LIMIT 5`),
  ]);

  const parStatut = {};
  for (const ligne of achats.rows) parStatut[ligne.statut] = ligne.n;

  res.json({
    ok: true,
    stats: {
      versements_a_traiter: attente.rows[0].n,
      versements_jour: jour.rows[0],
      versements_semaine: semaine.rows[0],
      versements_mois: mois.rows[0],
      achats_par_statut: parStatut,
      commissions_generees: Number(commissions.rows[0].total),
      partenaires_actifs: partenaires.rows,
    },
  });
}
