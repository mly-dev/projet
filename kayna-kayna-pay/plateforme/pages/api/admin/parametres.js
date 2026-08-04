import { utilisateurRequis } from "../../../lib/auth";
import { query, setParametre } from "../../../lib/db";
import { auditer } from "../../../lib/audit";

const CLES = ["commission_pct", "versement_minimum", "numeros_depot", "delai_attente_minutes"];

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
    if (!user) return;
    const r = await query("SELECT cle, valeur FROM parametres WHERE cle = ANY($1)", [CLES]);
    const parametres = {};
    for (const ligne of r.rows) parametres[ligne.cle] = ligne.valeur;
    return res.json({ ok: true, parametres });
  }

  if (req.method === "PUT") {
    // Les paramètres globaux relèvent du super-admin (cahier des charges §3).
    const user = await utilisateurRequis(req, res, ["superadmin"]);
    if (!user) return;
    const { cle, valeur } = req.body || {};
    if (!CLES.includes(cle)) return res.status(400).json({ ok: false, erreur: "Paramètre inconnu." });
    await setParametre(cle, valeur);
    await auditer(user.id, "parametre.modifie", "parametre", cle, { valeur });
    return res.json({ ok: true });
  }

  res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
}
