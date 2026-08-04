import { utilisateurRequis } from "../../../../../lib/auth";
import { validerVersement } from "../../../../../lib/versements";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const montantReel = (req.body || {}).montant_reel;
  try {
    const resultat = await validerVersement(user, Number(req.query.id),
      montantReel == null ? null : Number(montantReel));
    res.json({ ok: true, total: resultat.total, complete: resultat.complete });
  } catch (e) {
    res.status(400).json({ ok: false, erreur: e.message });
  }
}
