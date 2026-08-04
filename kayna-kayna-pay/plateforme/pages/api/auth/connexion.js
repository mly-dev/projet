import { normaliserTelephone, comparerMotDePasse, signerJeton } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { garde } from "../../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  if (!garde(req, res, "connexion", 15, 15 * 60 * 1000)) return;

  const { telephone, mot_de_passe } = req.body || {};
  const tel = normaliserTelephone(telephone);
  if (!tel || !mot_de_passe) return res.status(400).json({ ok: false, erreur: "Téléphone et mot de passe requis." });

  const r = await query("SELECT * FROM users WHERE telephone = $1", [tel]);
  const user = r.rows[0];
  if (!user || !(await comparerMotDePasse(mot_de_passe, user.mot_de_passe_hash))) {
    return res.status(401).json({ ok: false, erreur: "Téléphone ou mot de passe incorrect." });
  }
  if (user.statut !== "actif") return res.status(403).json({ ok: false, erreur: "Ce compte est suspendu. Contactez le support." });
  if (!user.telephone_verifie) {
    return res.status(403).json({ ok: false, erreur: "Numéro non vérifié. Reprenez l'inscription pour recevoir un code.", verification_requise: true });
  }
  res.json({
    ok: true,
    jeton: signerJeton(user),
    utilisateur: { id: user.id, telephone: user.telephone, nom: user.nom, role: user.role },
  });
}
