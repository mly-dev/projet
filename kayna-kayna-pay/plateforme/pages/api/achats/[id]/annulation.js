import { utilisateurRequis } from "../../../../lib/auth";
import { demanderAnnulation } from "../../../../lib/achats";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["client"]);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  try {
    const achat = await demanderAnnulation(user, Number(req.query.id), (req.body || {}).motif);
    res.json({ ok: true, achat });
  } catch (e) {
    res.status(400).json({ ok: false, erreur: e.message });
  }
}
