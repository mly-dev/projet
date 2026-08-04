import { normaliserTelephone, hacherMotDePasse } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { envoyerOtp } from "../../../lib/otp";
import { garde } from "../../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  if (!garde(req, res, "inscription", 10, 60 * 60 * 1000)) return;

  const { telephone, nom, mot_de_passe, cgu_acceptees } = req.body || {};
  const tel = normaliserTelephone(telephone);
  if (!tel) return res.status(400).json({ ok: false, erreur: "Numéro de téléphone invalide (8 chiffres, Niger)." });
  if (!nom || nom.trim().length < 2) return res.status(400).json({ ok: false, erreur: "Le nom complet est requis." });
  if (!mot_de_passe || mot_de_passe.length < 6) {
    return res.status(400).json({ ok: false, erreur: "Le mot de passe doit contenir au moins 6 caractères." });
  }
  if (!cgu_acceptees) {
    return res.status(400).json({ ok: false, erreur: "Vous devez accepter les conditions générales d'utilisation et la politique de confidentialité." });
  }

  const existant = await query("SELECT id, telephone_verifie FROM users WHERE telephone = $1", [tel]);
  if (existant.rows.length && existant.rows[0].telephone_verifie) {
    return res.status(409).json({ ok: false, erreur: "Un compte existe déjà avec ce numéro. Connectez-vous." });
  }

  const hash = await hacherMotDePasse(mot_de_passe);
  if (existant.rows.length) {
    await query(
      "UPDATE users SET nom = $2, mot_de_passe_hash = $3, cgu_acceptees_le = now() WHERE telephone = $1",
      [tel, nom.trim(), hash]
    );
  } else {
    await query(
      `INSERT INTO users (telephone, nom, mot_de_passe_hash, role, cgu_acceptees_le)
       VALUES ($1, $2, $3, 'client', now())`,
      [tel, nom.trim(), hash]
    );
  }
  await envoyerOtp(tel, "inscription");
  res.json({ ok: true, message: "Code de vérification envoyé par SMS.", telephone: tel });
}
