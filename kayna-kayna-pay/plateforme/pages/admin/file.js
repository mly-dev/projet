import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Coque from "../../composants/Coque";
import { api, fcfa } from "../../client/api";

const LIBELLES = { en_attente: "En attente", en_verification: "En vérification", valide: "Validés", rejete: "Rejetés" };

// Écran de travail principal de l'équipe : chaque versement en attente
// apparaît en temps réel et se traite en moins de trois actions.
export default function FileValidation() {
  const [statut, setStatut] = useState("en_attente");
  const [versements, setVersements] = useState([]);
  const [stats, setStats] = useState(null);
  const socketRef = useRef(null);

  const charger = useCallback(async (s) => {
    const r = await api(`/api/admin/versements?statut=${s}`);
    if (r.ok) setVersements(r.versements);
  }, []);

  useEffect(() => {
    charger(statut);
  }, [statut, charger]);

  useEffect(() => {
    api("/api/admin/stats").then((r) => r.ok && setStats(r.stats));
    // Le cookie de session httpOnly est joint automatiquement à la poignée de main.
    const socket = io({ withCredentials: true });
    socketRef.current = socket;
    socket.on("file:nouveau", (v) => {
      setVersements((actuels) =>
        statutActuel.current === "en_attente" && !actuels.some((x) => x.id === v.id)
          ? [...actuels, v]
          : actuels
      );
    });
    socket.on("file:traite", () => charger(statutActuel.current));
    socket.on("file:verification", () => charger(statutActuel.current));
    return () => socket.close();
  }, [charger]);

  const statutActuel = useRef(statut);
  useEffect(() => {
    statutActuel.current = statut;
  }, [statut]);

  async function valider(v) {
    const saisie = window.prompt(
      `Montant réellement reçu pour ${v.reference} (F CFA) :`,
      String(v.montant_declare)
    );
    if (saisie == null) return;
    const montant = Number(saisie.replace(/\s/g, ""));
    if (!Number.isInteger(montant) || montant <= 0) return window.alert("Montant invalide.");
    const r = await api(`/api/admin/versements/${v.id}/valider`, {
      method: "POST",
      corps: { montant_reel: montant },
    });
    if (!r.ok) window.alert(r.erreur);
    charger(statut);
  }

  async function rejeter(v) {
    const motif = window.prompt(`Motif du rejet de ${v.reference} :`, "Aucun dépôt trouvé");
    if (motif == null || !motif.trim()) return;
    const r = await api(`/api/admin/versements/${v.id}/rejeter`, { method: "POST", corps: { motif } });
    if (!r.ok) window.alert(r.erreur);
    charger(statut);
  }

  return (
    <Coque
      espace="admin"
      titre="File de validation des versements"
      sousTitre="Chaque versement déclaré apparaît ici en temps réel. Vérifiez la réception du dépôt (montant, numéro émetteur, référence) puis validez ou rejetez."
    >
      {stats ? (
        <div className="tuiles">
          <div className="tuile">
            <div className="valeur">{stats.versements_a_traiter}</div>
            <div className="libelle">à traiter maintenant</div>
          </div>
          <div className="tuile">
            <div className="valeur">{fcfa(stats.versements_jour.total)}</div>
            <div className="libelle">collectés aujourd'hui ({stats.versements_jour.n} versements)</div>
          </div>
          <div className="tuile">
            <div className="valeur">{fcfa(stats.versements_semaine.total)}</div>
            <div className="libelle">collectés sur 7 jours</div>
          </div>
          <div className="tuile">
            <div className="valeur">{stats.achats_par_statut.complete || 0}</div>
            <div className="libelle">achats complétés à traiter</div>
          </div>
        </div>
      ) : null}

      <div className="carte">
        <div className="entete-ligne">
          <div className="filtres">
            {Object.entries(LIBELLES).map(([s, libelle]) => (
              <button
                key={s}
                className={`bouton-filtre ${statut === s ? "actif" : ""}`}
                onClick={() => setStatut(s)}
              >
                {libelle}
              </button>
            ))}
          </div>
          <button className="bouton secondaire petit" onClick={() => charger(statut)}>
            Actualiser
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Client</th>
              <th>Produit</th>
              <th>Opérateur</th>
              <th>Montant déclaré</th>
              <th>Déclaré à</th>
              {statut === "en_attente" || statut === "en_verification" ? <th>Actions</th> : <th>Détail</th>}
            </tr>
          </thead>
          <tbody>
            {versements.length === 0 ? (
              <tr>
                <td colSpan={7} className="info">
                  Aucun versement « {LIBELLES[statut].toLowerCase()} » pour le moment.
                </td>
              </tr>
            ) : (
              versements.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 700 }}>{v.reference}</td>
                  <td>
                    {v.client_nom}
                    <br />
                    <span className="info">{v.client_telephone}</span>
                  </td>
                  <td>{v.produit_nom}</td>
                  <td style={{ textTransform: "uppercase" }}>{v.operateur}</td>
                  <td style={{ fontWeight: 700 }}>{fcfa(v.montant_declare)}</td>
                  <td className="info">
                    {v.depot_confirme_le ? new Date(v.depot_confirme_le).toLocaleString("fr-FR") : "—"}
                  </td>
                  {statut === "en_attente" || statut === "en_verification" ? (
                    <td>
                      <button className="bouton petit" onClick={() => valider(v)}>
                        Valider
                      </button>{" "}
                      <button className="bouton danger petit" onClick={() => rejeter(v)}>
                        Rejeter
                      </button>
                    </td>
                  ) : (
                    <td>
                      {v.statut === "valide" ? (
                        <span className="badge valide">validé · {fcfa(v.montant_valide)}</span>
                      ) : (
                        <span className="badge rejete">{v.motif_rejet || "rejeté"}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Coque>
  );
}
