import { useCallback, useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import { api, fcfa } from "../../client/api";

// Gestion du catalogue (MVP : les produits des partenaires sont gérés ici,
// l'espace partenaire est en consultation).
export default function Catalogue() {
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [form, setForm] = useState({ nom: "", description: "", prix_partenaire: "", partenaire_id: "", categorie_id: "", mis_en_avant: false });
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");
  const [nouveauPartenaire, setNouveauPartenaire] = useState({ enseigne: "", telephone: "", mot_de_passe: "", contact: "" });
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    charger();
  }, [charger]);

  async function creerProduit(e) {
    e.preventDefault();
    setMessage("");
    const r = await api("/api/admin/produits", {
      method: "POST",
      corps: {
        nom: form.nom,
        description: form.description,
        prix_partenaire: Number(form.prix_partenaire),
        partenaire_id: Number(form.partenaire_id),
        categorie_id: Number(form.categorie_id),
        mis_en_avant: form.mis_en_avant,
      },
    });
    if (!r.ok) return setMessage(r.erreur);
    setForm({ nom: "", description: "", prix_partenaire: "", partenaire_id: "", categorie_id: "", mis_en_avant: false });
    setMessage(`Produit créé — prix affiché : ${fcfa(r.produit.prix_affiche)} (commission incluse).`);
    charger();
  }

  async function basculerDisponible(p) {
    await api("/api/admin/produits", { method: "PUT", corps: { id: p.id, disponible: !p.disponible } });
    charger();
  }

  async function basculerAvant(p) {
    await api("/api/admin/produits", { method: "PUT", corps: { id: p.id, mis_en_avant: !p.mis_en_avant } });
    charger();
  }

  async function creerCategorie(e) {
    e.preventDefault();
    const r = await api("/api/admin/categories", { method: "POST", corps: { nom: nouvelleCategorie } });
    if (!r.ok) return window.alert(r.erreur);
    setNouvelleCategorie("");
    charger();
  }

  async function creerPartenaire(e) {
    e.preventDefault();
    const r = await api("/api/admin/partenaires", { method: "POST", corps: nouveauPartenaire });
    if (!r.ok) return window.alert(r.erreur);
    setNouveauPartenaire({ enseigne: "", telephone: "", mot_de_passe: "", contact: "" });
    charger();
  }

  return (
    <Coque
      espace="admin"
      titre="Catalogue"
      sousTitre="Produits, catégories et partenaires vérifiés. Le prix affiché est calculé automatiquement : prix partenaire + commission."
    >
      <div className="carte">
        <h2>Ajouter un produit ou un service</h2>
        <form onSubmit={creerProduit}>
          <div className="grille-form">
            <div>
              <label>Nom</label>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div>
              <label>Prix partenaire (F CFA)</label>
              <input
                value={form.prix_partenaire}
                onChange={(e) => setForm({ ...form, prix_partenaire: e.target.value.replace(/\D/g, "") })}
                required
              />
            </div>
            <div>
              <label>Partenaire</label>
              <select value={form.partenaire_id} onChange={(e) => setForm({ ...form, partenaire_id: e.target.value })} required>
                <option value="">— choisir —</option>
                {partenaires.map((p) => (
                  <option key={p.id} value={p.id}>{p.enseigne}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Catégorie</label>
              <select value={form.categorie_id} onChange={(e) => setForm({ ...form, categorie_id: e.target.value })} required>
                <option value="">— choisir —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          </div>
          <label>Description</label>
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="avant"
              style={{ width: "auto" }}
              checked={form.mis_en_avant}
              onChange={(e) => setForm({ ...form, mis_en_avant: e.target.checked })}
            />
            <label htmlFor="avant" style={{ margin: 0 }}>Mettre en avant sur la page d'accueil</label>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="bouton">Créer le produit</button>
            {message ? <span className="info" style={{ marginLeft: 12 }}>{message}</span> : null}
          </div>
        </form>
      </div>

      <div className="carte">
        <h2>Produits ({produits.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Partenaire</th>
              <th>Catégorie</th>
              <th>Prix partenaire</th>
              <th>Prix affiché</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {produits.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>
                  {p.nom}
                  {p.mis_en_avant ? <span className="badge" style={{ marginLeft: 6 }}>en avant</span> : null}
                </td>
                <td>{p.partenaire}</td>
                <td>{p.categorie}</td>
                <td>{fcfa(p.prix_partenaire)}</td>
                <td style={{ fontWeight: 700 }}>{fcfa(p.prix_affiche)}</td>
                <td>
                  <span className={`badge ${p.disponible ? "actif" : "suspendu"}`}>
                    {p.disponible ? "disponible" : "désactivé"}
                  </span>
                </td>
                <td>
                  <button className="bouton secondaire petit" onClick={() => basculerDisponible(p)} style={{ marginRight: 6 }}>
                    {p.disponible ? "Désactiver" : "Activer"}
                  </button>
                  <button className="bouton secondaire petit" onClick={() => basculerAvant(p)}>
                    {p.mis_en_avant ? "Retirer l'avant" : "Mettre en avant"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="carte">
        <h2>Catégories</h2>
        <form onSubmit={creerCategorie} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Nouvelle catégorie…"
            value={nouvelleCategorie}
            onChange={(e) => setNouvelleCategorie(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <button className="bouton petit">Ajouter</button>
        </form>
        <div className="filtres">
          {categories.map((c) => (
            <span key={c.id} className="bouton-filtre" style={{ cursor: "default" }}>
              {c.nom}
            </span>
          ))}
        </div>
      </div>

      <div className="carte">
        <h2>Partenaires vérifiés</h2>
        <form onSubmit={creerPartenaire}>
          <div className="grille-form">
            <div>
              <label>Enseigne</label>
              <input value={nouveauPartenaire.enseigne} onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, enseigne: e.target.value })} required />
            </div>
            <div>
              <label>Téléphone (compte de connexion)</label>
              <input value={nouveauPartenaire.telephone} onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, telephone: e.target.value })} placeholder="+227…" />
            </div>
            <div>
              <label>Mot de passe initial</label>
              <input value={nouveauPartenaire.mot_de_passe} onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, mot_de_passe: e.target.value })} />
            </div>
            <div>
              <label>Adresse / contact</label>
              <input value={nouveauPartenaire.contact} onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, contact: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="bouton">Créer le partenaire</button>
          </div>
        </form>
        <table style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Enseigne</th>
              <th>Téléphone</th>
              <th>Contact</th>
              <th>Produits</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {partenaires.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.enseigne}</td>
                <td>{p.telephone || "—"}</td>
                <td>{p.contact || "—"}</td>
                <td>{p.nb_produits}</td>
                <td>
                  <span className={`badge ${p.statut}`}>{p.statut}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Coque>
  );
}
