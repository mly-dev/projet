import { useCallback, useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import Modale from "../../composants/Modale";
import { useToast } from "../../composants/Toasts";
import { api, fcfa } from "../../client/api";

const VIDE_PRODUIT = {
  nom: "", description: "", prix_partenaire: "",
  partenaire_id: "", categorie_id: "", mis_en_avant: false,
};

export default function Catalogue() {
  const toast = useToast();
  const [produits, setProduits] = useState(null);
  const [categories, setCategories] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [modale, setModale] = useState(null); // "produit" | "categorie" | "partenaire"
  const [photos, setPhotos] = useState(null); // produit dont on gère les photos

  const charger = useCallback(async () => {
    const [rp, rc, rpa] = await Promise.all([
      api("/api/admin/produits"),
      api("/api/admin/categories"),
      api("/api/admin/partenaires"),
    ]);
    if (rp.ok) setProduits(rp.produits);
    if (rc.ok) setCategories(rc.categories);
    if (rpa.ok) setPartenaires(rpa.partenaires);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  async function basculer(p, champ) {
    const r = await api("/api/admin/produits", {
      method: "PUT",
      corps: { id: p.id, [champ]: !p[champ] },
    });
    if (!r.ok) return toast("erreur", "Modification impossible", r.erreur);
    charger();
  }

  return (
    <Coque
      espace="admin"
      titre="Catalogue"
      sousTitre="Produits, catégories et partenaires vérifiés. Vous ne saisissez que le prix du vendeur : le prix affiché au client est calculé automatiquement, commission comprise."
      actions={
        <>
          <button className="bouton secondaire" onClick={() => setModale("categorie")}>
            Nouvelle catégorie
          </button>
          <button className="bouton secondaire" onClick={() => setModale("partenaire")}>
            Nouveau partenaire
          </button>
          <button className="bouton" onClick={() => setModale("produit")}>
            Ajouter un produit
          </button>
        </>
      }
    >
      <div className="tuiles">
        <div className="tuile">
          <div className="valeur">{produits ? produits.length : "—"}</div>
          <div className="libelle">produits au catalogue</div>
        </div>
        <div className="tuile">
          <div className="valeur">{produits ? produits.filter((p) => p.disponible).length : "—"}</div>
          <div className="libelle">disponibles à la vente</div>
        </div>
        <div className="tuile">
          <div className="valeur">{partenaires.length || "—"}</div>
          <div className="libelle">partenaires vérifiés</div>
        </div>
        <div className="tuile">
          <div className="valeur">{categories.length || "—"}</div>
          <div className="libelle">catégories</div>
        </div>
      </div>

      <div className="carte plein">
        <h2>Produits</h2>
        <div className="table-enveloppe">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Partenaire</th>
                <th>Catégorie</th>
                <th className="num">Prix vendeur</th>
                <th className="num">Prix affiché</th>
                <th>État</th>
                <th style={{ width: 1 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {produits === null ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <div className="squelette-ligne">
                        <div className="squelette" /><div className="squelette" /><div className="squelette" />
                        <div className="squelette" /><div className="squelette" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : produits.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="vide">
                      <div className="icone">📦</div>
                      <div className="titre">Le catalogue est vide</div>
                      <div className="detail">
                        Créez d'abord un partenaire, puis ajoutez ses produits.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                produits.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          className="vignette-produit"
                          onClick={() => setPhotos(p)}
                          title={
                            (p.photos || []).length
                              ? "Gérer les photos"
                              : "Aucune photo — cliquez pour en ajouter"
                          }
                        >
                          {(p.photos || []).length ? (
                            <img src={p.photos[0].vignette} alt="" />
                          ) : (
                            <span className="sans-photo">+</span>
                          )}
                        </button>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.nom}</div>
                          {p.mis_en_avant ? (
                            <span className="badge sans-point" style={{ marginTop: 3 }}>en avant</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>{p.partenaire}</td>
                    <td className="secondaire">{p.categorie}</td>
                    <td className="num">{fcfa(p.prix_partenaire)}</td>
                    <td className="num mono">{fcfa(p.prix_affiche)}</td>
                    <td>
                      <span className={`badge ${p.disponible ? "actif" : "suspendu"}`}>
                        {p.disponible ? "disponible" : "désactivé"}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="bouton secondaire petit" onClick={() => basculer(p, "disponible")}>
                          {p.disponible ? "Désactiver" : "Activer"}
                        </button>
                        <button className="bouton fantome petit" onClick={() => basculer(p, "mis_en_avant")}>
                          {p.mis_en_avant ? "Retirer l'avant" : "Mettre en avant"}
                        </button>
                        <button className="bouton fantome petit" onClick={() => setPhotos(p)}>
                          Photos ({(p.photos || []).length})
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="carte plein">
        <h2>Partenaires</h2>
        <div className="table-enveloppe">
          <table>
            <thead>
              <tr>
                <th>Enseigne</th><th>Téléphone</th><th>Contact</th>
                <th className="num">Produits</th><th>État</th>
              </tr>
            </thead>
            <tbody>
              {partenaires.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="vide">
                      <div className="titre">Aucun partenaire</div>
                      <div className="detail">
                        Les partenaires sont créés par l'équipe après vérification :
                        il n'y a pas d'inscription libre.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                partenaires.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.enseigne}</td>
                    <td className="mono" style={{ fontWeight: 400 }}>{p.telephone || "—"}</td>
                    <td className="secondaire">{p.contact || "—"}</td>
                    <td className="num">{p.nb_produits}</td>
                    <td><span className={`badge ${p.statut}`}>{p.statut}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="carte">
        <h2>Catégories</h2>
        <div className="filtres">
          {categories.map((c) => (
            <span key={c.id} className="bouton-filtre" style={{ cursor: "default" }}>
              {c.nom}
            </span>
          ))}
        </div>
      </div>

      {photos ? (
        <ModalePhotos
          produit={photos}
          onFermer={() => setPhotos(null)}
          onChange={charger}
        />
      ) : null}

      {modale === "produit" ? (
        <ModaleProduit
          categories={categories}
          partenaires={partenaires}
          onFermer={() => setModale(null)}
          onFait={() => { setModale(null); charger(); }}
        />
      ) : null}
      {modale === "categorie" ? (
        <ModaleSimple
          titre="Nouvelle catégorie"
          libelle="Nom de la catégorie"
          exemple="Ex. Électroménager"
          onFermer={() => setModale(null)}
          onValider={async (nom) => api("/api/admin/categories", { method: "POST", corps: { nom } })}
          onFait={() => { setModale(null); charger(); }}
        />
      ) : null}
      {modale === "partenaire" ? (
        <ModalePartenaire
          onFermer={() => setModale(null)}
          onFait={() => { setModale(null); charger(); }}
        />
      ) : null}
    </Coque>
  );
}

// ── Ajout de produit ────────────────────────────────────────────────────────
// Photos d'un produit : envoi, mise en avant, retrait.
//
// L'original n'est jamais conservé : le serveur en tire une vignette et un
// grand format, et c'est tout. C'est ce qui rend le catalogue consultable sur
// un forfait mobile — voir lib/medias.js.
function ModalePhotos({ produit, onFermer, onChange }) {
  const toast = useToast();
  const [liste, setListe] = useState(produit.photos || []);
  const [enCours, setEnCours] = useState(false);
  const [survol, setSurvol] = useState(false);

  async function envoyer(fichiers) {
    const fichier = fichiers && fichiers[0];
    if (!fichier) return;
    if (!/^image\//.test(fichier.type)) {
      return toast("erreur", "Ce n'est pas une image", "Choisissez un fichier JPEG, PNG ou WebP.");
    }

    setEnCours(true);
    const formulaire = new FormData();
    formulaire.append("photo", fichier);
    // Envoi multipart : pas de JSON ici, le fichier partirait en base64 et
    // gagnerait un tiers de son poids en route.
    const reponse = await fetch(`/api/admin/produits/${produit.id}/photos`, {
      method: "POST",
      body: formulaire,
      credentials: "include",
    }).catch(() => null);
    setEnCours(false);

    const r = reponse ? await reponse.json().catch(() => ({})) : {};
    if (!r.ok) return toast("erreur", "Envoi impossible", r.erreur || "Le serveur n'a pas répondu.");
    setListe(r.photos);
    onChange();
    toast("succes", "Photo ajoutée", "Elle est réduite et allégée automatiquement pour l'application.");
  }

  async function retirer(photo) {
    const r = await api(`/api/admin/produits/${produit.id}/photos`, {
      method: "DELETE",
      corps: { photo_id: photo.id },
    });
    if (!r.ok) return toast("erreur", "Retrait impossible", r.erreur);
    setListe(r.photos);
    onChange();
  }

  async function mettreEnTete(photo) {
    const r = await api(`/api/admin/produits/${produit.id}/photos`, {
      method: "PUT",
      corps: { photo_id: photo.id },
    });
    if (!r.ok) return toast("erreur", "Modification impossible", r.erreur);
    setListe(r.photos);
    onChange();
    toast("succes", "Photo principale changée", "C'est elle qui s'affiche dans le catalogue.");
  }

  return (
    <Modale
      titre="Photos du produit"
      contexte={produit.nom}
      onFermer={onFermer}
      large
      actions={<button className="bouton" onClick={onFermer}>Terminé</button>}
    >
      <div
        className={`depot-photo ${survol ? "survol" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); envoyer(e.dataTransfer.files); }}
      >
        <input
          id="fichier-photo"
          type="file"
          accept="image/*"
          disabled={enCours || liste.length >= 5}
          onChange={(e) => { envoyer(e.target.files); e.target.value = ""; }}
        />
        <label htmlFor="fichier-photo">
          {enCours ? (
            <>Traitement de l'image…</>
          ) : liste.length >= 5 ? (
            <>Cinq photos au maximum. Retirez-en une pour en ajouter une autre.</>
          ) : (
            <>
              <strong>Choisir une photo</strong> ou la glisser ici
              <span className="aide">
                JPEG, PNG ou WebP · 12 Mo au maximum · elle sera réduite automatiquement
              </span>
            </>
          )}
        </label>
      </div>

      {liste.length === 0 ? (
        <div className="vide" style={{ paddingTop: 18 }}>
          <div className="titre">Aucune photo</div>
          <div className="detail">
            Un produit sans photo se vend mal : le client ne sait pas ce qu'il achète.
          </div>
        </div>
      ) : (
        <div className="grille-photos">
          {liste.map((photo, i) => (
            <figure key={photo.id} className={i === 0 ? "principale" : ""}>
              <img src={photo.vignette} alt="" />
              {i === 0 ? <span className="etiquette">Principale</span> : null}
              <figcaption>
                {i !== 0 ? (
                  <button className="bouton fantome petit" onClick={() => mettreEnTete(photo)}>
                    Mettre en tête
                  </button>
                ) : (
                  <span className="secondaire">affichée au catalogue</span>
                )}
                <button className="bouton danger petit" onClick={() => retirer(photo)}>
                  Retirer
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="alerte info" style={{ marginTop: 16 }}>
        La première photo sert de vignette partout dans l'application. Les
        données de localisation contenues dans le fichier sont effacées à
        l'envoi.
      </div>
    </Modale>
  );
}

function ModaleProduit({ categories, partenaires, onFermer, onFait }) {
  const toast = useToast();
  const [f, setF] = useState(VIDE_PRODUIT);
  const [enCours, setEnCours] = useState(false);

  const prix = Number(String(f.prix_partenaire).replace(/\s/g, ""));
  const prixValide = Number.isInteger(prix) && prix > 0;
  // Même règle que le serveur : prix + commission, arrondi aux 5 F supérieurs.
  const apercu = prixValide ? Math.ceil((prix * 1.05) / 5) * 5 : null;
  const complet = f.nom.trim() && prixValide && f.partenaire_id && f.categorie_id;

  async function creer() {
    setEnCours(true);
    const r = await api("/api/admin/produits", {
      method: "POST",
      corps: {
        nom: f.nom.trim(),
        description: f.description,
        prix_partenaire: prix,
        partenaire_id: Number(f.partenaire_id),
        categorie_id: Number(f.categorie_id),
        mis_en_avant: f.mis_en_avant,
      },
    });
    setEnCours(false);
    if (!r.ok) return toast("erreur", "Création impossible", r.erreur);
    toast("succes", "Produit créé", `Affiché ${fcfa(r.produit.prix_affiche)} au client.`);
    onFait();
  }

  return (
    <Modale
      titre="Ajouter un produit"
      contexte="Le prix affiché sera calculé automatiquement"
      onFermer={onFermer}
      large
      actions={
        <>
          <button className="bouton secondaire" onClick={onFermer} disabled={enCours}>Annuler</button>
          <button className="bouton" onClick={creer} disabled={!complet || enCours}>
            {enCours ? "Création…" : "Créer le produit"}
          </button>
        </>
      }
    >
      <div className="champ">
        <label htmlFor="p-nom">Nom du produit</label>
        <input id="p-nom" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} autoFocus />
      </div>

      <div className="grille-form">
        <div className="champ">
          <label htmlFor="p-part">Partenaire</label>
          <select id="p-part" value={f.partenaire_id} onChange={(e) => setF({ ...f, partenaire_id: e.target.value })}>
            <option value="">— choisir —</option>
            {partenaires.map((p) => <option key={p.id} value={p.id}>{p.enseigne}</option>)}
          </select>
        </div>
        <div className="champ">
          <label htmlFor="p-cat">Catégorie</label>
          <select id="p-cat" value={f.categorie_id} onChange={(e) => setF({ ...f, categorie_id: e.target.value })}>
            <option value="">— choisir —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>

      <div className="champ">
        <label htmlFor="p-prix">Prix du vendeur (F CFA)</label>
        <input
          id="p-prix"
          inputMode="numeric"
          value={f.prix_partenaire}
          onChange={(e) => setF({ ...f, prix_partenaire: e.target.value.replace(/[^\d\s]/g, "") })}
          placeholder="Ex. 640 000"
        />
        {apercu ? (
          <div className="alerte succes" style={{ marginTop: 9 }}>
            Prix affiché au client : <strong style={{ marginLeft: 4 }}>{fcfa(apercu)}</strong>
            <span style={{ marginLeft: 6, opacity: .8 }}>— commission incluse</span>
          </div>
        ) : (
          <div className="aide">Ce que touche le vendeur. La commission s'ajoute automatiquement.</div>
        )}
      </div>

      <div className="champ">
        <label htmlFor="p-desc">Description</label>
        <textarea id="p-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </div>

      <label className="case">
        <input type="checkbox" checked={f.mis_en_avant} onChange={(e) => setF({ ...f, mis_en_avant: e.target.checked })} />
        Mettre en avant sur la page d'accueil de l'application
      </label>
    </Modale>
  );
}

// ── Ajout de partenaire ─────────────────────────────────────────────────────
function ModalePartenaire({ onFermer, onFait }) {
  const toast = useToast();
  const [f, setF] = useState({ enseigne: "", contact: "", telephone: "", mot_de_passe: "" });
  const [enCours, setEnCours] = useState(false);

  async function creer() {
    setEnCours(true);
    const r = await api("/api/admin/partenaires", { method: "POST", corps: f });
    setEnCours(false);
    if (!r.ok) return toast("erreur", "Création impossible", r.erreur);
    toast("succes", "Partenaire créé", f.telephone ? "Son compte de connexion est ouvert." : "Sans compte de connexion pour l'instant.");
    onFait();
  }

  return (
    <Modale
      titre="Nouveau partenaire"
      contexte="Les partenaires sont vérifiés avant d'entrer au catalogue"
      onFermer={onFermer}
      actions={
        <>
          <button className="bouton secondaire" onClick={onFermer} disabled={enCours}>Annuler</button>
          <button className="bouton" onClick={creer} disabled={!f.enseigne.trim() || enCours}>
            {enCours ? "…" : "Créer"}
          </button>
        </>
      }
    >
      <div className="champ">
        <label htmlFor="pa-ens">Enseigne</label>
        <input id="pa-ens" value={f.enseigne} onChange={(e) => setF({ ...f, enseigne: e.target.value })} autoFocus />
      </div>
      <div className="champ">
        <label htmlFor="pa-cont">Adresse ou contact</label>
        <input id="pa-cont" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="Ex. Marché de Katako, Niamey" />
      </div>
      <div className="grille-form">
        <div className="champ">
          <label htmlFor="pa-tel">Téléphone de connexion</label>
          <input id="pa-tel" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} placeholder="+227…" />
        </div>
        <div className="champ">
          <label htmlFor="pa-mdp">Mot de passe initial</label>
          <input id="pa-mdp" value={f.mot_de_passe} onChange={(e) => setF({ ...f, mot_de_passe: e.target.value })} />
        </div>
      </div>
      <div className="aide">
        Laissez ces deux champs vides pour créer l'enseigne sans accès en ligne —
        vous pourrez lui ouvrir un compte plus tard.
      </div>
    </Modale>
  );
}

// ── Saisie d'une seule valeur ───────────────────────────────────────────────
function ModaleSimple({ titre, libelle, exemple, onFermer, onValider, onFait }) {
  const toast = useToast();
  const [valeur, setValeur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    setEnCours(true);
    const r = await onValider(valeur.trim());
    setEnCours(false);
    if (!r.ok) return toast("erreur", "Impossible", r.erreur);
    toast("succes", titre, "Enregistré.");
    onFait();
  }

  return (
    <Modale
      titre={titre}
      onFermer={onFermer}
      actions={
        <>
          <button className="bouton secondaire" onClick={onFermer} disabled={enCours}>Annuler</button>
          <button className="bouton" onClick={confirmer} disabled={!valeur.trim() || enCours}>
            {enCours ? "…" : "Enregistrer"}
          </button>
        </>
      }
    >
      <div className="champ" style={{ marginBottom: 0 }}>
        <label htmlFor="valeur-simple">{libelle}</label>
        <input
          id="valeur-simple"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder={exemple}
          onKeyDown={(e) => { if (e.key === "Enter" && valeur.trim()) confirmer(); }}
        />
      </div>
    </Modale>
  );
}
