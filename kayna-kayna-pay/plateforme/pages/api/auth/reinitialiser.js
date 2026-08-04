import { normaliserTelephone, hacherMotDePasse, signerJeton } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { verifierOtp } from "../../../lib/otp";
import { garde } from "../../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  if (!garde(req, res, "reinitialiser", 10, 60 * 60 * 1000)) return;

  const { telephone, code, nouveau_mot_de_passe } = req.body || {};
  const tel = normaliserTelephone(telephone);
  if (!tel || !code) return res.status(400).json({ ok: false, erreur: "Téléphone et code requis." });
  if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ ok: false, erreur: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
  }

  const valide = await verifierOtp(tel, code, "reinitialisation");
  if (!valide) return res.status(400).json({ ok: false, erreur: "Code invalide ou expiré." });

  const hash = await hacherMotDePasse(nouveau_mot_de_passe);
  const r = await query(
    "UPDATE users SET mot_de_passe_hash = $2 WHERE telephone = $1 RETURNING id, telephone, nom, role",
    [tel, hash]
  );
  if (!r.rows.length) return res.status(404).json({ ok: false, erreur: "Compte introuvable." });
  res.json({ ok: true, jeton: signerJeton(r.rows[0]), utilisateur: r.rows[0] });
}
