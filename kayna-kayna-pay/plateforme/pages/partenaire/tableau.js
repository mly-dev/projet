import { useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import { api, fcfa } from "../../client/api";

// Espace partenaire (MVP réduit) : tableau de bord, produits de l'enseigne
// et commandes à préparer. Le catalogue est géré avec l'équipe Kayna Kayna Pay.
export default function TableauPartenaire() {
  const [donnees, setDonnees] = useState(null);
  const [produits, setProduits] = useState([]);
  const [commandes, setCommandes] = useState([]);

  useEffect(() => {
    api("/api/partenaire/tableau-de-bord").then((r) => r.ok && setDonnees(r));
    api("/api/partenaire/produits").then((r) => r.ok && setProduits(r.produits));
    api("/api/partenaire/commandes").then((r) => r.ok && setCommandes(r.commandes));
  }, []);

  if (!donnees) return <Coque espace="partenaire" titre="Tableau de bord" />;

  const s = donnees.stats;
  return (
    <Coque
      espace="partenaire"
      titre={donnees.partenaire.enseigne}
      sousTitre="Vos produits sur Kayna Kayna Pay, les achats en cours et les commandes à préparer. Vous êtes payé intégralement à la livraison confirmée."
    >
      <div className="tuiles">
        <div className="tuile">
          <div className="valeur">{s.achats_en_cours.n}</div>
          <div className="libelle">achats en cours sur vos produits</div>
        </div>
        <div className="tuile">
          <div className="valeur">{fcfa(s.achats_en_cours.verse)}</div>
          <div className="libelle">déjà versés par les clients (sur {fcfa(s.achats_en_cours.total)})</div>
        </div>
        <div className="tuile">
          <div className="valeur">{s.commandes_a_preparer}</div>
          <div className="libelle">commandes à préparer</div>
        </div>
        <div className="tuile">
          <div className="valeur">{fcfa(s.ventes_livrees.chiffre)}</div>
          <div className="libelle">ventes livrées ({s.ventes_livrees.n})</div>
        </div>
      </div>

      <div className="carte">
        <h2>Commandes complétées</h2>
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Produit</th>
              <th>Votre prix</th>
              <th>Complétée le</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {commandes.length === 0 ? (
              <tr>
                <td colSpan={5} className="info">Aucune commande complétée pour le moment.</td>
              </tr>
            ) : (
              commandes.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.reference}</td>
                  <td>{c.produit_nom}</td>
                  <td style={{ fontWeight: 700 }}>{fcfa(c.prix_partenaire)}</td>
                  <td className="info">{c.complete_le ? new Date(c.complete_le).toLocaleString("fr-FR") : "—"}</td>
                  <td>
                    <span className={`badge ${c.statut}`}>{c.statut.replace("_", " ")}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="carte">
        <h2>Vos produits</h2>
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Votre prix</th>
              <th>Prix affiché</th>
              <th>Achats en cours</th>
              <th>Commandes</th>
              <th>Disponibilité</th>
            </tr>
          </thead>
          <tbody>
            {produits.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nom}</td>
                <td>{p.categorie}</td>
                <td>{fcfa(p.prix_partenaire)}</td>
                <td>{fcfa(p.prix_affiche)}</td>
                <td>{p.achats_en_cours}</td>
                <td>{p.commandes}</td>
                <td>
                  <span className={`badge ${p.disponible ? "actif" : "suspendu"}`}>
                    {p.disponible ? "disponible" : "désactivé"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="info" style={{ marginBottom: 0 }}>
          Pour ajouter ou modifier un produit, contactez l'équipe Kayna Kayna Pay : chaque
          modification est validée avant publication.
        </p>
      </div>
    </Coque>
  );
}
