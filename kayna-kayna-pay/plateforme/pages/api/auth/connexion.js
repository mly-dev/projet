import {
  normaliserTelephone,
  comparerMotDePasse,
  signerJeton,
  signerJetonTemporaire,
  exigeDoubleFacteur,
  poserCookieSession,
} from "../../../lib/auth";
import { query } from "../../../lib/db";
import { envoyerOtp } from "../../../lib/otp";
import { garde } from "../../../lib/ratelimit";
import { auditer } from "../../../lib/audit";

// Connexion. Pour les rôles d'administration, le mot de passe ne suffit pas :
// un code est envoyé par SMS et la session n'est ouverte qu'après sa
// vérification par /api/auth/connexion-2fa (cahier des charges §10).
//
// `espace_web: true` (espaces admin et partenaire) fait déposer le jeton dans
// un cookie httpOnly au lieu de le renvoyer dans le corps de la réponse.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  if (!garde(req, res, "connexion", 15, 15 * 60 * 1000)) return;

  const { telephone, mot_de_passe, espace_web } = req.body || {};
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

  // Deuxième facteur pour les administrateurs : aucune session n'est ouverte ici.
  if (exigeDoubleFacteur(user.role)) {
    await envoyerOtp(tel, "connexion");
    await auditer(user.id, "connexion.second_facteur_envoye", "user", user.id, {});
    return res.json({
      ok: true,
      second_facteur: true,
      jeton_temporaire: signerJetonTemporaire(user),
      message: "Un code de connexion vous a été envoyé par SMS.",
    });
  }

  const utilisateur = { id: user.id, telephone: user.telephone, nom: user.nom, role: user.role };
  const jeton = signerJeton(user);
  if (espace_web) {
    poserCookieSession(res, jeton);
    return res.json({ ok: true, utilisateur });
  }
  res.json({ ok: true, jeton, utilisateur });
}
