// Prépare les variables d'environnement d'une mise en ligne.
//
//   npm run preparer
//
// Un secret de jetons doit être imprévisible. Choisi à la main, il ne l'est
// jamais : on tape ce qui vient, on réutilise un mot connu. Celui-ci vient du
// générateur cryptographique du système, comme il se doit.
//
// Rien n'est écrit sur le disque : la sortie se recopie dans le tableau de bord
// de l'hébergeur. Un secret rangé dans un fichier finit par être versionné.
const crypto = require("crypto");
const { LONGUEUR_MINIMALE_SECRET } = require("../lib/config");

const secret = crypto.randomBytes(48).toString("base64url");

const cadre = (t) => {
  const l = "─".repeat(70);
  return `┌${l}┐\n│ ${t.padEnd(68)} │\n└${l}┘`;
};

console.log("\n" + cadre("Variables d'environnement à définir chez l'hébergeur"));
console.log(`
  JWT_SECRET=${secret}
  NODE_ENV=production
  MEDIAS_DIR=/data/medias
  TRUST_PROXY=1
  SMS_FOURNISSEUR=console
`);

console.log(`  Fournies par l'hébergeur, à ne pas inventer :

  DATABASE_URL   l'adresse de la base qu'il a créée
  PORT           souvent imposé ; le serveur le lit tout seul
`);

console.log(`  À ajouter seulement si la base refuse son certificat :

  DATABASE_SSL=no-verify
`);

console.log(`  Ce que fait chacune :

  JWT_SECRET       signe les jetons de session. Le changer déconnecte tout le
                   monde — sans autre dommage. À garder secret : qui l'a peut
                   se fabriquer un jeton d'administrateur. ${secret.length} caractères,
                   pour un minimum exigé de ${LONGUEUR_MINIMALE_SECRET}.

  NODE_ENV         active le mode production : cookies « Secure », contrôles
                   de configuration bloquants, pages précompilées.

  MEDIAS_DIR       où sont écrites les photos des produits. Doit pointer sur un
                   volume persistant, sinon elles disparaissent au déploiement
                   suivant.

  TRUST_PROXY      nombre de proxys devant la plateforme. 1 chez un hébergeur,
                   sans quoi la limitation anti-abus voit tout le trafic venir
                   d'une seule adresse — la sienne.

  SMS_FOURNISSEUR  « console » tant qu'aucune passerelle n'est contractualisée :
                   les codes s'affichent dans les journaux de l'hébergeur.
`);

console.log("  Ce secret n'est pas enregistré. Recopiez-le maintenant.\n");
