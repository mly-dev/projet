import { useCallback, useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import Modale from "../../composants/Modale";
import { useToast } from "../../composants/Toasts";
import { api, utilisateur, fcfa } from "../../client/api";

const OPERATEURS = [["nita", "NITA"], ["amana", "Amana"], ["wave", "Wave"]];

export default function Parametres() {
  const toast = useToast();
  const [parametres, setParametres] = useState(null);
  const [journal, setJournal] = useState([]);
  const [campagne, setCampagne] = useState(false);
  const estSuperAdmin =
    typeof window !== "undefined" && utilisateur() && utilisateur().role === "superadmin";

  const charger = useCallback(async () => {
    const r = await api("/api/admin/parametres");
    if (r.ok) setParametres(r.parametres);
    if (estSuperAdmin) {
      const rj = await api("/api/admin/audit");
      if (rj.ok) setJournal(rj.journal);
    }
  }, [estSuperAdmin]);

  useEffect(() => { charger(); }, [charger]);

  async function enregistrer(cle, valeur, libelle) {
    const r = await api("/api/admin/parametres", { method: "PUT", corps: { cle, valeur } });
    if (!r.ok) return toast("erreur", "Enregistrement impossible", r.erreur);
    toast("succes", "Paramètre enregistré", `${libelle} mis à jour. Le changement est tracé au journal.`);
    charger();
  }

  if (!parametres) {
    return (
      <Coque espace="admin" titre="Paramètres et communication">
        <div className="carte"><div className="squelette" style={{ height: 15, width: "40%" }} /></div>
      </Coque>
    );
  }

  const numeros = parametres.numeros_depot || {};

  return (
    <Coque
      espace="admin"
      titre="Paramètres et communication"
      sousTitre={
        estSuperAdmin
          ? "Numéros de dépôt, règles de gestion, campagnes d'encouragement et journal d'audit. Chaque modification est tracée."
          : "Consultation des paramètres. Leur modification est réservée au super-administrateur."
      }
      actions={
        <button className="bouton" onClick={() => setCampagne(true)}>
          Envoyer une campagne
        </button>
      }
    >
      <div className="carte">
        <h2>Numéros de dépôt mobile money</h2>
        <p className="sous-titre" style={{ marginBottom: 14 }}>
          Ce sont les numéros affichés aux clients au moment de verser. Une erreur ici
          envoie l'argent au mauvais endroit : vérifiez deux fois.
        </p>
        <div className="grille-form">
          {OPERATEURS.map(([cle, nom]) => (
            <div className="champ" key={cle}>
              <label htmlFor={`num-${cle}`}>{nom}</label>
              <input
                id={`num-${cle}`}
                defaultValue={numeros[cle] || ""}
                disabled={!estSuperAdmin}
                onBlur={(e) =>
                  estSuperAdmin &&
                  e.target.value !== (numeros[cle] || "") &&
                  enregistrer("numeros_depot", { ...numeros, [cle]: e.target.value }, `Numéro ${nom}`)
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="carte">
        <h2>Règles de gestion</h2>
        <div className="grille-form">
          <div className="champ">
            <label htmlFor="com">Commission (%)</label>
            <input
              id="com"
              defaultValue={parametres.commission_pct}
              disabled={!estSuperAdmin}
              onBlur={(e) => estSuperAdmin && enregistrer("commission_pct", Number(e.target.value), "Commission")}
            />
            <div className="aide">S'applique aux nouveaux produits uniquement.</div>
          </div>
          <div className="champ">
            <label htmlFor="min">Versement minimum (F CFA)</label>
            <input
              id="min"
              defaultValue={parametres.versement_minimum}
              disabled={!estSuperAdmin}
              onBlur={(e) => estSuperAdmin && enregistrer("versement_minimum", Number(e.target.value), "Versement minimum")}
            />
            <div className="aide">Fidèle à la promesse « petit à petit ».</div>
          </div>
          <div className="champ">
            <label htmlFor="del">Minuteur d'attente (minutes)</label>
            <input
              id="del"
              defaultValue={parametres.delai_attente_minutes}
              disabled={!estSuperAdmin}
              onBlur={(e) => estSuperAdmin && enregistrer("delai_attente_minutes", Number(e.target.value), "Minuteur")}
            />
            <div className="aide">Au-delà, le versement passe « en vérification ».</div>
          </div>
        </div>
        <div className="alerte info" style={{ marginTop: 4 }}>
          Les achats en cours conservent le prix fixé à leur ouverture : modifier la
          commission ne change rien pour eux.
        </div>
      </div>

      {estSuperAdmin ? (
        <div className="carte plein">
          <h2>Journal d'audit</h2>
          <div className="table-enveloppe">
            <table>
              <thead>
                <tr><th>Quand</th><th>Qui</th><th>Action</th><th>Cible</th><th>Détails</th></tr>
              </thead>
              <tbody>
                {journal.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="vide">
                        <div className="titre">Journal vide</div>
                        <div className="detail">Les actions sensibles apparaîtront ici.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  journal.slice(0, 60).map((j) => (
                    <tr key={j.id}>
                      <td className="secondaire" style={{ whiteSpace: "nowrap" }}>
                        {new Date(j.cree_le).toLocaleString("fr-FR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td>{j.utilisateur || <span className="secondaire">système</span>}</td>
                      <td style={{ fontWeight: 600 }}>{j.action}</td>
                      <td className="secondaire">{j.cible_type} {j.cible_id}</td>
                      <td className="secondaire" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {JSON.stringify(j.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {campagne ? (
        <ModaleCampagne onFermer={() => setCampagne(false)} />
      ) : null}
    </Coque>
  );
}

function ModaleCampagne({ onFermer }) {
  const toast = useToast();
  const [titre, setTitre] = useState("");
  const [corps, setCorps] = useState(
    "Même 100 F aujourd'hui, c'est un pas de plus vers votre objectif."
  );
  const [cible, setCible] = useState("achats_en_cours");
  const [enCours, setEnCours] = useState(false);
  const [confirme, setConfirme] = useState(false);

  async function envoyer() {
    setEnCours(true);
    const r = await api("/api/admin/campagne", {
      method: "POST",
      corps: { titre: titre.trim(), corps: corps.trim(), cible },
    });
    setEnCours(false);
    if (!r.ok) return toast("erreur", "Envoi impossible", r.erreur);
    toast("succes", "Campagne envoyée", `${r.destinataires} client(s) notifié(s).`);
    onFermer();
  }

  const complet = titre.trim() && corps.trim();

  return (
    <Modale
      titre="Campagne d'encouragement"
      contexte="Une notification envoyée à plusieurs clients à la fois"
      onFermer={onFermer}
      large
      actions={
        <>
          <button className="bouton secondaire" onClick={onFermer} disabled={enCours}>Annuler</button>
          {confirme ? (
            <button className="bouton" onClick={envoyer} disabled={enCours}>
              {enCours ? "Envoi…" : "Oui, envoyer maintenant"}
            </button>
          ) : (
            <button className="bouton" onClick={() => setConfirme(true)} disabled={!complet}>
              Envoyer
            </button>
          )}
        </>
      }
    >
      <div className="champ">
        <label htmlFor="c-titre">Titre</label>
        <input
          id="c-titre"
          value={titre}
          onChange={(e) => { setTitre(e.target.value); setConfirme(false); }}
          placeholder="Ex. Un petit pas aujourd'hui ?"
          autoFocus
        />
      </div>
      <div className="champ">
        <label htmlFor="c-corps">Message</label>
        <textarea id="c-corps" rows={3} value={corps} onChange={(e) => { setCorps(e.target.value); setConfirme(false); }} />
        <div className="aide">
          Ton encourageant et concret. Évitez de culpabiliser : le client verse à son rythme.
        </div>
      </div>
      <div className="champ">
        <label htmlFor="c-cible">Destinataires</label>
        <select id="c-cible" value={cible} onChange={(e) => { setCible(e.target.value); setConfirme(false); }}>
          <option value="achats_en_cours">Clients ayant un achat en cours</option>
          <option value="tous">Tous les clients</option>
        </select>
      </div>

      {confirme ? (
        <div className="alerte erreur">
          Cette notification partira immédiatement et ne peut pas être rappelée.
          Confirmez pour envoyer.
        </div>
      ) : null}
    </Modale>
  );
}
