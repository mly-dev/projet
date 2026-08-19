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
    spacing: { before: 175, after: 95 },
    children: [
      new TextRun({ text: texte, size: 24, bold: true, color: BLEU_F, font: "Calibri" }),
    ],
  });

const Puce = (morceaux, o = {}) =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 58, line: 270 },
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
            margins: { top: 110, bottom: 110, left: 180, right: 180 },
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
        margins: { top: 72, bottom: 72, left: 140, right: 140 },
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
            margins: { top: 72, bottom: 72, left: 140, right: 140 },
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
        page: { margin: { top: 850, bottom: 620, left: 1000, right: 1000 } },
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
        Titre("7.  Installer et tester"),
        Pm([
          { t: "Commandes pour Windows (cmd). PC et téléphone sur le " },
          { t: "même Wi-Fi", b: true },
          { t: ". Guide détaillé pas à pas : " },
          { t: "docs/guide-essai.md", b: true },
          { t: "." },
        ], { after: 100 }),

        Pm([{ t: "\u2460  Installer les 4 outils", b: true, c: BLEU_F }], { after: 55 }),
        Pm([
          { t: "Node.js (version LTS) — nodejs.org   ·   Git — git-scm.com   ·   Expo Go sur le téléphone (Play Store)" },
        ], { size: 17, after: 40 }),
        Pm([
          { t: "PostgreSQL 17", b: true },
          { t: " — enterprisedb.com/downloads/postgres-postgresql-downloads, colonne Windows x86-64. " },
          { t: "Notez le mot de passe « postgres » demandé", b: true },
          { t: ", gardez le port 5432, décochez Stack Builder. Puis, dans cmd :" },
        ], { size: 17, after: 45 }),
        Cmd("set PATH=%PATH%;C:\\Program Files\\PostgreSQL\\17\\bin", 105),

        Pm([{ t: "\u2461  Créer la base — une seule fois", b: true, c: BLEU_F }], { after: 55 }),
        Cmd('psql -U postgres -c "CREATE USER kkp WITH PASSWORD \'kkp\' CREATEDB;"'),
        Cmd('psql -U postgres -c "CREATE DATABASE kaynakaynapay OWNER kkp;"', 105),

        Pm([{ t: "\u2462  La plateforme", b: true, c: BLEU_F }], { after: 55 }),
        Cmd("git clone -b claude/kayna-kayna-pay-presentation-gp4lgf https://github.com/mly-dev/projet.git"),
        Cmd("cd projet\\kayna-kayna-pay\\plateforme"),
        Cmd("copy .env.example .env"),
        Cmd("npm install && npm run verifier"),
        Cmd("npm run db:migrer && npm run db:seed && npm run dev", 105),

        Pm([{ t: "\u2463  L'application mobile — 2ᵉ fenêtre", b: true, c: BLEU_F }], { after: 55 }),
        Cmd("cd projet\\kayna-kayna-pay\\mobile"),
        Cmd("copy .env.example .env      puis mettez-y l'IP du PC (ipconfig)"),
        Cmd("npm install && npx expo start", 95),

        Pm([
          { t: "En cas de blocage : ", b: true },
          { t: "npm run verifier", b: true, c: BLEU },
          { t: " contrôle tout et affiche la commande qui répare. Les codes SMS s'affichent dans la fenêtre de la plateforme, pas sur un vrai téléphone." },
        ], { size: 17, after: 40 }),

      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("Kayna_Kayna_Pay_Essentiel.docx", buf);
  console.log("docx écrit");
});
