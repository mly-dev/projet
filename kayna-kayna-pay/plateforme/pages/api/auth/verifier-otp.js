import { normaliserTelephone, signerJeton } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { verifierOtp } from "../../../lib/otp";
import { garde } from "../../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  if (!garde(req, res, "verifier-otp", 20, 60 * 60 * 1000)) return;

  const { telephone, code } = req.body || {};
  const tel = normaliserTelephone(telephone);
  if (!tel || !code) return res.status(400).json({ ok: false, erreur: "Téléphone et code requis." });

  const valide = await verifierOtp(tel, code, "inscription");
  if (!valide) return res.status(400).json({ ok: false, erreur: "Code invalide ou expiré." });

  const r = await query(
    "UPDATE users SET telephone_verifie = TRUE WHERE telephone = $1 RETURNING id, telephone, nom, role",
    [tel]
  );
  if (!r.rows.length) return res.status(404).json({ ok: false, erreur: "Compte introuvable." });
  const user = r.rows[0];
  res.json({ ok: true, jeton: signerJeton(user), utilisateur: user });
}
