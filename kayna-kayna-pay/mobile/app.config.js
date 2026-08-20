// Configuration de l'application.
//
// Ce fichier remplace app.json parce qu'une décision doit être prise au moment
// de la construction, et non écrite une fois pour toutes : l'autorisation du
// trafic en clair.
//
// Depuis Android 9, une application refuse les adresses http:// — seul le
// https:// passe. Expo Go y échappe (c'est lui qui porte l'autorisation), si
// bien qu'une application qui marche parfaitement dans Expo Go affiche
// « Connexion impossible » dès qu'on en fait un APK. C'est le premier piège de
// toute première construction, et il ne se voit qu'une fois l'APK installé.
//
// La règle appliquée ici : le trafic en clair est autorisé si, et seulement
// si, l'adresse du serveur est en http://. Un APK d'essai pointant vers le PC
// du bureau fonctionne donc ; un APK de production pointant vers un serveur
// https:// n'emporte aucune permission superflue.

const ADRESSE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const enClair = ADRESSE.startsWith("http://");

if (enClair) {
  console.warn(
    `\n  ⚠  Trafic en clair autorisé — le serveur est en http:// (${ADRESSE}).\n` +
      "     Acceptable pour un essai sur votre réseau local.\n" +
      "     Pour une diffusion réelle, déployez la plateforme en https://.\n"
  );
}

module.exports = {
  expo: {
    name: "Kayna Kayna Pay",
    slug: "kayna-kayna-pay",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/icone.png",
    splash: {
      image: "./assets/logo-marque-blanc.png",
      resizeMode: "contain",
      backgroundColor: "#003A70",
    },
    android: {
      package: "ne.kaynakaynapay.app",
      // À incrémenter à chaque envoi sur le Play Store ; sans importance pour
      // un APK installé à la main.
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/icone-adaptative.png",
        backgroundColor: "#005CA9",
      },
      permissions: ["INTERNET"],
    },
    ios: {
      bundleIdentifier: "ne.kaynakaynapay.app",
      buildNumber: "1",
      supportsTablet: false,
      infoPlist: {
        // Équivalent iOS de l'autorisation ci-dessous.
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: enClair },
      },
    },
    // L'autorisation du trafic en clair passe par ce greffon, et non par une
    // clé de la section « android » : celle-ci est ignorée et n'atteint jamais
    // le manifeste — vérifié, le fichier généré n'en portait aucune trace.
    plugins: [
      [
        "expo-build-properties",
        { android: { usesCleartextTraffic: enClair } },
      ],
    ],
    extra: {
      // Repris dans l'application pour afficher, en cas de panne, vers quel
      // serveur cet exemplaire a été construit.
      adresseServeur: ADRESSE,
    },
  },
};
