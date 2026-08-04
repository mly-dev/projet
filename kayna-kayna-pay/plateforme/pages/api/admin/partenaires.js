import { utilisateurRequis, hacherMotDePasse, normaliserTelephone } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { auditer } from "../../../lib/audit";

// Les partenaires sont créés sur invitation/validation de l'administration
// (pas d'inscription libre) — cahier des charges §7.
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;

  if (req.method === "GET") {
    const r = await query(
      `SELECT pa.*, u.telephone, u.statut AS statut_compte,
              (SELECT COUNT(*)::int FROM produits p WHERE p.partenaire_id = pa.id) AS nb_produits
       FROM partenaires pa LEFT JOIN users u ON u.id = pa.user_id
       ORDER BY pa.cree_le DESC`
    );
    return res.json({ ok: true, partenaires: r.rows });
  }

  if (req.method === "POST") {
    const { enseigne, contact, coordonnees_reglement, telephone, mot_de_passe } = req.body || {};
    if (!enseigne || !enseigne.trim()) return res.status(400).json({ ok: false, erreur: "L'enseigne est requise." });

    let userId = null;
    if (telephone) {
      const tel = normaliserTelephone(telephone);
      if (!tel) return res.status(400).json({ ok: false, erreur: "Téléphone invalide." });
      if (!mot_de_passe || mot_de_passe.length < 6) {
        return res.status(400).json({ ok: false, erreur: "Mot de passe d'au moins 6 caractères requis pour le compte partenaire." });
      }
      const existant = await query("SELECT id FROM users WHERE telephone = $1", [tel]);
      if (existant.rows.length) return res.status(409).json({ ok: false, erreur: "Un compte existe déjà avec ce numéro." });
      const ru = await query(
        `INSERT INTO users (telephone, nom, mot_de_passe_hash, role, telephone_verifie, cgu_acceptees_le)
         VALUES ($1, $2, $3, 'partenaire', TRUE, now()) RETURNING id`,
        [tel, enseigne.trim(), await hacherMotDePasse(mot_de_passe)]
      );
      userId = ru.rows[0].id;
    }

    const r = await query(
      `INSERT INTO partenaires (user_id, enseigne, contact, coordonnees_reglement)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, enseigne.trim(), contact || null, coordonnees_reglement || null]
    );
    await auditer(user.id, "partenaire.cree", "partenaire", r.rows[0].id, { enseigne });
    return res.json({ ok: true, partenaire: r.rows[0] });
  }

  res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
}
