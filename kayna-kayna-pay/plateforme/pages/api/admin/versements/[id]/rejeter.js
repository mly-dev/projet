import { utilisateurRequis } from "../../../../../lib/auth";
import { rejeterVersement } from "../../../../../lib/versements";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  try {
    await rejeterVersement(user, Number(req.query.id), (req.body || {}).motif);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, erreur: e.message });
  }
}
