const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

// Photos de produits.
//
// La contrainte qui commande tout ici est le coût des données au Niger : un
// client parcourt le catalogue sur un forfait payé au mégaoctet, souvent en
// 3G. Une photo de téléphone brute pèse 3 à 5 Mo ; vingt vignettes de
// catalogue à ce régime, et la consultation coûte plus cher que le produit.
//
// L'original n'est donc jamais servi, ni même conservé : on en tire deux
// dérivés au moment de l'envoi, et c'est tout ce qui existe ensuite.
//
//   vignette  200 × 200, recadrée   → listes du catalogue      ~8 Ko
//   detail    900 px de large max   → fiche produit           ~70 Ko
//
// Le format retenu est le JPEG progressif. Le WebP pèserait 20 % de moins,
// mais le JPEG s'affiche sur absolument tous les appareils sans condition —
// et un catalogue muet sur un modèle donné coûte plus cher que ces 20 %.

const RACINE = path.join(process.cwd(), "medias");
const DOSSIER = "produits";

const TAILLE_MAX_OCTETS = 12 * 1024 * 1024;
const PIXELS_MAX = 60 * 1000 * 1000; // garde-fou contre les images-bombes
const TYPES = ["jpeg", "png", "webp", "heif", "tiff"];

const DERIVES = [
  { cle: "vignette", suffixe: "v", largeur: 200, hauteur: 200, qualite: 72 },
  { cle: "detail", suffixe: "d", largeur: 900, hauteur: null, qualite: 78 },
];

function cheminDisque(nom) {
  return path.join(RACINE, DOSSIER, nom);
}

// Adresse publique servie par /api/medias — jamais un chemin de disque.
function adresse(nom) {
  return `/api/medias/${DOSSIER}/${nom}`;
}

async function enregistrerPhoto(tampon) {
  if (!tampon || !tampon.length) throw new Error("Fichier vide.");
  if (tampon.length > TAILLE_MAX_OCTETS) {
    throw new Error("Image trop lourde : 12 Mo au maximum.");
  }

  let metadonnees;
  try {
    metadonnees = await sharp(tampon).metadata();
  } catch (e) {
    throw new Error("Fichier illisible : envoyez une image JPEG, PNG ou WebP.");
  }

  if (!TYPES.includes(metadonnees.format)) {
    throw new Error(
      `Format « ${metadonnees.format} » non accepté. Enregistrez la photo en JPEG, PNG ou WebP.`
    );
  }
  if (metadonnees.width * metadonnees.height > PIXELS_MAX) {
    throw new Error("Image trop grande en pixels. Réduisez-la avant de l'envoyer.");
  }

  // Nom dérivé du contenu : deux envois de la même photo écrivent le même
  // fichier, et l'adresse ne change jamais — ce qui autorise une mise en cache
  // définitive côté téléphone.
  const empreinte = crypto.createHash("sha256").update(tampon).digest("hex").slice(0, 16);
  await fs.mkdir(path.join(RACINE, DOSSIER), { recursive: true });

  const photo = { id: empreinte };
  for (const d of DERIVES) {
    const nom = `${empreinte}-${d.suffixe}.jpg`;
    // `rotate()` sans argument applique l'orientation EXIF puis l'efface :
    // sans cela, les photos prises à la verticale s'affichent couchées.
    let image = sharp(tampon).rotate();
    image = d.hauteur
      ? image.resize(d.largeur, d.hauteur, { fit: "cover", position: "attention" })
      : image.resize({ width: d.largeur, withoutEnlargement: true });

    // Aucune métadonnée n'est conservée : une photo de produit prise au
    // téléphone porte souvent les coordonnées GPS de la boutique.
    const sortie = await image
      .jpeg({ quality: d.qualite, progressive: true, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    await fs.writeFile(cheminDisque(nom), sortie.data);
    photo[d.cle] = adresse(nom);
    if (d.cle === "detail") {
      photo.largeur = sortie.info.width;
      photo.hauteur = sortie.info.height;
    }
  }
  return photo;
}

// Suppression des fichiers d'une photo retirée d'un produit.
async function supprimerPhoto(photo) {
  if (!photo || !photo.id) return;
  for (const d of DERIVES) {
    await fs.unlink(cheminDisque(`${photo.id}-${d.suffixe}.jpg`)).catch(() => {});
  }
}

// Lecture pour la route de service. Le nom est validé ici : sans cela, un
// « ../../ » dans l'adresse ferait sortir du dossier des médias.
async function lirePhoto(segments) {
  const propre = segments.filter((s) => /^[A-Za-z0-9._-]+$/.test(s) && !s.startsWith("."));
  if (propre.length !== segments.length || segments.length !== 2) return null;
  if (segments[0] !== DOSSIER) return null;
  return fs.readFile(path.join(RACINE, propre[0], propre[1])).catch(() => null);
}

module.exports = { enregistrerPhoto, supprimerPhoto, lirePhoto, RACINE };
