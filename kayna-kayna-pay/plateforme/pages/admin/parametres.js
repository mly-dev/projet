import { useCallback, useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import { api, utilisateur } from "../../client/api";

// Paramètres de la plateforme (lecture : admin ; modification : super-admin),
// campagnes de notification et journal d'audit (super-admin).
export default function Parametres() {
  const [parametres, setParametres] = useState(null);
  const [campagne, setCampagne] = useState({ titre: "", corps: "« Même 100 F aujourd'hui, c'est un pas de plus vers votre objectif. »", cible: "achats_en_cours" });
  const [journal, setJournal] = useState([]);
  const [message, setMessage] = useState("");
  const estSuperAdmin = typeof window !== "undefined" && utilisateur() && utilisateur().role === "superadmin";

  const charger = useCallback(async () => {
    const r = await api("/api/admin/parametres");
    if (r.ok) setParametres(r.parametres);
    if (estSuperAdmin) {
      const rj = await api("/api/admin/audit");
      if (rj.ok) setJournal(rj.journal);
    }
  }, [estSuperAdmin]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function enregistrer(cle, valeur) {
    const r = await api("/api/admin/parametres", { method: "PUT", corps: { cle, valeur } });
    if (!r.ok) return window.alert(r.erreur);
    setMessage("Paramètre enregistré.");
    charger();
  }

  async function envoyerCampagne(e) {
    e.preventDefault();
    if (!window.confirm("Envoyer cette notification à tous les clients ciblés ?")) return;
    const r = await api("/api/admin/campagne", { method: "POST", corps: campagne });
    if (!r.ok) return window.alert(r.erreur);
    setMessage(`Campagne envoyée à ${r.destinataires} client(s).`);
  }

  if (!parametres) return <Coque espace="admin" titre="Paramètres" />;

  const numeros = parametres.numeros_depot || {};
  return (
    <Coque
      espace="admin"
      titre="Paramètres et communication"
      sousTitre={
        estSuperAdmin
          ? "Numéros de dépôt, commission, montants minimums, campagnes et journal d'audit."
          : "Consultation des paramètres (modification réservée au super-admin) et campagnes."
      }
    >
      {message ? <div className="carte" style={{ borderColor: "var(--vert)" }}>{message}</div> : null}

      <div className="carte">
        <h2>Numéros de dépôt mobile money</h2>
        <div className="grille-form">
          {["nita", "amana", "wave"].map((op) => (
            <div key={op}>
              <label style={{ textTransform: "uppercase" }}>{op}</label>
              <input
                defaultValue={numeros[op] || ""}
                disabled={!estSuperAdmin}
                onBlur={(e) =>
                  estSuperAdmin && e.target.value !== (numeros[op] || "") &&
                  enregistrer("numeros_depot", { ...numeros, [op]: e.target.value })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="carte">
        <h2>Règles de gestion</h2>
        <div className="grille-form">
          <div>
            <label>Commission (%)</label>
            <input
              defaultValue={parametres.commission_pct}
              disabled={!estSuperAdmin}
              onBlur={(e) => estSuperAdmin && enregistrer("commission_pct", Number(e.target.value))}
            />
          </div>
          <div>
            <label>Versement minimum (F CFA)</label>
            <input
              defaultValue={parametres.versement_minimum}
              disabled={!estSuperAdmin}
              onBlur={(e) => estSuperAdmin && enregistrer("versement_minimum", Number(e.target.value))}
            />
          </div>
          <div>
            <label>Minuteur d'attente (minutes)</label>
            <input
              defaultValue={parametres.delai_attente_minutes}
              disabled={!estSuperAdmin}
              onBlur={(e) => estSuperAdmin && enregistrer("delai_attente_minutes", Number(e.target.value))}
            />
          </div>
        </div>
        <p className="info" style={{ marginBottom: 0 }}>
          La commission s'applique aux nouveaux produits ; les prix des achats en cours restent figés (règle « prix garanti »).
        </p>
      </div>

      <div className="carte">
        <h2>Campagne d'encouragement au versement</h2>
        <form onSubmit={envoyerCampagne}>
          <div className="grille-form">
            <div>
              <label>Titre</label>
              <input value={campagne.titre} onChange={(e) => setCampagne({ ...campagne, titre: e.target.value })} placeholder="Un petit pas aujourd'hui ?" required />
            </div>
            <div>
              <label>Cible</label>
              <select value={campagne.cible} onChange={(e) => setCampagne({ ...campagne, cible: e.target.value })}>
                <option value="achats_en_cours">Clients avec un achat en cours</option>
                <option value="tous">Tous les clients</option>
              </select>
            </div>
          </div>
          <label>Message</label>
          <textarea rows={2} value={campagne.corps} onChange={(e) => setCampagne({ ...campagne, corps: e.target.value })} required />
          <div style={{ marginTop: 10 }}>
            <button className="bouton">Envoyer la campagne</button>
          </div>
        </form>
      </div>

      {estSuperAdmin ? (
        <div className="carte">
          <h2>Journal d'audit</h2>
          <table>
            <thead>
              <tr>
                <th>Quand</th>
                <th>Qui</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {journal.slice(0, 50).map((j) => (
                <tr key={j.id}>
                  <td className="info">{new Date(j.cree_le).toLocaleString("fr-FR")}</td>
                  <td>{j.utilisateur || "système"}</td>
                  <td style={{ fontWeight: 600 }}>{j.action}</td>
                  <td className="info">{j.cible_type} {j.cible_id}</td>
                  <td className="info" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {JSON.stringify(j.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Coque>
  );
}
