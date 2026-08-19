// Kayna Kayna Pay — L'essentiel.
// La fiche courte : ce qu'il faut savoir et savoir faire, sans détour.
// Même mise en page que « Comprendre Kayna Kayna Pay » et le guide
// d'utilisation : les trois documents forment une collection.
const fs = require("fs");
const path = require("path");
const { Document, Packer } = require("docx");
const M = require("./mise-en-page.cjs");
const { C, P, Pm, H1, H2, H3, Puce, Etape, Cmd, Encadre, Tab, Espace, Couverture, sections } = M;

const LOGO = process.argv[3] || path.join(__dirname, "logo-couv.png");

// Les sections s'enchaînent sans saut de page : c'est une fiche, pas un manuel.
const T1 = (t) => H1(t, { nouvellePage: false });

const corps = [
  // ══════════════════════ 1 ══════════════════════
  H1("1.  Le projet"),
  Pm([
    { t: "Une application qui permet d'" },
    { t: "acheter un produit en le payant petit à petit", b: true },
    { t: " par mobile money, et de le recevoir une fois qu'il est entièrement payé. L'argent reste chez Kayna Kayna Pay jusqu'à la remise : le client est sûr de recevoir, le vendeur est sûr d'être payé." },
  ]),
  Pm([
    { t: "Revenu : une " },
    { t: "commission de 5 %", b: true },
    { t: " déjà comprise dans le prix affiché. Un produit à 100 000 F chez le vendeur est affiché 105 000 F — rien ne s'ajoute à la fin." },
  ]),

  // ══════════════════════ 2 ══════════════════════
  T1("2.  Le parcours, en cinq temps"),
  Etape(1, "Le client choisit un produit et ouvre un « portefeuille » à 0 F. Le prix est figé à cet instant."),
  Etape(2, "Il déclare un versement, dès 100 F. L'application lui donne le numéro de dépôt et une référence unique."),
  Etape(3, "Il dépose par NITA, Amana ou Wave, en indiquant la référence, puis appuie sur « J'ai effectué le dépôt »."),
  Etape(4, "Le versement apparaît instantanément dans la file de votre équipe, qui vérifie le dépôt réel et valide au montant reçu."),
  Etape(5, "Le portefeuille est crédité en temps réel. Au montant total : achat complété, produit remis, partenaire réglé."),

  // ══════════════════════ 3 ══════════════════════
  T1("3.  Les trois morceaux"),
  Tab(
    ["Morceau", "Rôle", "Analogie"],
    [
      [{ t: "Application mobile", b: true }, "Ce que voit le client — 16 écrans", "La salle du restaurant"],
      [{ t: "Serveur", b: true }, "Toutes les règles — 37 entrées d'API", "La cuisine"],
      [{ t: "Base de données", b: true }, "La mémoire — 14 tables", "Le garde-manger"],
    ],
    [2400, 4400, 2560]
  ),
  Espace(160),
  Encadre("attention", "La règle absolue", [
    P(
      "Rien ne parle jamais directement à la base. Tout passe par le serveur, qui vérifie tout — parce qu'un téléphone peut être trafiqué, un serveur non.",
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 4 ══════════════════════
  T1("4.  Les trois règles qui protègent l'argent"),
  Encadre("retenir", "Ce qui rend le système fiable", [
    Pm(
      [
        { t: "1.  Une écriture validée ne change plus jamais.", b: true },
        { t: " Une erreur se corrige par une nouvelle ligne signée, jamais par une gomme." },
      ],
      { after: 70 }
    ),
    Pm(
      [
        { t: "2.  Le solde n'est jamais saisi, il est recalculé", b: true },
        { t: " depuis toutes les écritures. Un solde faux est donc réparable." },
      ],
      { after: 70 }
    ),
    Pm(
      [
        { t: "3.  Les interdits sont posés dans la base", b: true },
        { t: ", pas seulement dans le code. Un double versement est physiquement impossible, quoi que fasse le programme." },
      ],
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 5 ══════════════════════
  T1("5.  Où on en est"),
  Tab(
    ["Fait", "Pas encore fait"],
    [
      ["Application mobile — 16 écrans, design abouti", "Essai sur un vrai téléphone, par vous"],
      ["Serveur, espace d'administration, espace partenaire", "Photos des produits"],
      ["25 critères d'acceptation automatiques, tous verts", "Vrais SMS — passerelle à contractualiser"],
      ["Parcours client vérifié écran par écran", "Conditions générales validées par un juriste"],
      ["Logo, charte graphique, présentation", "Consultation BCEAO / UEMOA"],
      ["Double authentification des administrateurs", "Notifications hors application"],
    ],
    [4680, 4680]
  ),

  // ══════════════════════ 6 ══════════════════════
  T1("6.  Les quatre prochaines étapes"),
  Puce([
    { t: "Essayer l'application sur un vrai téléphone", b: true },
    { t: " — jamais fait par vous, et tout le reste en dépend." },
  ]),
  Puce([
    { t: "Arbitrer les règles « à définir »", b: true },
    { t: " : frais d'annulation, délai d'inactivité, arrondi. Elles sont la substance des conditions générales." },
  ]),
  Puce([
    { t: "Consultation juridique BCEAO / UEMOA", b: true },
    { t: " avant toute ouverture au public." },
  ]),
  Puce([
    { t: "Contractualiser une passerelle SMS", b: true },
    { t: " — sans elle, aucune inscription ni connexion administrateur n'est possible." },
  ]),
  Espace(180),
  Encadre("retenir", "À retenir", [
    P(
      "Le logiciel n'est plus ce qui bloque. Sur ces quatre étapes, une seule relève du développement. Ce sont vos démarches, contrats et décisions de gestion qui commandent désormais le calendrier.",
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 7 ══════════════════════
  H1("7.  Installer et tester"),
  Pm([
    { t: "Commandes pour Windows (invite de commandes " },
    { t: "cmd", m: true },
    { t: "). Le PC et le téléphone doivent être sur le même Wi-Fi. Guide détaillé pas à pas : " },
    { t: "docs/guide-essai.md", m: true },
    { t: "." },
  ]),

  H2("① Installer les quatre outils"),
  Puce([{ t: "Node.js", b: true }, { t: " (version LTS) — nodejs.org" }]),
  Puce([{ t: "Git", b: true }, { t: " — git-scm.com" }]),
  Puce([{ t: "Expo Go", b: true }, { t: " sur le téléphone — Play Store ou App Store" }]),
  Puce([
    { t: "PostgreSQL 17", b: true },
    { t: " — enterprisedb.com/downloads/postgres-postgresql-downloads, colonne Windows x86-64. Notez le mot de passe demandé pour l'utilisateur « postgres », gardez le port 5432, décochez Stack Builder." },
  ]),
  Espace(60),
  P("Puis, dans cmd, pour que les commandes psql soient reconnues :", { after: 60 }),
  Cmd("set PATH=%PATH%;C:\\Program Files\\PostgreSQL\\17\\bin"),

  H2("② Créer la base — une seule fois"),
  Cmd("psql -U postgres -c \"CREATE USER kkp WITH PASSWORD 'kkp' CREATEDB;\""),
  Cmd("psql -U postgres -c \"CREATE DATABASE kaynakaynapay OWNER kkp;\""),

  H2("③ La plateforme"),
  Cmd("git clone -b claude/kayna-kayna-pay-presentation-gp4lgf https://github.com/mly-dev/projet.git"),
  Cmd("cd projet\\kayna-kayna-pay\\plateforme"),
  Cmd("copy .env.example .env"),
  Cmd("npm install"),
  Cmd("npm run verifier"),
  Cmd("npm run db:migrer && npm run db:seed && npm run dev"),

  H2("④ L'application mobile — dans une deuxième fenêtre"),
  Cmd("cd projet\\kayna-kayna-pay\\mobile"),
  Cmd("copy .env.example .env"),
  Espace(50),
  Pm(
    [
      { t: "Ouvrez ce fichier " },
      { t: ".env", m: true },
      { t: " et remplacez l'adresse par l'IP du PC, obtenue avec " },
      { t: "ipconfig", m: true },
      { t: " (celle de votre carte Wi-Fi ou Ethernet, pas une adresse 172.x ni 192.168.56.x). Puis :" },
    ],
    { after: 60 }
  ),
  Cmd("npm install"),
  Cmd("npx expo start"),
  Espace(60),
  P("Scannez le QR code avec Expo Go. Si le QR affiche 127.0.0.1, forcez l'adresse :", { after: 60 }),
  Cmd("set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.231"),

  Espace(200),
  Encadre("astuce", "En cas de blocage", [
    Pm(
      [
        { t: "npm run verifier", m: true, b: true },
        { t: " contrôle Node, les dépendances, le fichier .env, PostgreSQL, les migrations et le jeu de démonstration, puis affiche la commande exacte qui répare ce qui manque." },
      ],
      { after: 70 }
    ),
    P(
      "Les codes SMS s'affichent dans la fenêtre de la plateforme, encadrés, et non sur un vrai téléphone : la passerelle réelle n'est pas encore contractualisée.",
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 8 ══════════════════════
  H1("8.  Les comptes de démonstration"),
  Pm([
    { t: "Créés par " },
    { t: "npm run db:seed", m: true },
    { t: ". À ne jamais reprendre en production." },
  ]),
  Espace(80),
  Tab(
    ["Rôle", "Identifiant", "Mot de passe", "Où se connecter"],
    [
      [{ t: "Client", b: true }, { t: "+22791111111", m: true }, { t: "client123", m: true }, "Application mobile"],
      [{ t: "Administrateur", b: true }, { t: "+22790000010", m: true }, { t: "admin123", m: true }, "/admin (code SMS exigé)"],
      [{ t: "Super-administrateur", b: true }, { t: "+22790000000", m: true }, { t: "superadmin123", m: true }, "/admin (code SMS exigé)"],
      [{ t: "Partenaire", b: true }, { t: "+22792000001", m: true }, { t: "partenaire123", m: true }, "/partenaire"],
    ],
    [2300, 2300, 2200, 2560]
  ),
  Espace(180),
  Encadre("attention", "Le code SMS des administrateurs", [
    P(
      "Le mot de passe seul n'ouvre aucune session d'administration. Un code à six chiffres est envoyé — en développement, il s'affiche dans la fenêtre de la plateforme, dans un cadre. N'inventez pas un code au hasard : il sera refusé.",
      { after: 0 }
    ),
  ]),

  Espace(240),
  Pm(
    [{ t: "« Kayan si djineh koy yan gandji » — faire petit n'empêche pas d'avancer.", i: true, c: C.gris }],
    { size: 19, align: "center" }
  ),
];

const doc = new Document({
  creator: "Kayna Kayna Pay",
  title: "Kayna Kayna Pay — L'essentiel",
  description: "Ce qu'il faut savoir et savoir faire pour essayer Kayna Kayna Pay.",
  styles: { default: { document: { run: { font: M.TEXTE, size: M.T.corps } } } },
  numbering: { config: [] },
  sections: sections({
    titreDoc: "L'essentiel",
    couverture: Couverture({
      logo: LOGO,
      titre: "L'essentiel",
      sousTitre: "« Petit à petit, paye »",
      description:
        "La fiche courte : ce qu'est Kayna Kayna Pay, comment le projet est construit, où il en est, et comment l'installer pour l'essayer soi-même en une demi-heure.",
      meta: [
        ["Public", "Porteur du projet et proches collaborateurs"],
        ["Version", "1.1 — août 2026"],
        ["Complément", "Comprendre Kayna Kayna Pay · Guide d'utilisation"],
      ],
    }),
    corps,
  }),
});

Packer.toBuffer(doc).then((buf) => {
  const sortie = process.argv[2] || "Kayna_Kayna_Pay_Essentiel.docx";
  fs.writeFileSync(sortie, buf);
  console.log("écrit :", sortie);
});
