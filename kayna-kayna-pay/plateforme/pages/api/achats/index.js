import { utilisateurRequis } from "../../../lib/auth";
import { demarrerAchat, listerAchats } from "../../../lib/achats";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["client"]);
  if (!user) return;

  if (req.method === "GET") {
    return res.json({ ok: true, achats: await listerAchats(user.id) });
  }

  if (req.method === "POST") {
    const produitId = Number((req.body || {}).produit_id);
    if (!Number.isInteger(produitId)) return res.status(400).json({ ok: false, erreur: "Produit requis." });
    try {
      const { achat, produit } = await demarrerAchat(user, produitId);
      return res.json({ ok: true, achat, produit: { id: produit.id, nom: produit.nom } });
    } catch (e) {
      return res.status(400).json({ ok: false, erreur: e.message });
    }
  }

  res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
}
