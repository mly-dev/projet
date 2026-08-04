import { utilisateurRequis } from "../../lib/auth";
import { query } from "../../lib/db";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const r = await query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 100",
      [user.id]
    );
    const nonLues = await query(
      "SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND lue = FALSE",
      [user.id]
    );
    return res.json({ ok: true, notifications: r.rows, non_lues: nonLues.rows[0].n });
  }

  if (req.method === "POST") {
    // Marquer tout comme lu.
    await query("UPDATE notifications SET lue = TRUE WHERE user_id = $1", [user.id]);
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
}
