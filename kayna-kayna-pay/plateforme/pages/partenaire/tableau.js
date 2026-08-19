import { useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import { api, fcfa } from "../../client/api";

// Espace partenaire : tableau de bord, commandes à préparer, produits.
// Le catalogue est tenu avec l'équipe Kayna Kayna Pay — cet espace est en
// consultation, conformément au phasage du MVP.
export default function TableauPartenaire() {
  const [donnees, setDonnees] = useState(null);
  const [produits, setProduits] = useState(null);
  const [commandes, setCommandes] = useState(null);

  useEffect(() => {
    api("/api/partenaire/tableau-de-bord").then((r) => r.ok && setDonnees(r));
    api("/api/partenaire/produits").then((r) => r.ok && setProduits(r.produits));
    api("/api/partenaire/commandes").then((r) => r.ok && setCommandes(r.commandes));
  }, []);

  if (!donnees) {
    return (
      <Coque espace="partenaire" titre="Tableau de bord">
        <div className="tuiles">
          {[0, 1, 2, 3].map((i) => (
            <div className="tuile" key={i}>
              <div className="squelette" style={{ height: 26, width: "56%" }} />
              <div className="squelette" style={{ height: 10, width: "84%", marginTop: 9 }} />
            </div>
          ))}
        </div>
      </Coque>
    );
  }

  const s = donnees.stats;
  const aPreparer = s.commandes_a_preparer;
  const progression = s.achats_en_cours.total
    ? Math.round((s.achats_en_cours.verse / s.achats_en_cours.total) * 100)
    : 0;

  return (
    <Coque
      espace="partenaire"
      titre={donnees.partenaire.enseigne}
      sousTitre="Vos produits sur Kayna Kayna Pay, les achats en cours et les commandes à préparer. Vous êtes réglé intégralement à la livraison confirmée."
    >
      <div className="tuiles">
        <div className={`tuile ${aPreparer > 0 ? "accent" : ""}`}>
          <div className="valeur">{aPreparer}</div>
          <div className="libelle">
            {aPreparer > 0 ? "commande(s) à préparer" : "aucune commande en attente"}
          </div>
        </div>
        <div className="tuile">
          <div className="valeur">{s.achats_en_cours.n}</div>
          <div className="libelle">achats en cours sur vos produits</div>
        </div>
        <div className="tuile">
          <div className="valeur">{fcfa(s.achats_en_cours.verse)}</div>
          <div className="libelle">déjà versés par les clients, sur {fcfa(s.achats_en_cours.total)}</div>
        </div>
        <div className="tuile">
          <div className="valeur">{fcfa(s.ventes_livrees.chiffre)}</div>
          <div className="libelle">ventes livrées · {s.ventes_livrees.n} commandes</div>
        </div>
      </div>

      {s.achats_en_cours.n > 0 ? (
        <div className="carte">
          <h2>Avancement global des achats en cours</h2>
          <div className="progression" style={{ height: 10 }}>
            <div style={{ width: `${progression}%` }} />
          </div>
          <p className="sous-titre" style={{ marginTop: 10, marginBottom: 0 }}>
            Vos clients ont versé <strong>{fcfa(s.achats_en_cours.verse)}</strong> sur les{" "}
            <strong>{fcfa(s.achats_en_cours.total)}</strong> que représentent leurs achats,
            soit {progression} %. Cet argent est conservé par Kayna Kayna Pay et vous sera
            versé à la livraison de chaque commande.
          </p>
        </div>
      ) : null}

      <div className="carte plein">
        <h2>Commandes</h2>
        <div className="table-enveloppe">
          <table>
            <thead>
              <tr>
                <th>Référence</th><th>Produit</th>
                <th className="num">Votre prix</th><th>Complétée le</th><th>État</th>
              </tr>
            </thead>
            <tbody>
              {commandes === null ? (
                [0, 1].map((i) => (
                  <tr key={i}>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <div className="squelette-ligne">
                        <div className="squelette" /><div className="squelette" />
                        <div className="squelette" /><div className="squelette" /><div className="squelette" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="vide">
                      <div className="icone">📦</div>
                      <div className="titre">Aucune commande pour le moment</div>
                      <div className="detail">
                        Vous serez prévenu dès qu'un client aura fini de payer l'un de vos produits.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                commandes.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.reference}</td>
                    <td>{c.produit_nom}</td>
                    <td className="num mono">{fcfa(c.prix_partenaire)}</td>
                    <td className="secondaire">
                      {c.complete_le
                        ? new Date(c.complete_le).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td><span className={`badge ${c.statut}`}>{c.statut.replace(/_/g, " ")}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="carte plein">
        <h2>Vos produits</h2>
        <div className="table-enveloppe">
          <table>
            <thead>
              <tr>
                <th>Produit</th><th>Catégorie</th>
                <th className="num">Votre prix</th><th className="num">Prix affiché</th>
                <th className="num">Achats en cours</th><th className="num">Commandes</th><th>État</th>
              </tr>
            </thead>
            <tbody>
              {produits === null ? (
                <tr><td colSpan={7} style={{ padding: 0 }}>
                  <div className="squelette-ligne">
                    <div className="squelette" /><div className="squelette" /><div className="squelette" />
                    <div className="squelette" /><div className="squelette" />
                  </div>
                </td></tr>
              ) : produits.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="vide">
                      <div className="titre">Aucun produit au catalogue</div>
                      <div className="detail">Contactez l'équipe Kayna Kayna Pay pour référencer vos articles.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                produits.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.nom}</td>
                    <td className="secondaire">{p.categorie}</td>
                    <td className="num">{fcfa(p.prix_partenaire)}</td>
                    <td className="num mono">{fcfa(p.prix_affiche)}</td>
                    <td className="num">{p.achats_en_cours}</td>
                    <td className="num">{p.commandes}</td>
                    <td>
                      <span className={`badge ${p.disponible ? "actif" : "suspendu"}`}>
                        {p.disponible ? "disponible" : "désactivé"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="carte">
        <div className="alerte info" style={{ marginTop: 0 }}>
          Pour ajouter un produit ou changer un prix, contactez l'équipe Kayna Kayna Pay :
          chaque modification est validée avant publication. La gestion autonome de votre
          catalogue est prévue pour une prochaine étape.
        </div>
      </div>
    </Coque>
  );
}
