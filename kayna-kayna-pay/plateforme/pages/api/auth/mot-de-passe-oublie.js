import { normaliserTelephone } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { envoyerOtp } from "../../../lib/otp";
import { garde } from "../../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  if (!garde(req, res, "mdp-oublie", 5, 60 * 60 * 1000)) return;

  const tel = normaliserTelephone((req.body || {}).telephone);
  if (!tel) return res.status(400).json({ ok: false, erreur: "Numéro de téléphone invalide." });

  const r = await query("SELECT id FROM users WHERE telephone = $1 AND statut = 'actif'", [tel]);
  // Réponse identique que le compte existe ou non (pas de divulgation).
  if (r.rows.length) await envoyerOtp(tel, "reinitialisation");
  res.json({ ok: true, message: "Si un compte existe avec ce numéro, un code a été envoyé par SMS." });
}
