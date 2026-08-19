import { useCallback, useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import Modale from "../../composants/Modale";
import { useToast } from "../../composants/Toasts";
import { api, fcfa } from "../../client/api";

const FILTRES = [
  ["complete", "À livrer"],
  ["annulations", "Annulations demandées"],
  ["en_cours", "En cours"],
  ["en_preparation", "En préparation"],
  ["livre", "Livrés"],
  ["annule", "Annulés"],
  ["rembourse", "Remboursés"],
  ["", "Tous"],
];

// Les actions possibles selon l'état, et ce qu'elles impliquent.
const ACTIONS = {
  en_preparation: { libelle: "Marquer en préparation", ton: "bouton", depuis: ["complete"] },
  livre: { libelle: "Marquer livré", ton: "bouton valider", depuis: ["complete", "en_preparation"] },
  annule: { libelle: "Annuler l'achat", ton: "bouton danger", depuis: ["en_cours"] },
  rembourse: { libelle: "Enregistrer le remboursement", ton: "bouton", depuis: ["annule"] },
};

function actionsPour(a) {
  const liste = [];
  for (const [cle, def] of Object.entries(ACTIONS)) {
    if (!def.depuis.includes(a.statut)) continue;
    if (cle === "annule" && !a.annulation_demandee) continue;
    liste.push([cle, def]);
  }
  return liste;
}

export default function Achats() {
  const toast = useToast();
  const [filtre, setFiltre] = useState("complete");
  const [achats, setAchats] = useState(null);
  const [enAction, setEnAction] = useState(null); // { achat, cle, def }

  const charger = useCallback(async (f) => {
    const q = f === "annulations" ? "annulations=1" : f ? `statut=${f}` : "";
    const r = await api(`/api/admin/achats?${q}`);
    if (r.ok) setAchats(r.achats);
  }, []);

  useEffect(() => {
    setAchats(null);
    charger(filtre);
  }, [filtre, charger]);

  return (
    <Coque
      espace="admin"
      titre="Achats et livraisons"
      sousTitre="Les achats entièrement payés à remettre, les demandes d'annulation à traiter, et l'historique des livraisons."
    >
      <div className="carte plein">
        <div className="entete-ligne" style={{ padding: "15px 20px 0", marginBottom: 12 }}>
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
          <button className="bouton secondaire petit" onClick={() => charger(filtre)}>
            Actualiser
          </button>
        </div>

        <div className="table-enveloppe">
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Produit et partenaire</th>
                <th>Progression</th>
                <th>État</th>
                <th style={{ width: 1 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {achats === null ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <div className="squelette-ligne">
                        <div className="squelette" /><div className="squelette" /><div className="squelette" />
                        <div className="squelette" /><div className="squelette" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : achats.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="vide">
                      <div className="icone">✓</div>
                      <div className="titre">Aucun achat dans cette liste</div>
                      <div className="detail">
                        {filtre === "complete"
                          ? "Aucune commande n'attend d'être remise."
                          : "Changez de filtre pour voir d'autres achats."}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                achats.map((a) => {
                  const pct = Math.min(100, Math.round((a.montant_verse / a.prix_total) * 100));
                  return (
                    <tr key={a.id}>
                      <td className="mono">{a.reference}</td>
                      <td>
                        {a.client_nom}
                        <div className="secondaire">{a.client_telephone}</div>
                      </td>
                      <td>
                        {a.produit_nom}
                        <div className="secondaire">{a.partenaire}</div>
                      </td>
                      <td style={{ minWidth: 165 }}>
                        <div className={`progression ${pct >= 100 ? "complete" : ""}`}>
                          <div style={{ width: `${pct}%` }} />
                        </div>
                        <div className="secondaire" style={{ marginTop: 4 }}>
                          {fcfa(a.montant_verse)} / {fcfa(a.prix_total)} · {pct} %
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${a.statut}`}>{a.statut.replace(/_/g, " ")}</span>
                        {a.annulation_demandee && a.statut === "en_cours" ? (
                          <div style={{ marginTop: 4 }}>
                            <span className="badge rejete">annulation demandée</span>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <div className="actions">
                          {actionsPour(a).map(([cle, def]) => (
                            <button
                              key={cle}
                              className={`${def.ton} petit`}
                              onClick={() => setEnAction({ achat: a, cle, def })}
                            >
                              {def.libelle}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {enAction ? (
        <ModaleAction
          {...enAction}
          onFermer={() => setEnAction(null)}
          onFait={() => { setEnAction(null); charger(filtre); }}
        />
      ) : null}
    </Coque>
  );
}

function ModaleAction({ achat, cle, def, onFermer, onFait }) {
  const toast = useToast();
  const [montant, setMontant] = useState(String(achat.montant_verse));
  const [motif, setMotif] = useState(
    cle === "annule" ? achat.annulation_motif || "Demande du client" : ""
  );
  const [enCours, setEnCours] = useState(false);

  const remboursement = cle === "rembourse";
  const valeur = Number(String(montant).replace(/\s/g, ""));
  const montantValide = !remboursement || (Number.isInteger(valeur) && valeur > 0);

  async function confirmer() {
    setEnCours(true);
    const corps = { action: cle };
    if (remboursement) {
      corps.montant_rembourse = valeur;
      corps.motif = motif.trim() || "Remboursement après annulation";
    }
    if (cle === "annule") corps.motif = motif.trim() || "Demande du client";

    const r = await api(`/api/admin/achats/${achat.id}`, { method: "PUT", corps });
    setEnCours(false);
    if (!r.ok) return toast("erreur", "Action impossible", r.erreur);

    const messages = {
      en_preparation: "L'achat passe en préparation, le client est prévenu.",
      livre: "Achat marqué livré. Le client est prévenu.",
      annule: "Achat annulé. Pensez au remboursement.",
      rembourse: `Remboursement de ${fcfa(valeur)} enregistré.`,
    };
    toast("succes", def.libelle, messages[cle]);
    onFait();
  }

  return (
    <Modale
      titre={def.libelle}
      contexte={`${achat.reference} · ${achat.produit_nom}`}
      onFermer={onFermer}
      actions={
        <>
          <button className="bouton secondaire" onClick={onFermer} disabled={enCours}>
            Annuler
          </button>
          <button
            className={cle === "annule" ? "bouton danger" : "bouton"}
            onClick={confirmer}
            disabled={enCours || !montantValide}
          >
            {enCours ? "…" : "Confirmer"}
          </button>
        </>
      }
    >
      <div className="recap">
        <div className="ligne">
          <span className="cle">Client</span>
          <span className="val">{achat.client_nom} · {achat.client_telephone}</span>
        </div>
        <div className="ligne">
          <span className="cle">Partenaire</span>
          <span className="val">{achat.partenaire}</span>
        </div>
        <div className="ligne">
          <span className="cle">Montant versé</span>
          <span className="val">{fcfa(achat.montant_verse)} / {fcfa(achat.prix_total)}</span>
        </div>
      </div>

      {cle === "livre" ? (
        <div className="alerte info" style={{ marginTop: 0 }}>
          À ne cocher qu'une fois le produit réellement remis au client. C'est
          également le moment de régler le partenaire.
        </div>
      ) : null}

      {cle === "annule" ? (
        <div className="champ">
          <label>Motif de l'annulation</label>
          <textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} />
          <div className="aide">Appelez le client avant d'annuler : c'est souvent un besoin passager.</div>
        </div>
      ) : null}

      {remboursement ? (
        <>
          <div className="champ">
            <label htmlFor="montant-remb">Montant à rembourser (F CFA)</label>
            <input
              id="montant-remb"
              inputMode="numeric"
              value={montant}
              onChange={(e) => setMontant(e.target.value.replace(/[^\d\s]/g, ""))}
            />
            <div className="aide">
              Par défaut, la totalité de ce que le client a versé.
            </div>
          </div>
          <div className="champ">
            <label>Motif ou référence du transfert</label>
            <input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex. remboursement NITA réf. 8842190"
            />
          </div>
          <div className="alerte info" style={{ marginTop: 0 }}>
            Tant que le taux de frais d'annulation n'est pas arrêté et écrit dans les
            CGU, remboursez intégralement : prélever des frais non annoncés serait
            déloyal et juridiquement fragile.
          </div>
        </>
      ) : null}
    </Modale>
  );
}
