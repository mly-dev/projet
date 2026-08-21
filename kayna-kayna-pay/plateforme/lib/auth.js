const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query } = require("./db");

// Le repli n'existe que pour le développement ; en production, lib/config.js
// arrête le serveur avant qu'il ne serve la moindre requête avec ce secret-là.
const SECRET = process.env.JWT_SECRET || "kkp-dev-secret-a-changer";
const DUREE = process.env.JWT_DUREE || "24h";
const COOKIE = "kkp_jeton";

// Les rôles d'administration exigent un deuxième facteur (cahier des charges §10).
const ROLES_DOUBLE_FACTEUR = ["admin", "superadmin"];

function exigeDoubleFacteur(role) {
  return ROLES_DOUBLE_FACTEUR.includes(role);
}

function signerJeton(user) {
  return jwt.sign({ uid: user.id, role: user.role }, SECRET, { expiresIn: DUREE });
}

// Jeton intermédiaire délivré après le mot de passe, avant le code SMS. Il ne
// vaut PAS session : `verifierJetonSession` le refuse. Il sert uniquement à
// prouver que l'étape mot de passe a réussi.
function signerJetonTemporaire(user) {
  return jwt.sign({ uid: user.id, role: user.role, etape: "2fa" }, SECRET, { expiresIn: "10m" });
}

function verifierJeton(token) {
  return jwt.verify(token, SECRET);
}

// Vérification stricte : un jeton d'étape intermédiaire n'ouvre aucune session.
function verifierJetonSession(token) {
  const charge = jwt.verify(token, SECRET);
  if (charge.etape) {
    const e = new Error("Authentification incomplète : deuxième facteur requis.");
    e.code = "ETAPE_INCOMPLETE";
    throw e;
  }
  return charge;
}

// ── Cookie de session des espaces web ────────────────────────────────────────
// Les espaces web (admin, partenaire) reçoivent le jeton dans un cookie
// httpOnly : le JavaScript de la page ne peut pas le lire, donc une faille XSS
// ne permet pas de voler la session. L'application mobile continue d'utiliser
// l'en-tête Authorization.
function poserCookieSession(res, jetonValeur) {
  const attributs = [
    `${COOKIE}=${jetonValeur}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Strict", // protège des requêtes intersites (CSRF)
    "Max-Age=86400",
  ];
  if (process.env.NODE_ENV === "production") attributs.push("Secure");
  res.setHeader("Set-Cookie", attributs.join("; "));
}

function effacerCookieSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`);
}

// Extrait le jeton d'une requête : en-tête Authorization (mobile) ou cookie (web).
function jetonDeLaRequete(req) {
  const entete = req.headers.authorization || "";
  if (entete.startsWith("Bearer ")) return entete.slice(7);
  if (req.cookies && req.cookies[COOKIE]) return req.cookies[COOKIE];
  return null;
}

// Lit le cookie de session depuis un en-tête Cookie brut (poignée de main socket).
function jetonDuCookieBrut(enteteCookie) {
  if (!enteteCookie) return null;
  for (const morceau of enteteCookie.split(";")) {
    const [nom, ...reste] = morceau.trim().split("=");
    if (nom === COOKIE) return reste.join("=");
  }
  return null;
}

async function hacherMotDePasse(mdp) {
  return bcrypt.hash(mdp, 10);
}

async function comparerMotDePasse(mdp, hash) {
  return bcrypt.compare(mdp, hash);
}

// Extrait l'utilisateur du header Authorization: Bearer <jeton>.
// roles : liste de rôles autorisés (vide = tout utilisateur connecté).
async function utilisateurRequis(req, res, roles = []) {
  const token = jetonDeLaRequete(req);
  if (!token) {
    res.status(401).json({ ok: false, erreur: "Authentification requise." });
    return null;
  }
  let payload;
  try {
    payload = verifierJetonSession(token);
  } catch (e) {
    res.status(401).json({
      ok: false,
      erreur:
        e.code === "ETAPE_INCOMPLETE"
          ? "Authentification incomplète : saisissez le code reçu par SMS."
          : "Session expirée, reconnectez-vous.",
    });
    return null;
  }
  const r = await query("SELECT id, telephone, nom, role, statut, telephone_verifie FROM users WHERE id = $1", [payload.uid]);
  const user = r.rows[0];
  if (!user || user.statut !== "actif") {
    res.status(403).json({ ok: false, erreur: "Compte indisponible." });
    return null;
  }
  if (roles.length && !roles.includes(user.role)) {
    res.status(403).json({ ok: false, erreur: "Accès refusé pour ce rôle." });
    return null;
  }
  return user;
}

function normaliserTelephone(tel) {
  if (typeof tel !== "string") return null;
  const t = tel.replace(/[\s.-]/g, "");
  if (!/^(\+227)?\d{8}$/.test(t)) return null;
  return t.startsWith("+227") ? t : "+227" + t;
}

module.exports = {
  signerJeton,
  signerJetonTemporaire,
  verifierJeton,
  verifierJetonSession,
  hacherMotDePasse,
  comparerMotDePasse,
  utilisateurRequis,
  normaliserTelephone,
  exigeDoubleFacteur,
  poserCookieSession,
  effacerCookieSession,
  jetonDeLaRequete,
  jetonDuCookieBrut,
};
