import { normaliserTelephone } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { envoyerOtp } from "../../../lib/otp";
import { garde } from "../../../lib/ratelimit";

// Renvoi du code de vérification d'inscription. Le SMS se perd parfois : sans
// cette route, un client bloqué à l'écran de vérification n'a plus aucune
// issue que de recommencer l'inscription.
//
// La réponse est volontairement identique dans tous les cas : elle ne dit
// jamais si un compte existe pour ce numéro, sinon la route deviendrait un
// moyen de tester des numéros un par un.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  if (!garde(req, res, "renvoyer-otp", 5, 15 * 60 * 1000)) return;

  const tel = normaliserTelephone((req.body || {}).telephone);
  if (!tel) return res.status(400).json({ ok: false, erreur: "Numéro de téléphone invalide (8 chiffres, Niger)." });

  const r = await query(
    "SELECT id FROM users WHERE telephone = $1 AND telephone_verifie = FALSE",
    [tel]
  );
  if (r.rows.length) await envoyerOtp(tel, "inscription");

  res.json({ ok: true, message: "Si ce numéro est en attente de vérification, un nouveau code vient de partir." });
}
