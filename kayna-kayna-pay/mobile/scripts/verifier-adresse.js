// Contrôle du diagnostic d'adresse.
//
//   npm run verifier:adresse
//
// Quand la plateforme n'est pas jointe, l'écran « Configurer l'adresse du
// serveur » est le seul endroit où l'utilisateur apprend pourquoi. Un message
// approximatif — « injoignable » là où la vraie cause est « le tunnel est
// mort » ou « la plateforme est éteinte » — envoie chercher la panne au mauvais
// endroit. Ces messages méritent donc d'être tenus par des contrôles.
//
// Le fichier testé est celui de l'application, sans copie : on l'importe après
// avoir remplacé le seul module absent hors React Native (AsyncStorage). Le
// réseau est simulé, aucun serveur n'est nécessaire.

const fs = require("fs");
const path = require("path");

const SOURCE = path.join(__dirname, "..", "src", "api", "client.js");

(async () => {
  const brut = fs.readFileSync(SOURCE, "utf8");
  const memoire = new Map();
  const source = brut.replace(
    /^import AsyncStorage.*$/m,
    "const AsyncStorage = globalThis.__stockage;"
  );
  if (source === brut) {
    console.log("\n  [FAUX] L'import d'AsyncStorage a changé : ce contrôle ne teste plus rien.\n");
    process.exit(1);
  }
  globalThis.__stockage = {
    getItem: async (c) => (memoire.has(c) ? memoire.get(c) : null),
    setItem: async (c, v) => void memoire.set(c, v),
    removeItem: async (c) => void memoire.delete(c),
    multiRemove: async (cs) => cs.forEach((c) => memoire.delete(c)),
  };

  const module = await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );

  let echecs = 0;
  const critere = (intitule, obtenu, attendu) => {
    const bon = obtenu === attendu;
    if (!bon) echecs++;
    console.log(`  ${bon ? "[OK]  " : "[FAUX]"} ${intitule}`);
    if (!bon) {
      console.log(`         attendu : ${attendu}`);
      console.log(`         obtenu  : ${obtenu}`);
    }
  };

  // --- Normalisation ------------------------------------------------------
  console.log("\n  Normalisation de la saisie");
  console.log("  " + "-".repeat(66));
  const n = module.normaliserAdresse;
  critere("Une adresse IP nue reçoit le schéma et le port", n("192.168.1.231"), "http://192.168.1.231:3000");
  critere("Une adresse de tunnel est gardée telle quelle",
    n("https://topics-determination-call-accepts.trycloudflare.com"),
    "https://topics-determination-call-accepts.trycloudflare.com");
  critere("La barre finale est retirée", n("https://exemple.test/"), "https://exemple.test");
  critere("Les espaces collés sont retirés", n("  192.168.1.231  "), "http://192.168.1.231:3000");
  critere("Une saisie qui n'est pas une adresse est refusée", n("pas une adresse !!"), null);
  critere("Une saisie vide est refusée", n("   "), null);

  // --- Diagnostic ---------------------------------------------------------
  // Chaque cas rejoue une panne vécue pendant les essais à distance.
  console.log("\n  Diagnostic des pannes");
  console.log("  " + "-".repeat(66));

  const TUNNEL = "https://topics-determination-call-accepts.trycloudflare.com";
  const reponses = new Map();
  globalThis.fetch = async (url, options) => {
    const prevu = reponses.get(url);
    if (!prevu) throw new Error("Aucune réponse prévue pour " + url);
    if (prevu.pendaison) {
      // Reproduit un serveur qui ne répond jamais : seul l'abandon y met fin.
      return new Promise((_, rejeter) => {
        options.signal.addEventListener("abort", () => {
          const e = new Error("Aborted");
          e.name = "AbortError";
          rejeter(e);
        });
      });
    }
    if (prevu.reseau) throw new TypeError("Network request failed");
    return {
      ok: prevu.statut >= 200 && prevu.statut < 300,
      status: prevu.statut,
      json: async () => {
        if (prevu.html) throw new SyntaxError("Unexpected token < in JSON");
        return prevu.corps;
      },
    };
  };

  const essai = async (adresse, prevu, delai = 50) => {
    reponses.set(adresse + "/api/categories", prevu);
    return module.testerAdresse(adresse, delai);
  };

  let r = await essai(TUNNEL, { statut: 530 });
  critere("Tunnel éteint (530) → l'adresse a changé, il faut la nouvelle", r.erreur,
    "Le tunnel n'est plus actif. Demandez la nouvelle adresse : elle change à chaque redémarrage.");

  r = await essai(TUNNEL, { statut: 502 });
  critere("Tunnel debout mais plateforme arrêtée (502) → démarrer la plateforme", r.erreur,
    "Le tunnel fonctionne, mais la plateforme n'est pas démarrée sur l'ordinateur.");

  r = await essai("http://192.168.1.231:3000", { statut: 502 });
  critere("Le même 502 en réseau local ne parle pas de tunnel", r.erreur,
    "Le serveur ne répond pas encore. Attendez qu'il ait fini de démarrer.");

  r = await essai("https://exemple.test", { statut: 404 });
  critere("Un site quelconque (404) → ce n'est pas la plateforme", r.erreur,
    "Ce n'est pas une plateforme Kayna Kayna Pay.");

  r = await essai("https://exemple.test", { statut: 200, html: true });
  critere("Une page HTML servie en 200 n'est pas prise pour la plateforme", r.erreur,
    "Cette adresse répond, mais ce n'est pas la plateforme.");

  r = await essai("https://exemple.test", { statut: 200, corps: { autre: true } });
  critere("Un JSON sans catégories est refusé", r.erreur,
    "Ce n'est pas une plateforme Kayna Kayna Pay.");

  r = await essai(TUNNEL, { pendaison: true });
  critere("Silence derrière un tunnel → l'ordinateur est éteint ou en veille", r.erreur,
    "Aucune réponse. L'ordinateur qui héberge la plateforme est peut-être éteint ou en veille.");

  r = await essai("http://192.168.1.231:3000", { pendaison: true });
  critere("Silence en réseau local → question de Wi-Fi", r.erreur,
    "Aucune réponse. Vérifiez que le téléphone et l'ordinateur sont sur le même Wi-Fi.");

  r = await essai("http://192.168.1.99:3000", { reseau: true });
  critere("Refus immédiat → serveur injoignable", r.erreur,
    "Serveur injoignable à cette adresse.");

  r = await essai(TUNNEL, { statut: 200, corps: { categories: [1, 2, 3, 4, 5, 6] } });
  critere("Une plateforme joignable est acceptée", r.ok, true);
  critere("… et le nombre de catégories est rapporté", r.categories, 6);

  r = await module.testerAdresse("pas une adresse !!");
  critere("Une adresse invalide est écartée sans requête", r.erreur, "Adresse invalide.");

  console.log("\n  " + "-".repeat(66));
  if (echecs === 0) {
    console.log("  Tous les diagnostics sont exacts.\n");
    process.exit(0);
  }
  console.log(`  ${echecs} contrôle(s) en échec.\n`);
  process.exit(1);
})();
