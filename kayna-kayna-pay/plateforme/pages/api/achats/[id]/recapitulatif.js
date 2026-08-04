import { utilisateurRequis } from "../../../../lib/auth";
import { recapitulatif } from "../../../../lib/achats";

// Récapitulatif complet valant preuve d'achat (produit, montant total,
// liste des versements validés).
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["client"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const recap = await recapitulatif(user.id, Number(req.query.id));
  if (!recap) return res.status(404).json({ ok: false, erreur: "Achat introuvable." });
  res.json({ ok: true, recapitulatif: recap });
}
