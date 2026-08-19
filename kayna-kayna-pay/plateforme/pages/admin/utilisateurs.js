import { useCallback, useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import Modale from "../../composants/Modale";
import { useToast } from "../../composants/Toasts";
import { api } from "../../client/api";

const ROLES = [
  ["", "Tous"],
  ["client", "Clients"],
  ["partenaire", "Partenaires"],
  ["admin", "Administrateurs"],
];

export default function Utilisateurs() {
  const toast = useToast();
  const [utilisateurs, setUtilisateurs] = useState(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [aBasculer, setABasculer] = useState(null);

  const charger = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    const r = await api(`/api/admin/utilisateurs?${params}`);
    if (r.ok) setUtilisateurs(r.utilisateurs);
  }, [q, role]);

  useEffect(() => {
    const t = setTimeout(charger, 260);
    return () => clearTimeout(t);
  }, [charger]);

  async function basculer(u, statut) {
    const r = await api("/api/admin/utilisateurs", {
      method: "PUT",
      corps: { user_id: u.id, statut },
    });
    if (!r.ok) return toast("erreur", "Action impossible", r.erreur);
    toast(
      "succes",
      statut === "suspendu" ? "Compte suspendu" : "Compte réactivé",
      statut === "suspendu"
        ? `${u.nom} ne peut plus se connecter, avec effet immédiat.`
        : `${u.nom} peut de nouveau se connecter.`
    );
    setABasculer(null);
    charger();
  }

  return (
    <Coque
      espace="admin"
      titre="Utilisateurs"
      sousTitre="Rechercher un compte, consulter son état, le suspendre en cas de fraude ou de litige. Une suspension prend effet immédiatement mais ne détruit rien."
    >
      <div className="carte plein">
        <div className="entete-ligne" style={{ padding: "15px 20px 0", marginBottom: 12 }}>
          <input
            placeholder="Rechercher un nom ou un numéro…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ maxWidth: 300 }}
            aria-label="Rechercher un utilisateur"
          />
          <div className="filtres">
            {ROLES.map(([r, libelle]) => (
              <button
                key={r || "tous"}
                className={`bouton-filtre ${role === r ? "actif" : ""}`}
                onClick={() => setRole(r)}
              >
                {libelle}
              </button>
            ))}
          </div>
        </div>

        <div className="table-enveloppe">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Vérifié</th>
                <th>Inscrit le</th>
                <th>État</th>
                <th style={{ width: 1 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {utilisateurs === null ? (
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
              ) : utilisateurs.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="vide">
                      <div className="icone">🔍</div>
                      <div className="titre">Aucun compte trouvé</div>
                      <div className="detail">Essayez un autre nom, un autre numéro, ou changez de filtre.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                utilisateurs.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.nom}</td>
                    <td className="mono" style={{ fontWeight: 400 }}>{u.telephone}</td>
                    <td>{u.role}</td>
                    <td>
                      {u.telephone_verifie ? (
                        <span className="badge valide sans-point">oui</span>
                      ) : (
                        <span className="badge attente sans-point">non</span>
                      )}
                    </td>
                    <td className="secondaire">
                      {new Date(u.cree_le).toLocaleDateString("fr-FR")}
                    </td>
                    <td><span className={`badge ${u.statut}`}>{u.statut}</span></td>
                    <td>
                      {["client", "partenaire"].includes(u.role) ? (
                        <button
                          className={`bouton petit ${u.statut === "actif" ? "secondaire" : "valider"}`}
                          onClick={() =>
                            u.statut === "actif"
                              ? setABasculer(u)
                              : basculer(u, "actif")
                          }
                        >
                          {u.statut === "actif" ? "Suspendre" : "Réactiver"}
                        </button>
                      ) : (
                        <span className="secondaire">via super-admin</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {aBasculer ? (
        <Modale
          titre="Suspendre ce compte ?"
          contexte={`${aBasculer.nom} · ${aBasculer.telephone}`}
          onFermer={() => setABasculer(null)}
          actions={
            <>
              <button className="bouton secondaire" onClick={() => setABasculer(null)}>
                Annuler
              </button>
              <button className="bouton danger" onClick={() => basculer(aBasculer, "suspendu")}>
                Suspendre
              </button>
            </>
          }
        >
          <p style={{ marginTop: 0 }}>
            La personne ne pourra plus se connecter, <strong>immédiatement</strong>.
          </p>
          <div className="alerte info" style={{ marginTop: 0 }}>
            Ses achats en cours et son historique sont conservés : la situation peut
            être régularisée à tout moment en réactivant le compte.
          </div>
        </Modale>
      ) : null}
    </Coque>
  );
}
