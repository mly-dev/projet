// Vérifie la chaîne complète des photos de produits : envoi, dérivés servis,
// poids, effacement des métadonnées, cloisonnement du dossier, doublons,
// refus des non-images, retrait.
//
//   npm run smoke:photos        (la plateforme doit tourner)
//
// Le poids est vérifié parce que c'est le point qui décide de l'usage réel :
// un catalogue trop lourd ne se consulte pas sur un forfait mobile nigérien.
const sharp = require("sharp");
const { Client } = require("pg");

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
require("dotenv").config();
const bd = new Client({ connectionString: process.env.DATABASE_URL });

async function api(chemin, o = {}) {
  const res = await fetch(BASE + chemin, {
    method: o.method || "GET",
    headers: {
      ...(o.corps ? { "Content-Type": "application/json" } : {}),
      ...(o.jeton ? { Authorization: `Bearer ${o.jeton}` } : {}),
    },
    body: o.corps ? JSON.stringify(o.corps) : o.brut,
  });
  const type = res.headers.get("content-type") || "";
  return {
    statut: res.status,
    entetes: res.headers,
    corps: type.includes("json") ? await res.json().catch(() => ({})) : null,
    octets: type.startsWith("image/") ? Buffer.from(await res.arrayBuffer()) : null,
  };
}

let vert = 0, rouge = 0;
function critere(nom, ok, detail) {
  console.log(`  ${ok ? "✓" : "✗"} ${nom}${detail ? ` — ${detail}` : ""}`);
  ok ? vert++ : rouge++;
}

(async () => {
  await bd.connect();
  console.log("\nPhotos de produits — vérification de bout en bout\n");

  // Connexion administrateur (mot de passe + code SMS).
  const e1 = await api("/api/auth/connexion", {
    method: "POST", corps: { telephone: "+22790000010", mot_de_passe: "admin123" },
  });
  const r = await bd.query(
    "SELECT code FROM otp_codes WHERE telephone = $1 AND usage = 'connexion' ORDER BY id DESC LIMIT 1",
    ["+22790000010"]
  );
  const e2 = await api("/api/auth/connexion-2fa", {
    method: "POST",
    corps: { jeton_temporaire: e1.corps.jeton_temporaire, code: r.rows[0].code },
  });
  const jeton = e2.corps.jeton;
  if (!jeton) throw new Error("connexion admin impossible");

  const rp = await bd.query("SELECT id, nom FROM produits ORDER BY id LIMIT 1");
  const produit = rp.rows[0];
  console.log(`  produit d'essai : ${produit.nom} (#${produit.id})\n`);

  // ── Une photo volumineuse, verticale, avec des métadonnées GPS ───────
  const original = await sharp({
    create: { width: 3000, height: 4000, channels: 3, background: { r: 12, g: 92, b: 169 } },
  })
    .withExifMerge({ IFD0: { Copyright: "essai" }, GPS: { GPSLatitudeRef: "N" } })
    .jpeg({ quality: 95 })
    .toBuffer();
  console.log(`  original : 3000×4000, ${(original.length / 1024 / 1024).toFixed(1)} Mo\n`);

  const formulaire = new FormData();
  formulaire.append("photo", new Blob([original], { type: "image/jpeg" }), "produit.jpg");
  const envoi = await fetch(`${BASE}/api/admin/produits/${produit.id}/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jeton}` },
    body: formulaire,
  });
  const resultat = await envoi.json();
  critere("L'envoi est accepté", envoi.status === 200 && resultat.ok, JSON.stringify(resultat.erreur || ""));
  if (!resultat.ok) { await bd.end(); process.exit(1); }

  const photo = resultat.photos[resultat.photos.length - 1];
  critere("Deux dérivés sont produits", Boolean(photo.vignette && photo.detail));
  critere("Les dimensions du grand format sont enregistrées", photo.largeur === 900 && photo.hauteur === 1200,
    `${photo.largeur}×${photo.hauteur}`);

  // ── Service et poids ────────────────────────────────────────────────
  const v = await api(photo.vignette);
  const d = await api(photo.detail);
  critere("La vignette est servie", v.statut === 200 && v.octets.length > 0,
    `${(v.octets.length / 1024).toFixed(0)} Ko`);
  critere("Le grand format est servi", d.statut === 200 && d.octets.length > 0,
    `${(d.octets.length / 1024).toFixed(0)} Ko`);
  critere("Le poids est compatible avec un forfait mobile",
    v.octets.length < 25 * 1024 && d.octets.length < 200 * 1024,
    `${((v.octets.length + d.octets.length) / 1024).toFixed(0)} Ko à deux`);
  critere("La réduction est réelle", d.octets.length < original.length / 20,
    `${(original.length / d.octets.length).toFixed(0)} fois plus léger`);

  const mv = await sharp(v.octets).metadata();
  critere("La vignette est bien carrée", mv.width === 200 && mv.height === 200, `${mv.width}×${mv.height}`);
  critere("Les métadonnées EXIF sont effacées", !mv.exif, mv.exif ? "EXIF présent !" : "aucune");

  critere("La mise en cache est définitive",
    (v.entetes.get("cache-control") || "").includes("immutable"));

  // ── Le catalogue public les expose ──────────────────────────────────
  const pub = await api(`/api/produits/${produit.id}`);
  critere("La fiche publique renvoie la photo",
    Array.isArray(pub.corps.produit.photos) && pub.corps.produit.photos.length > 0);

  // ── Sécurité : sortir du dossier ────────────────────────────────────
  const evasion = await api("/api/medias/produits/..%2F..%2F.env");
  critere("Un chemin d'évasion est refusé", evasion.statut === 404, `statut ${evasion.statut}`);

  const anonyme = await fetch(`${BASE}/api/admin/produits/${produit.id}/photos`, { method: "POST" });
  critere("L'envoi sans compte administrateur est refusé", anonyme.status === 401 || anonyme.status === 403,
    `statut ${anonyme.status}`);

  // ── Doublon : la même image ne s'ajoute pas deux fois ───────────────
  const f2 = new FormData();
  f2.append("photo", new Blob([original], { type: "image/jpeg" }), "produit.jpg");
  const doublon = await (await fetch(`${BASE}/api/admin/produits/${produit.id}/photos`, {
    method: "POST", headers: { Authorization: `Bearer ${jeton}` }, body: f2,
  })).json();
  critere("La même photo n'est pas dupliquée", doublon.photos.length === resultat.photos.length,
    `${doublon.photos.length} photo(s)`);

  // ── Fichier illisible ───────────────────────────────────────────────
  const f3 = new FormData();
  f3.append("photo", new Blob([Buffer.from("ceci n'est pas une image")], { type: "image/jpeg" }), "faux.jpg");
  const faux = await fetch(`${BASE}/api/admin/produits/${produit.id}/photos`, {
    method: "POST", headers: { Authorization: `Bearer ${jeton}` }, body: f3,
  });
  const fauxCorps = await faux.json();
  critere("Un fichier qui n'est pas une image est refusé avec un message clair",
    faux.status === 400 && /image/i.test(fauxCorps.erreur || ""), fauxCorps.erreur);

  // ── Retrait ─────────────────────────────────────────────────────────
  const retrait = await api(`/api/admin/produits/${produit.id}/photos`, {
    method: "DELETE", jeton, corps: { photo_id: photo.id },
  });
  critere("Le retrait enlève bien la photo visée",
    retrait.corps.ok && !retrait.corps.photos.some((x) => x.id === photo.id),
    `${retrait.corps.photos.length} photo(s) restante(s)`);
  const apres = await api(photo.vignette);
  critere("Les fichiers sont effacés du disque", apres.statut === 404, `statut ${apres.statut}`);

  console.log(`\nRésultat : ${vert} vérifié(s), ${rouge} en échec.\n`);
  await bd.end();
  process.exit(rouge ? 1 : 0);
})().catch((e) => { console.error("ÉCHEC :", e.message); process.exit(1); });
