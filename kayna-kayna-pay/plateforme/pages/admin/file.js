import { useCallback, useEffect, useRef, useState } from "react";
import Coque from "../../composants/Coque";
import Modale from "../../composants/Modale";
import { useToast } from "../../composants/Toasts";
import { useDirect } from "../../composants/Direct";
import { api, fcfa } from "../../client/api";

const ONGLETS = [
  ["en_attente", "En attente"],
  ["en_verification", "En vérification"],
  ["valide", "Validés"],
  ["rejete", "Rejetés"],
];

const MOTIFS = [
  "Aucun dépôt reçu à ce numéro. Vérifiez que le transfert est bien parti, puis relancez.",
  "Dépôt introuvable pour ce montant. Contactez-nous avec votre reçu.",
  "Montant reçu insuffisant par rapport au versement déclaré.",
];

function heure(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// Écran de travail principal de l'équipe : chaque versement déclaré apparaît
// en temps réel et se traite en moins de trois actions.
export default function FileValidation() {
  const toast = useToast();
  const [statut, setStatut] = useState("en_attente");
  const [versements, setVersements] = useState(null);
  const [stats, setStats] = useState(null);
  const { direct, surEvenement } = useDirect();
  const [aValider, setAValider] = useState(null);
  const [aRejeter, setARejeter] = useState(null);

  const statutActuel = useRef(statut);
  useEffect(() => { statutActuel.current = statut; }, [statut]);

  const charger = useCallback(async (s) => {
    const r = await api(`/api/admin/versements?statut=${s}`);
    if (r.ok && statutActuel.current === s) setVersements(r.versements);
  }, []);

  const chargerStats = useCallback(async () => {
    const r = await api("/api/admin/stats");
    if (r.ok) setStats(r.stats);
  }, []);

  useEffect(() => {
    setVersements(null);
    charger(statut);
  }, [statut, charger]);

  // La connexion temps réel appartient à la coquille : elle vit sur toutes les
  // pages de l'administration, pas seulement ici. La file s'y abonne pour
  // insérer la nouvelle ligne sans tout recharger.
  useEffect(() => {
    chargerStats();
    return surEvenement((nom, v) => {
      chargerStats();
      if (nom === "file:nouveau") {
        if (statutActuel.current !== "en_attente") return;
        setVersements((actuels) =>
          actuels && !actuels.some((x) => x.id === v.id) ? [...actuels, v] : actuels
        );
        return;
      }
      charger(statutActuel.current);
    });
  }, [charger, chargerStats, surEvenement]);

  useEffect(() => {
    // Repli si le temps réel est coupé : rafraîchissement périodique.
    const rythme = setInterval(() => charger(statutActuel.current), 45000);
    return () => clearInterval(rythme);
  }, [charger]);

  const enAttente = statut === "en_attente" || statut === "en_verification";

  return (
    <Coque
      espace="admin"
      titre="File de validation des versements"
      sousTitre="Chaque versement déclaré apparaît ici en temps réel. Vérifiez la réception du dépôt sur le compte mobile money — montant, numéro émetteur, référence — puis validez ou rejetez."
    >
      {stats ? (
        <div className="tuiles">
          <div className={`tuile ${stats.versements_a_traiter > 0 ? "accent" : ""}`}>
            <div className="valeur">{stats.versements_a_traiter}</div>
            <div className="libelle">à traiter maintenant</div>
          </div>
          <div className="tuile">
            <div className="valeur">{fcfa(stats.versements_jour.total)}</div>
            <div className="libelle">collectés aujourd'hui · {stats.versements_jour.n} versements</div>
          </div>
          <div className="tuile">
            <div className="valeur">{fcfa(stats.versements_semaine.total)}</div>
            <div className="libelle">collectés sur 7 jours</div>
          </div>
          <div className="tuile urgent">
            <div className="valeur">{stats.achats_par_statut.complete || 0}</div>
            <div className="libelle">achats complétés à livrer</div>
          </div>
        </div>
      ) : (
        <div className="tuiles">
          {[0, 1, 2, 3].map((i) => (
            <div className="tuile" key={i}>
              <div className="squelette" style={{ height: 26, width: "58%" }} />
              <div className="squelette" style={{ height: 10, width: "82%", marginTop: 9 }} />
            </div>
          ))}
        </div>
      )}

      <div className="carte plein">
        <div className="entete-ligne" style={{ padding: "15px 20px 0", marginBottom: 12 }}>
          <div className="filtres">
            {ONGLETS.map(([s, libelle]) => (
              <button
                key={s}
                className={`bouton-filtre ${statut === s ? "actif" : ""}`}
                onClick={() => setStatut(s)}
              >
                {libelle}
                {s === "en_attente" && stats && stats.versements_a_traiter > 0 ? (
                  <span className="compte">{stats.versements_a_traiter}</span>
                ) : null}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <span className={`pastille-direct ${direct ? "" : "coupe"}`}>
              <span className="point" />
              {direct ? "En direct" : "Hors ligne"}
            </span>
            <button className="bouton secondaire petit" onClick={() => { charger(statut); chargerStats(); }}>
              Actualiser
            </button>
          </div>
        </div>

        <div className="table-enveloppe">
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Produit</th>
                <th>Opérateur</th>
                <th className="num">Montant</th>
                <th>Déclaré à</th>
                <th style={{ width: 1 }}>{enAttente ? "Action" : "Résultat"}</th>
              </tr>
            </thead>
            <tbody>
              {versements === null ? (
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
              ) : versements.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="vide">
                      <div className="icone">✓</div>
                      <div className="titre">
                        {statut === "en_attente" ? "Rien à traiter" : "Aucun versement ici"}
                      </div>
                      <div className="detail">
                        {statut === "en_attente"
                          ? "Tous les versements déclarés ont été traités. Les nouveaux apparaîtront ici automatiquement."
                          : "Cette liste est vide pour le moment."}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                versements.map((v) => (
                  <tr key={v.id}>
                    <td className="mono">{v.reference}</td>
                    <td>
                      {v.client_nom}
                      <div className="secondaire">{v.client_telephone}</div>
                    </td>
                    <td>
                      {v.produit_nom}
                      <div className="secondaire">
                        {fcfa(v.montant_verse)} / {fcfa(v.prix_total)}
                      </div>
                    </td>
                    <td style={{ textTransform: "uppercase", fontSize: 12, fontWeight: 600 }}>
                      {v.operateur}
                    </td>
                    <td className="num mono">{fcfa(v.montant_declare)}</td>
                    <td className="secondaire">{heure(v.depot_confirme_le || v.initie_le)}</td>
                    <td>
                      {enAttente ? (
                        <div className="actions">
                          <button className="bouton valider petit" onClick={() => setAValider(v)}>
                            Valider
                          </button>
                          <button className="bouton secondaire petit" onClick={() => setARejeter(v)}>
                            Rejeter
                          </button>
                        </div>
                      ) : v.statut === "valide" ? (
                        <span className="badge valide">{fcfa(v.montant_valide)}</span>
                      ) : (
                        <span className="badge rejete" title={v.motif_rejet || ""}>
                          rejeté
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {aValider ? (
        <ModaleValidation
          versement={aValider}
          onFermer={() => setAValider(null)}
          onFait={() => { setAValider(null); charger(statut); chargerStats(); }}
        />
      ) : null}

      {aRejeter ? (
        <ModaleRejet
          versement={aRejeter}
          onFermer={() => setARejeter(null)}
          onFait={() => { setARejeter(null); charger(statut); chargerStats(); }}
        />
      ) : null}
    </Coque>
  );
}

// ── Validation ──────────────────────────────────────────────────────────────
function ModaleValidation({ versement, onFermer, onFait }) {
  const toast = useToast();
  const [montant, setMontant] = useState(String(versement.montant_declare));
  const [enCours, setEnCours] = useState(false);

  const valeur = Number(String(montant).replace(/\s/g, ""));
  const valide = Number.isInteger(valeur) && valeur > 0;
  const differe = valide && valeur !== versement.montant_declare;
  const reste = versement.prix_total - versement.montant_verse;
  const complete = valide && valeur >= reste;

  async function confirmer() {
    if (!valide) return;
    setEnCours(true);
    const r = await api(`/api/admin/versements/${versement.id}/valider`, {
      method: "POST",
      corps: { montant_reel: valeur },
    });
    setEnCours(false);
    if (!r.ok) return toast("erreur", "Validation impossible", r.erreur);
    toast(
      "succes",
      "Versement validé",
      r.complete
        ? `${fcfa(valeur)} crédités — l'achat est complété, le client et le partenaire sont notifiés.`
        : `${fcfa(valeur)} crédités au portefeuille de ${versement.client_nom}.`
    );
    onFait();
  }

  return (
    <Modale
      titre="Valider le versement"
      contexte={`${versement.reference} · ${versement.client_nom}`}
      onFermer={onFermer}
      actions={
        <>
          <button className="bouton secondaire" onClick={onFermer} disabled={enCours}>
            Annuler
          </button>
          <button className="bouton valider" onClick={confirmer} disabled={!valide || enCours}>
            {enCours ? "Validation…" : "Confirmer la validation"}
          </button>
        </>
      }
    >
      <div className="recap">
        <div className="ligne">
          <span className="cle">Client</span>
          <span className="val">{versement.client_nom} · {versement.client_telephone}</span>
        </div>
        <div className="ligne">
          <span className="cle">Opérateur</span>
          <span className="val" style={{ textTransform: "uppercase" }}>{versement.operateur}</span>
        </div>
        <div className="ligne">
          <span className="cle">Montant déclaré</span>
          <span className="val">{fcfa(versement.montant_declare)}</span>
        </div>
        <div className="ligne">
          <span className="cle">Achat</span>
          <span className="val">{versement.produit_nom}</span>
        </div>
        <div className="ligne">
          <span className="cle">Reste à payer</span>
          <span className="val">{fcfa(reste)}</span>
        </div>
      </div>

      <div className="champ">
        <label htmlFor="montant-reel">Montant réellement reçu (F CFA)</label>
        <input
          id="montant-reel"
          inputMode="numeric"
          value={montant}
          onChange={(e) => setMontant(e.target.value.replace(/[^\d\s]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter" && valide && !enCours) confirmer(); }}
        />
        <div className="aide">
          Saisissez ce que vous constatez sur le compte mobile money, pas ce que le
          client a déclaré. C'est ce montant qui sera crédité.
        </div>
      </div>

      {differe ? (
        <div className="alerte info">
          Le montant diffère de la déclaration ({fcfa(versement.montant_declare)}).
          Le client sera notifié du montant réellement crédité.
        </div>
      ) : null}

      {complete ? (
        <div className="alerte succes">
          Ce versement complète l'achat. Le client sera félicité et le partenaire
          prévenu de la commande à préparer.
        </div>
      ) : null}
    </Modale>
  );
}

// ── Rejet ───────────────────────────────────────────────────────────────────
function ModaleRejet({ versement, onFermer, onFait }) {
  const toast = useToast();
  const [motif, setMotif] = useState(MOTIFS[0]);
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    if (!motif.trim()) return;
    setEnCours(true);
    const r = await api(`/api/admin/versements/${versement.id}/rejeter`, {
      method: "POST",
      corps: { motif: motif.trim() },
    });
    setEnCours(false);
    if (!r.ok) return toast("erreur", "Rejet impossible", r.erreur);
    toast("succes", "Versement rejeté", `${versement.client_nom} a été notifié du motif.`);
    onFait();
  }

  return (
    <Modale
      titre="Rejeter le versement"
      contexte={`${versement.reference} · ${fcfa(versement.montant_declare)} · ${versement.client_nom}`}
      onFermer={onFermer}
      actions={
        <>
          <button className="bouton secondaire" onClick={onFermer} disabled={enCours}>
            Annuler
          </button>
          <button className="bouton danger" onClick={confirmer} disabled={!motif.trim() || enCours}>
            {enCours ? "Envoi…" : "Confirmer le rejet"}
          </button>
        </>
      }
    >
      <div className="alerte info" style={{ marginTop: 0, marginBottom: 16 }}>
        Ne rejetez pas dans les 15 premières minutes : un dépôt met parfois du temps
        à apparaître. En cas de doute, laissez le versement passer « en vérification ».
      </div>

      <div className="champ">
        <label>Motif — il sera lu par le client</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
          {MOTIFS.map((m) => (
            <label key={m} className="case" style={{ fontWeight: 400, fontSize: 13 }}>
              <input
                type="radio"
                name="motif"
                checked={motif === m}
                onChange={() => setMotif(m)}
              />
              <span>{m}</span>
            </label>
          ))}
        </div>
        <textarea
          rows={3}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Ou rédigez un motif adapté…"
        />
        <div className="aide">
          Dites au client quoi faire ensuite. Évitez « faux » ou « erreur » : le
          message doit lui permettre de corriger.
        </div>
      </div>
    </Modale>
  );
}
