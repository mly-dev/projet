// Identifiants des comptes de démonstration, pour les tests de bout en bout.
//
// Les mêmes variables que le seed (SEED_MDP_ADMIN, …) : un seul vocabulaire
// pour désigner les mêmes mots de passe. Sans cela, les tests ne sauraient
// viser qu'une base peuplée en mode développement — donc jamais un
// déploiement, c'est-à-dire jamais celui qui compte.
//
//   SMOKE_BASE=https://kkp.exemple.com \
//   SEED_MDP_ADMIN=… SEED_MDP_PARTENAIRE=… npm run smoke
const DEFAUTS = {
  superadmin: "superadmin123",
  admin: "admin123",
  client: "client123",
  partenaire: "partenaire123",
};

function motDePasse(role) {
  return process.env[`SEED_MDP_${role.toUpperCase()}`] || DEFAUTS[role];
}

module.exports = { motDePasse, DEFAUTS };
