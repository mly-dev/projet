import { utilisateurRequis } from "../../../../lib/auth";
import { query } from "../../../../lib/db";
import { confirmerDepot } from "../../../../lib/versements";

// « J'ai effectué le dépôt » : le versement passe en attente de validation
// et apparaît immédiatement dans la file de l'espace administrateur.
export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["client"]);
  if (!user) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const id = Number(req.query.id);
  const r = await query("SELECT id FROM versements WHERE id = $1 AND client_id = $2", [id, user.id]);
  if (!r.rows.length) return res.status(404).json({ ok: false, erreur: "Versement introuvable." });

  try {
    const versement = await confirmerDepot(user, id);
    res.json({ ok: true, versement, attente_minutes: 10 });
  } catch (e) {
    res.status(400).json({ ok: false, erreur: e.message });
  }
}
