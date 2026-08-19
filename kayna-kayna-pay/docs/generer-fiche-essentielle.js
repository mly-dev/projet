// Kayna Kayna Pay — fiche essentielle, 2 pages.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
} = require("docx");

const BLEU = "005CA9";
const BLEU_F = "003A70";
const GRIS = "5D7285";
const AMBRE = "9A6C00";
const ROUGE = "B3241F";
const VERT = "1B7A38";
const CLAIR = "EAF2FA";

const P = (texte, o = {}) =>
  new Paragraph({
    spacing: { after: o.after == null ? 120 : o.after, line: 276 },
    alignment: o.align,
    indent: o.indent,
    children: [
      new TextRun({
        text: texte,
        size: o.size || 20,
        bold: o.bold,
        italics: o.italics,
        color: o.color || "20344A",
        font: "Calibri",
      }),
    ],
  });

// Paragraphe à plusieurs morceaux (gras partiel)
const Pm = (morceaux, o = {}) =>
  new Paragraph({
    spacing: { after: o.after == null ? 120 : o.after, line: 276 },
    indent: o.indent,
    children: morceaux.map(
      (m) =>
        new TextRun({
          text: m.t,
          size: o.size || 20,
          bold: m.b,
          italics: m.i,
          color: m.c || "20344A",
          font: "Calibri",
        })
    ),
  });

const Titre = (texte) =>
  new Paragraph({
    spacing: { before: 210, after: 110 },
    children: [
      new TextRun({ text: texte, size: 24, bold: true, color: BLEU_F, font: "Calibri" }),
    ],
  });

const Puce = (morceaux, o = {}) =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 70, line: 276 },
    children: (Array.isArray(morceaux) ? morceaux : [{ t: morceaux }]).map(
      (m) =>
        new TextRun({
          text: m.t,
          size: 20,
          bold: m.b,
          italics: m.i,
          color: m.c || "20344A",
          font: "Calibri",
        })
    ),
  });

// Ligne de commande à recopier
const Cmd = (texte, apres) =>
  new Paragraph({
    spacing: { after: apres == null ? 40 : apres, line: 250 },
    shading: { type: ShadingType.CLEAR, fill: "F2F6FA" },
    children: [new TextRun({ text: "  " + texte, font: "Consolas", size: 14, color: "20344A" })],
  });

const SANS_BORD = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
};

// Encadré pleine largeur
function Encadre(lignes, fond, couleurTitre, titre) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    borders: SANS_BORD,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: fond },
            margins: { top: 130, bottom: 130, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 70 },
                children: [
                  new TextRun({ text: titre, size: 17, bold: true, color: couleurTitre, font: "Calibri", characterSpacing: 20 }),
                ],
              }),
              ...lignes,
            ],
          }),
        ],
      }),
    ],
  });
}

// Tableau à 2 ou 3 colonnes
function Tab(entetes, lignes, largeurs) {
  const enTete = new TableRow({
    tableHeader: true,
    children: entetes.map((h, i) =>
      new TableCell({
        width: { size: largeurs[i], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: CLAIR },
        margins: { top: 90, bottom: 90, left: 140, right: 140 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: h, size: 17, bold: true, color: BLEU_F, font: "Calibri" })],
          }),
        ],
      })
    ),
  });
  const corps = lignes.map(
    (l) =>
      new TableRow({
        children: l.map((c, i) =>
          new TableCell({
            width: { size: largeurs[i], type: WidthType.DXA },
            margins: { top: 90, bottom: 90, left: 140, right: 140 },
            children: [
              new Paragraph({
                spacing: { line: 250 },
                children: [
                  new TextRun({
                    text: typeof c === "string" ? c : c.t,
                    size: 18,
                    bold: typeof c === "object" && c.b,
                    color: (typeof c === "object" && c.c) || "20344A",
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          })
        ),
      })
  );
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: largeurs,
    rows: [enTete, ...corps],
  });
}

const doc = new Document({
  creator: "Kayna Kayna Pay",
  title: "Kayna Kayna Pay — l'essentiel",
  styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
  sections: [
    {
      properties: {
        page: { margin: { top: 850, bottom: 560, left: 1000, right: 1000 } },
      },
      children: [
        // ---------- En-tête ----------
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: "KAYNA KAYNA PAY", size: 34, bold: true, color: BLEU_F, font: "Calibri", characterSpacing: 30 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "« Petit à petit, paye »  —  l'essentiel en 2 pages", size: 20, italics: true, color: GRIS, font: "Calibri" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLEU } },
          children: [new TextRun({ text: "", size: 4 })],
        }),

        // ---------- 1. Le projet ----------
        Titre("1.  Le projet"),
        Pm([
          { t: "Une application qui permet d'acheter un produit en le payant petit à petit par mobile money, et de le recevoir une fois qu'il est entièrement payé. ", },
          { t: "L'argent reste chez Kayna Kayna Pay jusqu'à la livraison", b: true },
          { t: " : le client est sûr de recevoir, le vendeur est sûr d'être payé." },
        ]),
        Pm([
          { t: "Revenu : une commission de 5 % incluse dans le prix affiché. Un produit à 100 000 F chez le vendeur est affiché 105 000 F." },
        ], { after: 200 }),

        // ---------- 2. Le parcours ----------
        Titre("2.  Comment ça marche (le parcours)"),
        Tab(
          ["", "Ce qui se passe"],
          [
            [{ t: "1", b: true, c: BLEU }, "Le client choisit un produit et ouvre un « portefeuille » à 0 F."],
            [{ t: "2", b: true, c: BLEU }, "Il déclare un versement (dès 100 F). L'app lui donne le numéro de dépôt et une référence unique."],
            [{ t: "3", b: true, c: BLEU }, "Il dépose par NITA / Amana / Wave, puis appuie sur « j'ai effectué le dépôt »."],
            [{ t: "4", b: true, c: BLEU }, "Le versement apparaît instantanément chez votre équipe, qui vérifie le dépôt réel et valide."],
            [{ t: "5", b: true, c: BLEU }, "Le portefeuille du client est crédité en temps réel. Au montant total : achat complété, produit remis."],
          ],
          [620, 8740]
        ),
        P("", { after: 200 }),

        // ---------- 3. Les 3 morceaux ----------
        Titre("3.  Les trois morceaux techniques"),
        Tab(
          ["Morceau", "Rôle", "Analogie"],
          [
            ["Application mobile", "Ce que voit le client", "La salle du restaurant"],
            ["Backend (le serveur)", "Toutes les règles, 36 entrées d'API", "La cuisine"],
            ["Base de données", "La mémoire, 13 tables", "Le garde-manger"],
          ],
          [2500, 4200, 2660]
        ),
        P("", { after: 100 }),
        Pm([
          { t: "Règle absolue : ", b: true },
          { t: "rien ne parle jamais directement à la base. Tout passe par le backend, qui vérifie tout — parce qu'un téléphone peut être trafiqué, un serveur non." },
        ], { after: 200 }),

        // ---------- 4. Les 3 règles d'or ----------
        Titre("4.  Les trois règles qui protègent l'argent"),
        Encadre(
          [
            Puce([{ t: "Une écriture validée ne change plus jamais. ", b: true }, { t: "Une erreur se corrige par une nouvelle ligne signée, jamais par une gomme." }]),
            Puce([{ t: "Le solde n'est jamais saisi, il est recalculé ", b: true }, { t: "depuis toutes les écritures. Un solde faux est donc réparable." }]),
            Puce([{ t: "Les interdits sont posés dans la base, pas seulement dans le code. ", b: true }, { t: "Un double versement est physiquement impossible, quoi que fasse le programme." }]),
          ],
          "F2F8FD",
          BLEU,
          "CE QUI REND LE SYSTÈME FIABLE"
        ),
        P("", { after: 200 }),

        // ---------- 5. Où on en est (page 2) ----------
        new Paragraph({ pageBreakBefore: true, spacing: { after: 0 }, children: [new TextRun({ text: "", size: 2 })] }),
        Titre("5.  Où on en est"),
        Tab(
          ["Fait", "Pas encore fait"],
          [
            [
              { t: "Application mobile — 16 écrans", c: VERT },
              { t: "Essai sur un vrai téléphone", c: ROUGE },
            ],
            [
              { t: "Backend + espace admin + espace partenaire", c: VERT },
              { t: "Photos des produits", c: ROUGE },
            ],
            [
              { t: "25 tests automatiques, tous verts", c: VERT },
              { t: "Vrais SMS (passerelle à contractualiser)", c: ROUGE },
            ],
            [
              { t: "Logo, charte graphique, pitch deck", c: VERT },
              { t: "CGU validées par un juriste", c: ROUGE },
            ],
            [
              { t: "Sécurité : double authentification admin", c: VERT },
              { t: "Consultation BCEAO/UEMOA", c: ROUGE },
            ],
          ],
          [4680, 4680]
        ),
        P("", { after: 200 }),

        // ---------- 6. Prochaines étapes ----------
        Titre("6.  Les quatre prochaines étapes"),
        Puce([{ t: "Essayer l'application sur un vrai téléphone", b: true }, { t: " — jamais fait, et tout le reste en dépend." }]),
        Puce([{ t: "Arbitrer les règles « à définir »", b: true }, { t: " : frais d'annulation, délai d'inactivité, arrondi. Elles sont la substance des CGU." }]),
        Puce([{ t: "Consultation juridique BCEAO/UEMOA", b: true }, { t: " avant toute ouverture au public." }]),
        Puce([{ t: "Contractualiser une passerelle SMS", b: true }, { t: " — sans elle, aucune inscription ni connexion admin n'est possible." }]),
        P("", { after: 120 }),
        Encadre(
          [
            Pm([
              { t: "Le logiciel n'est plus ce qui bloque. ", b: true, c: AMBRE },
              { t: "Sur les prochaines étapes, une seule relève du développement. Ce sont vos démarches, contrats et décisions de gestion qui commandent désormais le calendrier." },
            ], { after: 0 }),
          ],
          "FFF6E2",
          AMBRE,
          "À RETENIR"
        ),
        P("", { after: 110 }),

        // ---------- 7. Tester ----------
        Titre("7.  Tester l'application"),
        Pm([
          { t: "Prérequis : ", b: true },
          { t: "Node 18+, PostgreSQL installé " },
          { t: "et démarré", b: true },
          { t: ", Expo Go sur le téléphone, PC et téléphone sur le même Wi-Fi. Commandes pour Windows (cmd)." },
        ], { after: 110 }),

        Pm([{ t: "① La base de données — une seule fois", b: true, c: BLEU_F }], { after: 60 }),
        Cmd('psql -U postgres -c "CREATE USER kkp WITH PASSWORD \'kkp\' CREATEDB;"'),
        Cmd('psql -U postgres -c "CREATE DATABASE kaynakaynapay OWNER kkp;"', 110),

        Pm([{ t: "② La plateforme", b: true, c: BLEU_F }], { after: 60 }),
        Cmd("git clone -b claude/kayna-kayna-pay-presentation-gp4lgf https://github.com/mly-dev/projet.git"),
        Cmd("cd projet\\kayna-kayna-pay\\plateforme"),
        Cmd("copy .env.example .env"),
        Cmd("npm install && npm run db:migrer && npm run db:seed && npm run dev", 110),

        Pm([{ t: "③ L'application mobile — dans une 2ᵉ fenêtre", b: true, c: BLEU_F }], { after: 60 }),
        Cmd("cd projet\\kayna-kayna-pay\\mobile"),
        Cmd("copy .env.example .env"),
        Cmd("npm install && npx expo start", 110),

        Pm([
          { t: "Avant de lancer Expo : ", b: true },
          { t: "ouvrez " },
          { t: "mobile\\.env", b: true },
          { t: " et remplacez l'adresse par l'IP de votre PC (commande " },
          { t: "ipconfig", b: true },
          { t: ", ligne « Adresse IPv4 » du Wi-Fi). « localhost » ne marche pas depuis un téléphone." },
        ], { after: 70 }),
        Pm([
          { t: "Les codes SMS ", b: true },
          { t: "s'affichent dans la fenêtre de la plateforme (lignes « [SMS → +227… ] »), pas sur un vrai téléphone." },
        ], { after: 30 }),

        // ---------- Pied ----------
        new Paragraph({
          spacing: { before: 130, after: 0, line: 240 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "D7E3EE" } },
          children: [
            new TextRun({ text: "Guide détaillé et documentation technique : dossier ", size: 16, color: GRIS, font: "Calibri" }),
            new TextRun({ text: "docs/", size: 16, bold: true, color: GRIS, font: "Calibri" }),
            new TextRun({ text: " du projet.", size: 16, color: GRIS, font: "Calibri" }),
          ],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("Kayna_Kayna_Pay_Essentiel.docx", buf);
  console.log("docx écrit");
});
