// Contrôle de eas.json, avec le validateur d'EAS lui-même.
//
//   npm run verifier:eas
//
// Ce fichier n'est lu qu'au moment de construire, sur la machine de celui qui
// construit. Une faute s'y découvre donc au pire moment : après l'installation
// des outils et la connexion au compte Expo. Une première version portait un
// commentaire « // » sous « build » — refusé, puisque tout ce qui s'y trouve
// doit être un profil.
//
// Le validateur est celui d'eas-cli. S'il n'est pas installé, le contrôle
// s'abstient plutôt que de faire semblant.
const path = require("path");

const RACINE = path.join(__dirname, "..");
const PROFILS = ["essai", "production"];

let json;
try {
  json = require(path.join(RACINE, "node_modules", "@expo", "eas-json"));
} catch (e) {
  console.log("\n  eas-cli n'est pas installé — contrôle ignoré.");
  console.log("  Pour l'activer :  npm install -g eas-cli\n");
  process.exit(0);
}

(async () => {
  const accesseur = json.EasJsonAccessor.fromProjectPath(RACINE);
  let problemes = 0;

  console.log("\n  Contrôle de eas.json");
  console.log("  " + "-".repeat(52));

  for (const profil of PROFILS) {
    try {
      const p = await json.EasJsonUtils.getBuildProfileAsync(accesseur, "android", profil);
      const adresse = (p.env || {}).EXPO_PUBLIC_API_URL || "(non renseignée)";
      console.log(`  [OK]   ${profil.padEnd(12)} ${String(p.buildType).padEnd(11)} ${adresse}`);

      if (!(p.env || {}).EXPO_PUBLIC_API_URL) {
        console.log("         ⚠  Sans adresse, l'application construite ne joindra aucun serveur.");
        problemes++;
      } else if (profil === "production" && adresse.startsWith("http://")) {
        console.log("         ⚠  Adresse en http:// dans le profil de production.");
        problemes++;
      } else if (profil === "production" && adresse.includes("remplacez-par")) {
        console.log("         ⚠  Adresse de production encore à renseigner.");
      }
    } catch (e) {
      console.log(`  [FAUX] ${profil} — ${e.message.split("\n")[0]}`);
      problemes++;
    }
  }

  console.log("  " + "-".repeat(52));
  if (problemes === 0) {
    console.log("  eas.json est valide.\n");
    process.exit(0);
  }
  console.log(`  ${problemes} point(s) à régler avant de construire.\n`);
  process.exit(1);
})();
