const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query } = require("./db");

const SECRET = process.env.JWT_SECRET || "kkp-dev-secret-a-changer";
const DUREE = process.env.JWT_DUREE || "24h";

function signerJeton(user) {
  return jwt.sign({ uid: user.id, role: user.role }, SECRET, { expiresIn: DUREE });
}

function verifierJeton(token) {
  return jwt.verify(token, SECRET);
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
  const entete = req.headers.authorization || "";
  const token = entete.startsWith("Bearer ") ? entete.slice(7) : null;
  if (!token) {
    res.status(401).json({ ok: false, erreur: "Authentification requise." });
    return null;
  }
  let payload;
  try {
    payload = verifierJeton(token);
  } catch (e) {
    res.status(401).json({ ok: false, erreur: "Session expirée, reconnectez-vous." });
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
  verifierJeton,
  hacherMotDePasse,
  comparerMotDePasse,
  utilisateurRequis,
  normaliserTelephone,
};
