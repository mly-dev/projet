// Lecture et contrôle de la configuration, en un seul endroit.
//
// Tant que la plateforme tournait sur un PC de bureau, ses réglages de
// démonstration étaient sans conséquence : personne d'autre ne pouvait
// l'atteindre. Sur un serveur public, chacun d'eux devient une porte. Un
// secret de jetons laissé à sa valeur d'exemple permet à n'importe qui de
// fabriquer un jeton d'administrateur — la base n'y peut rien, la signature
// est valide.
//
// D'où la règle appliquée ici, qui est la norme du métier : en production, une
// configuration dangereuse **empêche le démarrage**. Un serveur qui refuse de
// démarrer se remarque tout de suite ; un serveur ouvert à tous ne se remarque
// qu'après.
//
// Hors production, les mêmes contrôles ne font qu'avertir : le développement
// doit rester sans friction.

const path = require("path");

const PRODUCTION = process.env.NODE_ENV === "production";

// Valeurs d'exemple qui ont circulé dans le dépôt et la documentation. Aucune
// ne doit survivre à une mise en ligne.
const SECRETS_D_EXEMPLE = [
  "changez-moi-en-production",
  "kkp-dev-secret-a-changer",
  "secret",
  "changeme",
];

const LONGUEUR_MINIMALE_SECRET = 32;

function estLocale(url) {
  return /@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal|postgres|db)[:/]/i.test(url);
}

// TLS de la base de données.
//
// Les hébergeurs de PostgreSQL imposent le chiffrement, mais tous ne présentent
// pas un certificat vérifiable : Render et Heroku signent le leur. La vérification
// reste donc active par défaut — refuser un certificat inconnu est le bon
// réflexe — et DATABASE_SSL=no-verify sert d'échappatoire documentée, employée
// en connaissance de cause.
function sslBase(url) {
  const mode = String(process.env.DATABASE_SSL || "").toLowerCase();
  if (mode === "off" || mode === "false") return false;
  if (mode === "no-verify") return { rejectUnauthorized: false };
  if (mode === "require" || mode === "true") return { rejectUnauthorized: true };
  if (/[?&]sslmode=/i.test(url)) return undefined; // l'URL décide ; pg l'applique
  return estLocale(url) ? false : { rejectUnauthorized: true };
}

// Emplacement des photos. Dans un conteneur, tout ce qui n'est pas sur un
// volume disparaît au déploiement suivant : les photos des produits seraient
// perdues à chaque mise à jour, sans erreur ni trace.
function racineMedias() {
  return path.resolve(process.env.MEDIAS_DIR || path.join(process.cwd(), "medias"));
}

function mediasSontEphemeres() {
  if (!PRODUCTION) return false;
  const racine = racineMedias();
  const application = path.resolve(process.cwd());
  return racine === application || racine.startsWith(application + path.sep);
}

function controler() {
  const erreurs = [];
  const avertissements = [];
  const secret = process.env.JWT_SECRET || "";
  const url = process.env.DATABASE_URL || "";

  const grave = PRODUCTION ? erreurs : avertissements;

  if (!secret) {
    grave.push([
      "JWT_SECRET n'est pas défini.",
      "Sans secret propre, les jetons de session sont signés avec une valeur",
      "publiée dans le dépôt : n'importe qui peut s'en fabriquer un d'administrateur.",
      "Tirez-en un au hasard :   npm run preparer",
    ]);
  } else if (SECRETS_D_EXEMPLE.includes(secret.trim().toLowerCase())) {
    grave.push([
      "JWT_SECRET est encore la valeur d'exemple.",
      "Elle figure dans le dépôt, donc elle n'est un secret pour personne.",
      "Tirez-en un au hasard :   npm run preparer",
    ]);
  } else if (secret.length < LONGUEUR_MINIMALE_SECRET) {
    grave.push([
      `JWT_SECRET ne fait que ${secret.length} caractères (minimum ${LONGUEUR_MINIMALE_SECRET}).`,
      "Un secret court se retrouve par force brute hors ligne, sans toucher au serveur.",
      "Tirez-en un au hasard :   npm run preparer",
    ]);
  }

  if (!url) {
    grave.push([
      "DATABASE_URL n'est pas défini.",
      "L'hébergeur fournit cette adresse avec la base de données qu'il crée.",
    ]);
  }

  if (mediasSontEphemeres()) {
    avertissements.push([
      "Les photos sont écrites dans le dossier de l'application.",
      `  ${racineMedias()}`,
      "Sur un hébergeur, ce dossier est recréé vide à chaque déploiement :",
      "toutes les photos de produits disparaîtront à la prochaine mise à jour.",
      "Montez un volume et pointez MEDIAS_DIR dessus (par exemple /data/medias).",
    ]);
  }

  if (PRODUCTION && (process.env.SMS_FOURNISSEUR || "console") === "console") {
    avertissements.push([
      "Aucune passerelle SMS : les codes de connexion ne partent pas.",
      "Ils s'affichent uniquement dans les journaux du serveur, qu'il faut donc",
      "garder ouverts pour relayer les codes à la main pendant les essais.",
    ]);
  }

  return { erreurs, avertissements };
}

function bloc(titre, entrees, marque) {
  const lignes = [``, `  ${marque} ${titre}`, ``];
  for (const entree of entrees) {
    lignes.push(`   • ${entree[0]}`);
    for (const suite of entree.slice(1)) lignes.push(`     ${suite}`);
    lignes.push(``);
  }
  return lignes.join("\n");
}

// Appelée au démarrage du serveur, avant d'écouter sur le port.
function controlerOuArreter() {
  const { erreurs, avertissements } = controler();

  if (avertissements.length) {
    console.warn(bloc("À savoir", avertissements, "⚠"));
  }
  if (erreurs.length) {
    console.error(bloc("Démarrage refusé — configuration incomplète", erreurs, "✗"));
    console.error("  Le serveur ne démarre pas tant que ces points ne sont pas réglés.\n");
    process.exit(1);
  }
}

// Résumé affiché au démarrage : savoir sur quoi tourne le serveur évite de
// chercher une panne dans le code alors que la configuration en est la cause.
function resume() {
  const url = process.env.DATABASE_URL || "(non défini)";
  return [
    `  environnement : ${PRODUCTION ? "production" : "développement"}`,
    `  base          : ${url.replace(/:\/\/([^:]+):[^@]*@/, "://$1:****@")}`,
    `  photos        : ${racineMedias()}`,
    `  SMS           : ${process.env.SMS_FOURNISSEUR || "console"}`,
  ].join("\n");
}

module.exports = {
  PRODUCTION,
  SECRETS_D_EXEMPLE,
  LONGUEUR_MINIMALE_SECRET,
  estLocale,
  sslBase,
  racineMedias,
  mediasSontEphemeres,
  controler,
  controlerOuArreter,
  resume,
};
