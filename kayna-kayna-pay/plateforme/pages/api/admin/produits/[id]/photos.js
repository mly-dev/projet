import formidable from "formidable";
import fs from "fs/promises";
import { utilisateurRequis } from "../../../../../lib/auth";
import { query } from "../../../../../lib/db";
import { auditer } from "../../../../../lib/audit";
import { enregistrerPhoto, supprimerPhoto } from "../../../../../lib/medias";

// Photos d'un produit : ajout, retrait, mise en avant.
//
// Réservé à l'administration, conformément au phasage du MVP : le catalogue
// est tenu par l'équipe Kayna Kayna Pay, l'espace partenaire est en
// consultation. La première photo de la liste sert de vignette partout.
export const config = { api: { bodyParser: false } };

const MAX_PHOTOS = 5;

async function photosDuProduit(id) {
  const r = await query("SELECT photos FROM produits WHERE id = $1", [id]);
  if (!r.rows.length) return null;
  return Array.isArray(r.rows[0].photos) ? r.rows[0].photos : [];
}

async function corpsJson(req) {
  const morceaux = [];
  for await (const m of req) morceaux.push(m);
  try {
    return JSON.parse(Buffer.concat(morceaux).toString() || "{}");
  } catch (e) {
    return {};
  }
}

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) return res.status(400).json({ ok: false, erreur: "Produit invalide." });

  const actuelles = await photosDuProduit(id);
  if (actuelles === null) return res.status(404).json({ ok: false, erreur: "Produit introuvable." });

  // ── Ajout ────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    if (actuelles.length >= MAX_PHOTOS) {
      return res.status(400).json({
        ok: false,
        erreur: `${MAX_PHOTOS} photos au maximum par produit. Retirez-en une d'abord.`,
      });
    }

    const formulaire = formidable({ maxFileSize: 12 * 1024 * 1024, maxFiles: 1 });
    let fichiers;
    try {
      [, fichiers] = await formulaire.parse(req);
    } catch (e) {
      const trop = String(e.message || "").includes("maxFileSize");
      return res.status(400).json({
        ok: false,
        erreur: trop ? "Image trop lourde : 12 Mo au maximum." : "Envoi illisible.",
      });
    }

    const fichier = (fichiers.photo || fichiers.fichier || [])[0];
    if (!fichier) return res.status(400).json({ ok: false, erreur: "Aucune image reçue." });

    let photo;
    try {
      const tampon = await fs.readFile(fichier.filepath);
      photo = await enregistrerPhoto(tampon);
    } catch (e) {
      return res.status(400).json({ ok: false, erreur: e.message });
    } finally {
      await fs.unlink(fichier.filepath).catch(() => {});
    }

    // Une même photo envoyée deux fois porte la même empreinte : on ne la
    // duplique pas dans la liste.
    const liste = actuelles.filter((p) => p.id !== photo.id).concat([photo]);
    await query("UPDATE produits SET photos = $2, maj_le = now() WHERE id = $1", [
      id,
      JSON.stringify(liste),
    ]);
    await auditer(user.id, "produit.photo_ajoutee", "produit", id, { photo_id: photo.id });
    return res.json({ ok: true, photos: liste });
  }

  // ── Retrait ──────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const { photo_id } = await corpsJson(req);
    const photo = actuelles.find((p) => p.id === photo_id);
    if (!photo) return res.status(404).json({ ok: false, erreur: "Photo introuvable sur ce produit." });

    const liste = actuelles.filter((p) => p.id !== photo_id);
    await query("UPDATE produits SET photos = $2, maj_le = now() WHERE id = $1", [
      id,
      JSON.stringify(liste),
    ]);

    // Les fichiers ne sont effacés que si plus aucun produit ne les utilise :
    // deux produits identiques partagent la même empreinte, donc les mêmes
    // fichiers.
    const encore = await query(
      "SELECT 1 FROM produits WHERE photos @> $1::jsonb LIMIT 1",
      [JSON.stringify([{ id: photo_id }])]
    );
    if (!encore.rows.length) await supprimerPhoto(photo);

    await auditer(user.id, "produit.photo_retiree", "produit", id, { photo_id });
    return res.json({ ok: true, photos: liste });
  }

  // ── Mise en avant : la photo choisie passe en tête ────────────────────
  if (req.method === "PUT") {
    const { photo_id } = await corpsJson(req);
    const photo = actuelles.find((p) => p.id === photo_id);
    if (!photo) return res.status(404).json({ ok: false, erreur: "Photo introuvable sur ce produit." });

    const liste = [photo].concat(actuelles.filter((p) => p.id !== photo_id));
    await query("UPDATE produits SET photos = $2, maj_le = now() WHERE id = $1", [
      id,
      JSON.stringify(liste),
    ]);
    await auditer(user.id, "produit.photo_principale", "produit", id, { photo_id });
    return res.json({ ok: true, photos: liste });
  }

  res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });
}
