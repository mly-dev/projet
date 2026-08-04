import { utilisateurRequis } from "../../../../lib/auth";
import { detailAchat } from "../../../../lib/achats";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["client"]);
  if (!user) return;
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const achat = await detailAchat(user.id, Number(req.query.id));
  if (!achat) return res.status(404).json({ ok: false, erreur: "Achat introuvable." });
  res.json({ ok: true, achat });
}
