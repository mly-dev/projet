import { effacerCookieSession } from "../../../lib/auth";

// Déconnexion des espaces web : le cookie httpOnly ne pouvant pas être effacé
// par le JavaScript de la page, c'est le serveur qui le retire.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  effacerCookieSession(res);
  res.json({ ok: true });
}
