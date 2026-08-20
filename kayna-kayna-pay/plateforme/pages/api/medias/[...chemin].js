import { lirePhoto } from "../../../lib/medias";

// Service des photos de produits.
//
// Elles ne sont pas placées dans public/ mais servies par cette route : le nom
// de fichier dérive du contenu, donc une adresse donnée renvoie toujours la
// même image. On peut alors la déclarer immuable, et le téléphone ne la
// retélécharge jamais — ce qui compte quand les données se paient au mégaoctet.
//
// Consultable sans compte : le catalogue lui-même est public.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const segments = [].concat(req.query.chemin || []);
  const contenu = await lirePhoto(segments);
  if (!contenu) {
    // Le détail du pourquoi est journalisé côté serveur par lirePhoto : il ne
    // sort pas d'ici, une adresse de disque n'a rien à faire dans une réponse
    // publique.
    return res.status(404).json({ ok: false, erreur: "Image introuvable." });
  }

  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Content-Length", contenu.length);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.status(200).end(contenu);
}
