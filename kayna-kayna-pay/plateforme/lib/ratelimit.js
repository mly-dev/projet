// Limitation simple en mémoire (anti-abus connexion / OTP).
// Suffisant pour un déploiement mono-instance ; à remplacer par un stockage
// partagé (Redis) en cas de montée en charge multi-instances.
const compteurs = new Map();

// Deux détails sans importance sur un PC de bureau, décisifs sur un serveur
// public :
//
// 1. Derrière un hébergeur, la connexion vient de son proxy. Toutes les
//    requêtes du monde partageraient alors un seul compteur — ou, si l'on
//    lisait l'en-tête X-Forwarded-For en entier, chaque chaîne inventée par
//    l'appelant ouvrirait un compteur neuf : la limite ne limiterait plus rien.
//
//    TRUST_PROXY indique combien de proxys de confiance se trouvent devant la
//    plateforme. On prend alors l'entrée située juste avant eux : celle qu'ils
//    ont écrite, donc la seule que l'appelant ne peut pas falsifier. Sans
//    proxy (valeur 0, par défaut), on garde l'adresse de la connexion.
//
// 2. La table des compteurs ne se vidait jamais. Un scanner qui frappe la page
//    de connexion depuis des milliers d'adresses la faisait grossir sans fin.
const PROXYS_DE_CONFIANCE = Math.max(0, Number(process.env.TRUST_PROXY || 0));
const PERIODE_NETTOYAGE_MS = 10 * 60 * 1000;
const AGE_MAXIMAL_MS = 60 * 60 * 1000;

function adresseAppelant(req) {
  const direct = req.socket ? req.socket.remoteAddress : null;
  if (!PROXYS_DE_CONFIANCE) return direct || "inconnu";

  const chaine = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!chaine.length) return direct || "inconnu";

  const index = chaine.length - PROXYS_DE_CONFIANCE;
  return chaine[Math.max(0, index)] || direct || "inconnu";
}

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

function nettoyer(maintenant = Date.now()) {
  let retires = 0;
  for (const [cle, entree] of compteurs) {
    if (maintenant - entree.debut > AGE_MAXIMAL_MS) {
      compteurs.delete(cle);
      retires++;
    }
  }
  return retires;
}

const balayage = setInterval(() => nettoyer(), PERIODE_NETTOYAGE_MS);
if (balayage.unref) balayage.unref(); // n'empêche pas le processus de s'arrêter

// Garde pour une route API : renvoie false (et répond 429) si la limite est atteinte.
function garde(req, res, nom, max, fenetreMs) {
  const ip = adresseAppelant(req);
  if (!limiter(`${nom}:${ip}`, max, fenetreMs)) {
    res.status(429).json({ ok: false, erreur: "Trop de tentatives, réessayez plus tard." });
    return false;
  }
  return true;
}

module.exports = { garde, limiter, adresseAppelant, nettoyer, compteurs };
