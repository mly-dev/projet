// Système de mise en page commun aux documents Kayna Kayna Pay.
//
// Les trois documents (Comprendre, L'essentiel, Guide d'utilisation) partagent
// cette base : même palette, même typographie, mêmes encadrés. C'est ce qui en
// fait une collection plutôt que trois fichiers sans rapport.
//
// Palette et typographie viennent de la charte : identite/README.md

const fs = require("fs");
const path = require("path");
const {
  Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, AlignmentType, PageNumber, Header, Footer,
  VerticalAlign, TabStopType,
} = require("docx");

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bleu: "005CA9",
  bleuFonce: "003A70",
  bleuClair: "EAF2FA",
  bleuTresClair: "F4F9FD",
  ambre: "F2A900",
  ambreTexte: "8A6100",
  ambreFond: "FFF6E2",
  encre: "1B2E42",
  gris: "5D7285",
  grisClair: "D7E3EE",
  vert: "17662F",
  vertFond: "E6F4EA",
  rouge: "A81E1A",
  rougeFond: "FCEBEA",
  codeFond: "F2F6FA",
  blanc: "FFFFFF",
};

// ── Typographie ──────────────────────────────────────────────────────────────
const TITRE = "Cambria";   // titres — présent dans Office, substitut Caladea
const TEXTE = "Calibri";   // corps — présent dans Office, substitut Carlito
const MONO = "Consolas";

const T = {
  titreDoc: 56,   // demi-points : 28 pt
  h1: 30,         // 15 pt
  h2: 24,         // 12 pt
  h3: 21,
  corps: 20,      // 10 pt
  petit: 17,
  legende: 15,
  code: 15,
};

const LARGEUR_UTILE = 9360; // twips, marges de 2,54 cm sur A4

// ── Blocs de texte ───────────────────────────────────────────────────────────

// Paragraphe simple.
function P(texte, o = {}) {
  return new Paragraph({
    spacing: { after: o.after == null ? 110 : o.after, line: o.line || 264 },
    alignment: o.align,
    children: [
      new TextRun({
        text: texte,
        size: o.size || T.corps,
        bold: o.bold,
        italics: o.italics,
        color: o.color || C.encre,
        font: o.font || TEXTE,
      }),
    ],
  });
}

// Paragraphe composé de plusieurs fragments — permet le gras partiel.
// Chaque fragment : { t: texte, b: gras, i: italique, c: couleur, m: monospace }
function Pm(fragments, o = {}) {
  return new Paragraph({
    spacing: { after: o.after == null ? 110 : o.after, line: o.line || 264 },
    alignment: o.align,
    children: fragments.map(
      (f) =>
        new TextRun({
          text: f.t,
          size: f.size || o.size || T.corps,
          bold: f.b,
          italics: f.i,
          color: f.c || o.color || C.encre,
          font: f.m ? MONO : o.font || TEXTE,
        })
    ),
  });
}

// Titre de niveau 1 — ouvre une section, avec filet coloré dessous.
function H1(texte, o = {}) {
  return new Paragraph({
    pageBreakBefore: o.nouvellePage !== false,
    spacing: { before: o.nouvellePage === false ? 320 : 0, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: C.bleu, space: 6 } },
    children: [
      new TextRun({ text: texte, size: T.h1, bold: true, color: C.bleuFonce, font: TITRE }),
    ],
  });
}

function H2(texte) {
  return new Paragraph({
    spacing: { before: 260, after: 110 },
    children: [
      new TextRun({ text: texte, size: T.h2, bold: true, color: C.bleuFonce, font: TITRE }),
    ],
  });
}

function H3(texte) {
  return new Paragraph({
    spacing: { before: 190, after: 80 },
    children: [
      new TextRun({ text: texte, size: T.h3, bold: true, color: C.encre, font: TEXTE }),
    ],
  });
}

// Puce. Accepte une chaîne ou des fragments.
function Puce(contenu, o = {}) {
  const frags = typeof contenu === "string" ? [{ t: contenu }] : contenu;
  return new Paragraph({
    bullet: { level: o.niveau || 0 },
    spacing: { after: o.after == null ? 60 : o.after, line: 264 },
    children: frags.map(
      (f) =>
        new TextRun({
          text: f.t,
          size: f.size || T.corps,
          bold: f.b,
          italics: f.i,
          color: f.c || C.encre,
          font: f.m ? MONO : TEXTE,
        })
    ),
  });
}

// Étape numérotée, avec le numéro en pastille bleue.
function Etape(numero, contenu, o = {}) {
  const frags = typeof contenu === "string" ? [{ t: contenu }] : contenu;
  return new Table({
    width: { size: LARGEUR_UTILE, type: WidthType.DXA },
    columnWidths: [520, LARGEUR_UTILE - 520],
    borders: sansBordure(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 520, type: WidthType.DXA },
            margins: { top: 40, bottom: 40, left: 0, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                  new TextRun({ text: String(numero), size: T.corps, bold: true, color: C.bleu, font: TEXTE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: LARGEUR_UTILE - 520, type: WidthType.DXA },
            margins: { top: 40, bottom: o.after == null ? 90 : o.after, left: 0, right: 0 },
            children: [
              new Paragraph({
                spacing: { after: 0, line: 264 },
                children: frags.map(
                  (f) =>
                    new TextRun({
                      text: f.t,
                      size: f.size || T.corps,
                      bold: f.b,
                      italics: f.i,
                      color: f.c || C.encre,
                      font: f.m ? MONO : TEXTE,
                    })
                ),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Ligne de commande à recopier.
function Cmd(texte, o = {}) {
  return new Paragraph({
    spacing: { after: o.after == null ? 40 : o.after, line: 250 },
    shading: { type: ShadingType.CLEAR, fill: C.codeFond },
    children: [
      new TextRun({ text: "  " + texte, font: MONO, size: T.code, color: C.encre }),
    ],
  });
}

// ── Encadrés ─────────────────────────────────────────────────────────────────

function sansBordure() {
  const n = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: n, bottom: n, left: n, right: n, insideHorizontal: n, insideVertical: n };
}

// Encadré typé : information, attention, à retenir, astuce.
const TYPES_ENCADRE = {
  info: { fond: C.bleuTresClair, barre: C.bleu, titre: C.bleu },
  attention: { fond: C.rougeFond, barre: C.rouge, titre: C.rouge },
  retenir: { fond: C.vertFond, barre: C.vert, titre: C.vert },
  astuce: { fond: C.ambreFond, barre: C.ambre, titre: C.ambreTexte },
};

function Encadre(type, titre, contenu, o = {}) {
  const style = TYPES_ENCADRE[type] || TYPES_ENCADRE.info;
  const lignes = Array.isArray(contenu) ? contenu : [P(contenu, { after: 0 })];
  return new Table({
    width: { size: LARGEUR_UTILE, type: WidthType.DXA },
    columnWidths: [60, LARGEUR_UTILE - 60],
    borders: sansBordure(),
    rows: [
      new TableRow({
        children: [
          // filet vertical de couleur
          new TableCell({
            width: { size: 60, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: style.barre },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "", size: 2 })] })],
          }),
          new TableCell({
            width: { size: LARGEUR_UTILE - 60, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: style.fond },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              ...(titre
                ? [
                    new Paragraph({
                      spacing: { after: 70 },
                      children: [
                        new TextRun({
                          text: titre.toUpperCase(),
                          size: T.legende,
                          bold: true,
                          color: style.titre,
                          font: TEXTE,
                          characterSpacing: 20,
                        }),
                      ],
                    }),
                  ]
                : []),
              ...lignes,
            ],
          }),
        ],
      }),
    ],
  });
}

// ── Tableaux ─────────────────────────────────────────────────────────────────

// Tableau à en-tête coloré. `lignes` : tableau de tableaux de cellules.
// Une cellule est une chaîne, ou { t, b, c, m } pour gras/couleur/monospace.
function Tab(entetes, lignes, largeurs, o = {}) {
  const cellule = (c, largeur, options = {}) => {
    const frags = Array.isArray(c) ? c : [typeof c === "string" ? { t: c } : c];
    return new TableCell({
      width: { size: largeur, type: WidthType.DXA },
      shading: options.fond ? { type: ShadingType.CLEAR, fill: options.fond } : undefined,
      margins: { top: 80, bottom: 80, left: 130, right: 130 },
      verticalAlign: VerticalAlign.TOP,
      children: [
        new Paragraph({
          spacing: { after: 0, line: 252 },
          alignment: options.align,
          children: frags.map(
            (f) =>
              new TextRun({
                text: f.t,
                size: f.size || options.size || T.petit,
                bold: f.b || options.gras,
                italics: f.i,
                color: f.c || options.couleur || C.encre,
                font: f.m ? MONO : TEXTE,
              })
          ),
        }),
      ],
    });
  };

  const rows = [];
  if (entetes) {
    rows.push(
      new TableRow({
        tableHeader: true,
        children: entetes.map((h, i) =>
          cellule(h, largeurs[i], { fond: C.bleuClair, gras: true, couleur: C.bleuFonce, size: T.legende })
        ),
      })
    );
  }
  for (const l of lignes) {
    rows.push(new TableRow({ children: l.map((c, i) => cellule(c, largeurs[i], o.cellule || {})) }));
  }

  return new Table({
    width: { size: LARGEUR_UTILE, type: WidthType.DXA },
    columnWidths: largeurs,
    rows,
  });
}

// Espace vertical après un tableau (les tableaux ne prennent pas de marge).
const Espace = (h = 200) =>
  new Paragraph({ spacing: { after: h }, children: [new TextRun({ text: "", size: 2 })] });

// ── Couverture ───────────────────────────────────────────────────────────────

function image(chemin, largeur, hauteur) {
  return new ImageRun({
    type: "png",
    data: fs.readFileSync(chemin),
    transformation: { width: largeur, height: hauteur },
  });
}

// Page de couverture : logo, titre, sous-titre, bandeau d'informations.
function Couverture({ logo, titre, sousTitre, description, meta }) {
  const blocs = [
    new Paragraph({ spacing: { after: 900 }, children: [new TextRun({ text: "", size: 2 })] }),
    new Paragraph({
      spacing: { after: 340 },
      children: [image(logo, 84, 84)],
    }),
    new Paragraph({
      spacing: { after: 90 },
      children: [
        new TextRun({ text: "KAYNA KAYNA PAY", size: 22, bold: true, color: C.bleu, font: TEXTE, characterSpacing: 60 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: titre, size: T.titreDoc, bold: true, color: C.bleuFonce, font: TITRE }),
      ],
    }),
  ];

  if (sousTitre) {
    blocs.push(
      new Paragraph({
        spacing: { after: 260 },
        children: [
          new TextRun({ text: sousTitre, size: 26, color: C.gris, font: TITRE, italics: true }),
        ],
      })
    );
  }

  blocs.push(
    new Paragraph({
      spacing: { after: 400 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: C.ambre, space: 2 } },
      children: [new TextRun({ text: "", size: 2 })],
    })
  );

  if (description) {
    blocs.push(
      new Paragraph({
        spacing: { after: 500, line: 300 },
        children: [
          new TextRun({ text: description, size: 22, color: C.encre, font: TEXTE }),
        ],
      })
    );
  }

  if (meta && meta.length) {
    blocs.push(
      Tab(
        null,
        meta.map(([k, v]) => [
          { t: k, b: true, c: C.gris },
          { t: v, c: C.encre },
        ]),
        [2600, LARGEUR_UTILE - 2600],
        { cellule: { size: T.petit } }
      )
    );
  }

  blocs.push(
    new Paragraph({
      spacing: { before: 700, after: 0 },
      children: [
        new TextRun({
          text: "« Kayan si djineh koy yan gandji »  —  faire petit n'empêche pas d'avancer",
          size: T.legende,
          italics: true,
          color: C.gris,
          font: TEXTE,
        }),
      ],
    })
  );

  return blocs;
}

// ── Sommaire ─────────────────────────────────────────────────────────────────

// Sommaire statique : fiable à l'impression et dans le PDF, contrairement au
// champ de table des matières de Word qui exige une actualisation manuelle.
function Sommaire(entrees) {
  return [
    H1("Sommaire", { nouvellePage: true }),
    ...entrees.map(([numero, titre, resume]) =>
      new Table({
        width: { size: LARGEUR_UTILE, type: WidthType.DXA },
        columnWidths: [640, LARGEUR_UTILE - 640],
        borders: sansBordure(),
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 640, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 0, right: 80 },
                children: [
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [
                      new TextRun({ text: String(numero), size: T.corps, bold: true, color: C.bleu, font: TITRE }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: LARGEUR_UTILE - 640, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 0, right: 0 },
                children: [
                  new Paragraph({
                    spacing: { after: 0, line: 250 },
                    children: [
                      new TextRun({ text: titre, size: T.corps, bold: true, color: C.encre, font: TEXTE }),
                      ...(resume
                        ? [new TextRun({ text: "\n" + resume, size: T.petit, color: C.gris, font: TEXTE })]
                        : []),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    ),
  ];
}

// ── En-tête et pied de page ──────────────────────────────────────────────────

function enTete(titreDoc) {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.grisClair, space: 6 } },
        tabStops: [{ type: TabStopType.RIGHT, position: LARGEUR_UTILE }],
        children: [
          new TextRun({ text: "Kayna Kayna Pay", size: T.legende, bold: true, color: C.bleu, font: TEXTE }),
          new TextRun({ text: "\t" + titreDoc, size: T.legende, color: C.gris, font: TEXTE }),
        ],
      }),
    ],
  });
}

function piedDePage() {
  return new Footer({
    children: [
      new Paragraph({
        spacing: { before: 60, after: 0 },
        tabStops: [{ type: TabStopType.RIGHT, position: LARGEUR_UTILE }],
        children: [
          new TextRun({ text: "Août 2026", size: T.legende, color: C.gris, font: TEXTE }),
          new TextRun({ text: "\t", size: T.legende }),
          new TextRun({ children: [PageNumber.CURRENT], size: T.legende, bold: true, color: C.bleu, font: TEXTE }),
          new TextRun({ text: " / ", size: T.legende, color: C.gris, font: TEXTE }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: T.legende, color: C.gris, font: TEXTE }),
        ],
      }),
    ],
  });
}

// ── Assemblage d'un document ─────────────────────────────────────────────────

// Construit les sections docx : couverture sans en-tête, puis le corps.
function sections({ titreDoc, couverture, corps }) {
  const page = { margin: { top: 1150, bottom: 1000, left: 1000, right: 1000 } };
  return [
    { properties: { page }, children: couverture },
    {
      properties: { page },
      headers: { default: enTete(titreDoc) },
      footers: { default: piedDePage() },
      children: corps,
    },
  ];
}

module.exports = {
  C, T, TITRE, TEXTE, MONO, LARGEUR_UTILE,
  P, Pm, H1, H2, H3, Puce, Etape, Cmd,
  Encadre, Tab, Espace, image,
  Couverture, Sommaire, sections, sansBordure,
};
