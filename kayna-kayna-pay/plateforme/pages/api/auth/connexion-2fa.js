import {
  verifierJeton,
  signerJeton,
  poserCookieSession,
  exigeDoubleFacteur,
} from "../../../lib/auth";
import { query } from "../../../lib/db";
import { verifierOtp } from "../../../lib/otp";
import { garde } from "../../../lib/ratelimit";
import { auditer } from "../../../lib/audit";

// Deuxième facteur de la connexion administrateur.
//
// Deux preuves sont exigées : le jeton temporaire (qui atteste que le mot de
// passe a été validé il y a moins de 10 minutes) et le code reçu par SMS.
// Connaître le seul code ne suffit donc pas à ouvrir une session.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  if (!garde(req, res, "connexion-2fa", 10, 15 * 60 * 1000)) return;

  const { jeton_temporaire, code, espace_web } = req.body || {};
  if (!jeton_temporaire || !code) {
    return res.status(400).json({ ok: false, erreur: "Code de connexion requis." });
  }

  let charge;
  try {
    charge = verifierJeton(jeton_temporaire);
  } catch (e) {
    return res.status(401).json({ ok: false, erreur: "Session de connexion expirée. Recommencez." });
  }
  if (charge.etape !== "2fa") {
    return res.status(400).json({ ok: false, erreur: "Jeton de connexion invalide." });
  }

  const r = await query("SELECT * FROM users WHERE id = $1", [charge.uid]);
  const user = r.rows[0];
  if (!user || user.statut !== "actif") {
    return res.status(403).json({ ok: false, erreur: "Compte indisponible." });
  }
  if (!exigeDoubleFacteur(user.role)) {
    return res.status(400).json({ ok: false, erreur: "Ce compte n'utilise pas de deuxième facteur." });
  }

  const valide = await verifierOtp(user.telephone, code, "connexion");
  if (!valide) {
    await auditer(user.id, "connexion.second_facteur_echec", "user", user.id, {});
    return res.status(400).json({ ok: false, erreur: "Code invalide ou expiré." });
  }

  await auditer(user.id, "connexion.reussie", "user", user.id, { role: user.role });
  const utilisateur = { id: user.id, telephone: user.telephone, nom: user.nom, role: user.role };
  const jeton = signerJeton(user);
  if (espace_web) {
    poserCookieSession(res, jeton);
    return res.json({ ok: true, utilisateur });
  }
  res.json({ ok: true, jeton, utilisateur });
}
