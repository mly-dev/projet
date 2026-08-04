import { useCallback, useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import { api, fcfa } from "../../client/api";

const FILTRES = [
  ["", "Tous"],
  ["en_cours", "En cours"],
  ["complete", "Complétés"],
  ["en_preparation", "En préparation"],
  ["livre", "Livrés"],
  ["annulations", "Demandes d'annulation"],
  ["annule", "Annulés"],
  ["rembourse", "Remboursés"],
];

export default function Achats() {
  const [filtre, setFiltre] = useState("complete");
  const [achats, setAchats] = useState([]);

  const charger = useCallback(async (f) => {
    const q = f === "annulations" ? "annulations=1" : f ? `statut=${f}` : "";
    const r = await api(`/api/admin/achats?${q}`);
    if (r.ok) setAchats(r.achats);
  }, []);

  useEffect(() => {
    charger(filtre);
  }, [filtre, charger]);

  async function action(achat, actionNom) {
    let corps = { action: actionNom };
    if (actionNom === "annule") {
      const motif = window.prompt("Motif de l'annulation :", achat.annulation_motif || "Demande du client");
      if (motif == null) return;
      corps.motif = motif;
    }
    if (actionNom === "rembourse") {
      const saisie = window.prompt(
        "Montant à rembourser (F CFA) — frais de gestion éventuels déduits :",
        String(achat.montant_verse)
      );
      if (saisie == null) return;
      corps.montant_rembourse = Number(saisie.replace(/\s/g, ""));
      corps.motif = "Remboursement après annulation";
    }
    const r = await api(`/api/admin/achats/${achat.id}`, { method: "PUT", corps });
    if (!r.ok) window.alert(r.erreur);
    charger(filtre);
  }

  function actionsPour(a) {
    if (a.statut === "complete") return [["en_preparation", "Préparer"], ["livre", "Marquer livré"]];
    if (a.statut === "en_preparation") return [["livre", "Marquer livré"]];
    if (a.statut === "en_cours" && a.annulation_demandee) return [["annule", "Annuler l'achat"]];
    if (a.statut === "annule") return [["rembourse", "Rembourser"]];
    return [];
  }

  return (
    <Coque
      espace="admin"
      titre="Gestion des achats"
      sousTitre="Achats complétés à livrer, demandes d'annulation et remboursements."
    >
      <div className="carte">
        <div className="entete-ligne">
          <div className="filtres">
            {FILTRES.map(([f, libelle]) => (
              <button
                key={f || "tous"}
                className={`bouton-filtre ${filtre === f ? "actif" : ""}`}
                onClick={() => setFiltre(f)}
              >
                {libelle}
              </button>
            ))}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Client</th>
              <th>Produit / Partenaire</th>
              <th>Progression</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {achats.length === 0 ? (
              <tr>
                <td colSpan={6} className="info">Aucun achat pour ce filtre.</td>
              </tr>
            ) : (
              achats.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700 }}>{a.reference}</td>
                  <td>
                    {a.client_nom}
                    <br />
                    <span className="info">{a.client_telephone}</span>
                  </td>
                  <td>
                    {a.produit_nom}
                    <br />
                    <span className="info">{a.partenaire}</span>
                  </td>
                  <td style={{ minWidth: 150 }}>
                    <div className="progression">
                      <div style={{ width: `${Math.min(100, Math.round((a.montant_verse / a.prix_total) * 100))}%` }} />
                    </div>
                    <span className="info">
                      {fcfa(a.montant_verse)} / {fcfa(a.prix_total)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${a.statut}`}>{a.statut.replace("_", " ")}</span>
                    {a.annulation_demandee && a.statut === "en_cours" ? (
                      <>
                        <br />
                        <span className="badge rejete">annulation demandée</span>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {actionsPour(a).map(([nom, libelle]) => (
                      <button key={nom} className="bouton petit" style={{ marginRight: 6, marginBottom: 4 }} onClick={() => action(a, nom)}>
                        {libelle}
                      </button>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Coque>
  );
}
