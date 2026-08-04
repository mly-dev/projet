import { query } from "../../../lib/db";

// Contenus consultables : CGU, politique de confidentialité, FAQ, contact.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
  const cle = String(req.query.cle || "");
  if (!["cgu", "confidentialite", "faq", "contact"].includes(cle)) {
    return res.status(404).json({ ok: false, erreur: "Contenu inconnu." });
  }
  const r = await query("SELECT cle, titre, corps, maj_le FROM contenus WHERE cle = $1", [cle]);
  if (!r.rows.length) return res.status(404).json({ ok: false, erreur: "Contenu non disponible." });
  res.json({ ok: true, contenu: r.rows[0] });
}
