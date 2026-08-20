const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

// Photos de produits.
//
// La contrainte qui commande tout ici est le coût des données au Niger : un
// client parcourt le catalogue sur un forfait payé au mégaoctet, souvent en
// 3G. Une photo de téléphone brute pèse 3 à 12 Mo ; vingt vignettes de
// catalogue à ce régime, et la consultation coûte plus cher que le produit.
//
// L'original n'est donc jamais servi, ni même conservé : on en tire deux
// dérivés au moment de l'envoi, et c'est tout ce qui existe ensuite.
//
//   vignette  200 × 200, recadrée   → listes du catalogue
//   detail    900 px de large max   → fiche produit
//
// Le format retenu est le JPEG progressif. Le WebP pèserait 20 % de moins,
// mais le JPEG s'affiche sur absolument tous les appareils sans condition —
// et un catalogue muet sur un modèle donné coûte plus cher que ces 20 %.

// Emplacement des fichiers. MEDIAS_DIR permet de les placer hors du dossier
// de l'application — sur un volume sauvegardé, en production. Par défaut, un
// dossier `medias/` à la racine de la plateforme.
//
// Le chemin est résolu une fois et journalisé au démarrage : quand une image
// ne s'affiche pas, la première question est toujours « où a-t-elle été
// écrite, et où la cherche-t-on ? ».
const RACINE = path.resolve(process.env.MEDIAS_DIR || path.join(process.cwd(), "medias"));
const DOSSIER = "produits";

let annonce = false;
function annoncerRacine() {
  if (annonce) return;
  annonce = true;
  console.log(`[medias] dossier des photos : ${RACINE}`);
}

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
  annoncerRacine();
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
  const dossier = path.join(RACINE, DOSSIER);
  try {
    await fs.mkdir(dossier, { recursive: true });
  } catch (e) {
    throw new Error(`Dossier des photos impossible à créer (${dossier}) : ${e.message}`);
  }

  const photo = { id: empreinte };
  for (const d of DERIVES) {
    const nom = `${empreinte}-${d.suffixe}.jpg`;
    const chemin = cheminDisque(nom);

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

    try {
      await fs.writeFile(chemin, sortie.data);
      // On relit ce qu'on vient d'écrire. Sans ce contrôle, une écriture qui
      // n'aboutit pas là où on la cherchera ensuite passerait pour un succès,
      // et le catalogue afficherait des cadres vides sans rien signaler.
      const verification = await fs.stat(chemin);
      if (verification.size !== sortie.data.length) {
        throw new Error(`taille relue ${verification.size} au lieu de ${sortie.data.length}`);
      }
    } catch (e) {
      throw new Error(`Écriture impossible dans ${chemin} — ${e.message}`);
    }

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

// Lecture pour la route de service.
//
// Le confinement est vérifié sur le chemin résolu, et non sur la forme du
// texte : c'est la seule manière fiable de garantir qu'on ne sort pas du
// dossier, quel que soit le système de fichiers.
async function lirePhoto(segments) {
  annoncerRacine();
  if (!Array.isArray(segments) || segments.length !== 2) return null;

  const cible = path.resolve(RACINE, ...segments);
  const prefixe = RACINE.endsWith(path.sep) ? RACINE : RACINE + path.sep;
  if (!cible.startsWith(prefixe)) {
    console.warn(`[medias] chemin refusé (hors du dossier) : ${segments.join("/")}`);
    return null;
  }

  try {
    return await fs.readFile(cible);
  } catch (e) {
    // Diagnostic explicite : sans lui, un 404 ne dit pas si le fichier manque,
    // si le dossier est ailleurs, ou si les droits l'interdisent.
    const dossier = path.dirname(cible);
    let etat;
    try {
      const fichiers = await fs.readdir(dossier);
      etat = `${fichiers.length} fichier(s) dans ${dossier}`;
    } catch (e2) {
      etat = `dossier introuvable : ${dossier} (${e2.code})`;
    }
    console.warn(`[medias] introuvable : ${cible} — ${e.code} — ${etat}`);
    return null;
  }
}

module.exports = { enregistrerPhoto, supprimerPhoto, lirePhoto, RACINE };
