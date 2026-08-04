// Génère le logo Kayna Kayna Pay et ses déclinaisons.
// Concept : un anneau segmenté — le tout se construit à partir de nombreux
// petits versements. Segments bleus = déjà versé, segment ambre = le versement
// du jour, segments clairs = ce qu'il reste. Au centre, la pièce (l'objectif).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const BLEU = "#005CA9";
const BLEU_FONCE = "#003A70";
const AMBRE = "#F2A900";
const CLAIR = "#D8E2EC";
const BLANC = "#FFFFFF";

const POLICE = "Arial, 'Liberation Sans', Helvetica, sans-serif";

// ── Géométrie de l'anneau ────────────────────────────────────────────────────
const CX = 60, CY = 60;
const W = 17;                 // épaisseur du trait
const R = 43.5;               // rayon de la ligne médiane
const N = 8;                  // nombre de segments
const CAP_DEG = ((W / 2) / R) * (180 / Math.PI); // dépassement des bouts arrondis
const VISUEL = 36;            // ouverture visuelle voulue par segment (degrés)
const TRACE = VISUEL - CAP_DEG * 2;

function point(angleDeg, rayon = R) {
  const a = ((angleDeg - 90) * Math.PI) / 180; // 0° en haut
  return [CX + rayon * Math.cos(a), CY + rayon * Math.sin(a)];
}

function segment(indice, couleur) {
  const centre = indice * (360 / N);
  const a1 = centre - TRACE / 2;
  const a2 = centre + TRACE / 2;
  const [x1, y1] = point(a1);
  const [x2, y2] = point(a2);
  return `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}"
      fill="none" stroke="${couleur}" stroke-width="${W}" stroke-linecap="round"/>`;
}

// 5 segments versés, 1 en cours (ambre), 2 restants
function anneau({ bleu = BLEU, clair = CLAIR, piece = BLEU } = {}) {
  const parts = [];
  for (let i = 0; i < N; i++) {
    let couleur = clair;
    if (i <= 4) couleur = bleu;
    else if (i === 5) couleur = AMBRE;
    parts.push(segment(i, couleur));
  }
  parts.push(`<circle cx="${CX}" cy="${CY}" r="22" fill="${piece}"/>`);
  return parts.join("\n    ");
}

function marque(opts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Kayna Kayna Pay">
    ${anneau(opts)}
</svg>`;
}

// ── Logo horizontal : marque + nom + slogan ──────────────────────────────────
function logoHorizontal({ texte = BLEU_FONCE, sousTexte = "#5D7285", opts = {} } = {}) {
  const t = 120; // taille de la marque
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 140" width="620" height="140" role="img" aria-label="Kayna Kayna Pay — petit à petit, paye">
  <g transform="translate(0, 10)">
    ${anneau(opts)}
  </g>
  <text x="${t + 28}" y="63" font-family="${POLICE}" font-size="40" font-weight="bold"
        letter-spacing="1.5" fill="${texte}">KAYNA KAYNA PAY</text>
  <text x="${t + 30}" y="97" font-family="${POLICE}" font-size="20" font-style="italic"
        fill="${sousTexte}">« Petit à petit, paye »</text>
</svg>`;
}

// ── Écriture des fichiers ────────────────────────────────────────────────────
const sortie = process.argv[2];
if (!sortie) throw new Error("usage : node logo.js <dossier-de-sortie>");
fs.mkdirSync(sortie, { recursive: true });
const ecrire = (nom, contenu) => {
  fs.writeFileSync(path.join(sortie, nom), contenu);
  return path.join(sortie, nom);
};

// Marque seule (fond clair) et version pour fond sombre
ecrire("logo-marque.svg", marque());
ecrire("logo-marque-fond-sombre.svg", marque({ clair: "#FFFFFF33", piece: BLANC }));

// Logo horizontal, deux versions
ecrire("logo.svg", logoHorizontal());
ecrire("logo-fond-sombre.svg", logoHorizontal({
  texte: BLANC,
  sousTexte: "#B9CDE2",
  opts: { clair: "#FFFFFF33", piece: BLANC },
}));

// ── Rasterisation ────────────────────────────────────────────────────────────
async function png(svg, fichier, taille, fond) {
  let img = sharp(Buffer.from(svg), { density: 400 }).resize(taille, taille, {
    fit: "contain",
    background: fond || { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (fond) img = img.flatten({ background: fond });
  await img.png().toFile(path.join(sortie, fichier));
}

async function principal() {
  const bleuRgb = { r: 0, g: 92, b: 169 };
  const marqueBlanche = marque({ bleu: BLANC, clair: "#FFFFFF5E", piece: BLANC });

  // Icône d'application : marque blanche sur fond bleu, pleine page
  const iconePleine = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <rect width="120" height="120" fill="${BLEU}"/>
    <g transform="translate(60,60) scale(0.82) translate(-60,-60)">${anneau({ bleu: BLANC, clair: "#FFFFFF5E", piece: BLANC })}</g>
  </svg>`;
  await png(iconePleine, "icone.png", 1024);

  // Icône adaptative Android : premier plan transparent, marque dans la zone
  // sûre (66 % du cadre), le fond bleu étant défini dans app.json
  const premierPlan = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <g transform="translate(60,60) scale(0.55) translate(-60,-60)">${anneau({ bleu: BLANC, clair: "#FFFFFF5E", piece: BLANC })}</g>
  </svg>`;
  await png(premierPlan, "icone-adaptative.png", 1024);

  // Favicon des espaces web
  await png(marque(), "favicon.png", 64);
  await png(marque(), "favicon-32.png", 32);

  // Écran de démarrage : logo complet sur fond bleu foncé
  const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1284 2778" width="1284" height="2778">
    <rect width="1284" height="2778" fill="${BLEU_FONCE}"/>
    <g transform="translate(462, 1129) scale(3)">${anneau({ bleu: BLANC, clair: "#FFFFFF33", piece: BLANC })}</g>
    <text x="642" y="1620" text-anchor="middle" font-family="${POLICE}" font-size="76"
          font-weight="bold" letter-spacing="3" fill="${BLANC}">KAYNA KAYNA PAY</text>
    <text x="642" y="1680" text-anchor="middle" font-family="${POLICE}" font-size="40"
          font-style="italic" fill="#B9CDE2">« Petit à petit, paye »</text>
  </svg>`;
  fs.writeFileSync(path.join(sortie, "splash.svg"), splash);
  await sharp(Buffer.from(splash), { density: 150 }).png().toFile(path.join(sortie, "splash.png"));

  // Aperçus pour contrôle visuel
  await png(logoHorizontal(), "apercu-logo.png", 620, { r: 255, g: 255, b: 255 });
  await png(marque(), "apercu-marque-48.png", 48, { r: 255, g: 255, b: 255 });
  await png(marque(), "apercu-marque-96.png", 96, { r: 255, g: 255, b: 255 });

  console.log("logo généré dans", sortie);
}

principal().catch((e) => { console.error(e); process.exit(1); });
