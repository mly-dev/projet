import { utilisateurRequis } from "../../../lib/auth";
import { initierVersement } from "../../../lib/versements";

// Initiation d'un versement : renvoie les instructions de dépôt (numéro de
// la plateforme pour l'opérateur choisi, montant, référence unique).
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["client"]);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const { achat_id, montant, operateur } = req.body || {};
  try {
    const resultat = await initierVersement(user, Number(achat_id), Number(montant), String(operateur || ""));
    res.json({ ok: true, ...resultat });
  } catch (e) {
    res.status(400).json({ ok: false, erreur: e.message });
  }
}
