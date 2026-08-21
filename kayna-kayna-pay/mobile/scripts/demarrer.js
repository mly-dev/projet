// Démarre Expo en visant la plateforme, sans avoir à chercher son adresse.
//
//   npm run essai
//
// Dans Expo Go, l'application cherche la plateforme à l'adresse inscrite au
// démarrage. Sans rien, c'est « localhost » — c'est-à-dire le téléphone
// lui-même, où rien n'écoute. L'application affiche alors « Connexion
// impossible » alors que la plateforme tourne parfaitement sur le PC : la
// panne la plus déroutante de toutes, parce que les deux moitiés vont bien.
//
// Ce script trouve l'adresse du PC sur le réseau local, vérifie que la
// plateforme y répond vraiment, puis lance Expo avec cette adresse. Le QR
// affiché mène donc à une application déjà correctement réglée.
//
//   npm run essai -- --tunnel        si le Wi-Fi isole les appareils
//   ADRESSE=192.168.1.50 npm run essai   pour imposer une adresse

const os = require("os");
const { spawn } = require("child_process");

const PORT_PLATEFORME = Number(process.env.PORT_PLATEFORME || 3000);

// Les plages privées, par ordre de vraisemblance pour un réseau domestique.
// Une machine a souvent plusieurs cartes — Wi-Fi, Ethernet, et les cartes
// virtuelles de Docker ou de WSL, qui ne mènent nulle part depuis un téléphone.
const RANGS = [
  [/^192\.168\./, 0],
  [/^10\./, 1],
  [/^172\.(1[6-9]|2\d|3[01])\./, 2],
];

function rang(adresse) {
  for (const [motif, r] of RANGS) if (motif.test(adresse)) return r;
  return 9;
}

// Les cartes virtuelles portent des noms reconnaissables ; on les repousse en
// fin de liste plutôt que de les exclure, au cas où ce serait la seule.
function penalite(nom) {
  return /docker|wsl|vethernet|vmware|virtualbox|hyper-v|loopback|bluetooth/i.test(nom) ? 10 : 0;
}

function adressesLocales() {
  const trouvees = [];
  const cartes = os.networkInterfaces();
  for (const [nom, liste] of Object.entries(cartes)) {
    for (const c of liste || []) {
      const famille = typeof c.family === "string" ? c.family : `IPv${c.family}`;
      if (famille !== "IPv4" || c.internal) continue;
      trouvees.push({ nom, adresse: c.address, score: rang(c.address) + penalite(nom) });
    }
  }
  return trouvees.sort((a, b) => a.score - b.score);
}

async function repond(adresse, delaiMs = 2500) {
  const abandon = new AbortController();
  const minuterie = setTimeout(() => abandon.abort(), delaiMs);
  try {
    const res = await fetch(`http://${adresse}:${PORT_PLATEFORME}/api/categories`, {
      signal: abandon.signal,
    });
    if (!res.ok) return false;
    const corps = await res.json();
    return Boolean(corps && Array.isArray(corps.categories));
  } catch (e) {
    return false;
  } finally {
    clearTimeout(minuterie);
  }
}

(async () => {
  const impose = process.env.ADRESSE;
  const candidates = impose ? [{ nom: "imposée", adresse: impose, score: -1 }] : adressesLocales();

  if (!candidates.length) {
    console.log("\n  ✗ Aucune adresse réseau trouvée. Le PC est-il connecté au Wi-Fi ?\n");
    process.exit(1);
  }

  console.log("\n  Recherche de la plateforme sur le réseau local…\n");

  let retenue = null;
  for (const c of candidates) {
    const ok = await repond(c.adresse);
    console.log(`    ${ok ? "✓" : "·"}  ${c.adresse.padEnd(16)} ${c.nom}`);
    if (ok && !retenue) retenue = c.adresse;
  }

  if (!retenue) {
    // On démarre quand même : l'écran « Configurer l'adresse du serveur »
    // permet de rattraper depuis le téléphone. Mais autant le dire ici.
    console.log(
      `\n  ⚠  La plateforme ne répond sur aucune de ces adresses (port ${PORT_PLATEFORME}).\n` +
        "\n     Dans une autre fenêtre :\n" +
        "         cd ..\\plateforme\n" +
        "         npm run dev\n" +
        "\n     Expo démarre quand même — vous pourrez régler l'adresse depuis\n" +
        "     l'application, écran d'accueil → « Configurer l'adresse du serveur ».\n"
    );
    retenue = candidates[0].adresse;
  } else {
    console.log(`\n  ✓ Plateforme jointe. L'application visera http://${retenue}:${PORT_PLATEFORME}\n`);
  }

  console.log("  Le téléphone doit être sur le même Wi-Fi que ce PC.");
  console.log("  Scannez le QR avec Expo Go (Android) ou l'appareil photo (iPhone).\n");

  const arguments_ = process.argv.slice(2);
  const expo = spawn("npx", ["expo", "start", ...arguments_], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: `http://${retenue}:${PORT_PLATEFORME}`,
    },
  });
  expo.on("exit", (code) => process.exit(code === null ? 0 : code));
})();
