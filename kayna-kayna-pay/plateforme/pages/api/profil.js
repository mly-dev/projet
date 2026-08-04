import { utilisateurRequis, hacherMotDePasse, comparerMotDePasse } from "../../lib/auth";
import { query } from "../../lib/db";
import { auditer } from "../../lib/audit";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res);
  if (!user) return;

  if (req.method === "GET") {
    return res.json({ ok: true, utilisateur: user });
  }

  if (req.method === "PUT") {
    const { nom, ancien_mot_de_passe, nouveau_mot_de_passe } = req.body || {};
    if (nouveau_mot_de_passe) {
      const r = await query("SELECT mot_de_passe_hash FROM users WHERE id = $1", [user.id]);
      if (!(await comparerMotDePasse(ancien_mot_de_passe || "", r.rows[0].mot_de_passe_hash))) {
        return res.status(400).json({ ok: false, erreur: "Ancien mot de passe incorrect." });
      }
      if (nouveau_mot_de_passe.length < 6) {
        return res.status(400).json({ ok: false, erreur: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
      }
      await query("UPDATE users SET mot_de_passe_hash = $2 WHERE id = $1", [user.id, await hacherMotDePasse(nouveau_mot_de_passe)]);
    }
    if (nom && nom.trim().length >= 2) {
      await query("UPDATE users SET nom = $2 WHERE id = $1", [user.id, nom.trim()]);
    }
    const r = await query("SELECT id, telephone, nom, role FROM users WHERE id = $1", [user.id]);
    return res.json({ ok: true, utilisateur: r.rows[0] });
  }

  if (req.method === "DELETE") {
    // Droit de suppression du compte (données personnelles) : le compte est
    // marqué supprimé et anonymisé ; les écritures financières restent.
    await query(
      `UPDATE users SET statut = 'supprime', nom = 'Compte supprimé',
       telephone = 'supprime-' || id || '-' || floor(random() * 100000)::text WHERE id = $1`,
      [user.id]
    );
    await auditer(user.id, "compte.supprime", "user", user.id, {});
    return res.json({ ok: true, message: "Compte supprimé." });
  }

  res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
}
