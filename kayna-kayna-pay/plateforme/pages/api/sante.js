// Sonde de santé.
//
// Tout hébergeur interroge une adresse de ce genre pour savoir si la version
// qu'il vient de déployer fonctionne, et bascule le trafic dessus seulement si
// elle répond. Une sonde qui se contenterait de renvoyer « ok » déclarerait
// saine une plateforme dont la base est injoignable : le déploiement passerait,
// et la panne n'apparaîtrait qu'au premier client. On interroge donc la base.
//
//   GET /api/sante   →   200 { ok: true, base: "jointe", version, duree_ms }
//                        503 { ok: false, base: "injoignable", erreur }
const { pool } = require("../../lib/db");

const DEPART = Date.now();

export default async function handler(req, res) {
  const debut = Date.now();
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    // 503 et non 500 : le service est indisponible mais reviendra ; c'est le
    // code que les hébergeurs interprètent comme « ne pas envoyer de trafic ».
    return res.status(503).json({
      ok: false,
      base: "injoignable",
      erreur: e.message,
      depuis_s: Math.round((Date.now() - DEPART) / 1000),
    });
  }
  return res.status(200).json({
    ok: true,
    base: "jointe",
    duree_ms: Date.now() - debut,
    depuis_s: Math.round((Date.now() - DEPART) / 1000),
  });
}
