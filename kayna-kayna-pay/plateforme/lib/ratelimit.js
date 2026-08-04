// Limitation simple en mémoire (anti-abus connexion / OTP).
// Suffisant pour un déploiement mono-instance ; à remplacer par un stockage
// partagé (Redis) en cas de montée en charge multi-instances.
const compteurs = new Map();

function limiter(cle, max, fenetreMs) {
  const maintenant = Date.now();
  const entree = compteurs.get(cle);
  if (!entree || maintenant - entree.debut > fenetreMs) {
    compteurs.set(cle, { debut: maintenant, compte: 1 });
    return true;
  }
  entree.compte += 1;
  return entree.compte <= max;
}

// Garde pour une route API : renvoie false (et répond 429) si la limite est atteinte.
function garde(req, res, nom, max, fenetreMs) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "inconnu";
  if (!limiter(`${nom}:${ip}`, max, fenetreMs)) {
    res.status(429).json({ ok: false, erreur: "Trop de tentatives, réessayez plus tard." });
    return false;
  }
  return true;
}

module.exports = { garde, limiter };
