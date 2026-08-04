import { useCallback, useEffect, useState } from "react";
import Coque from "../../composants/Coque";
import { api } from "../../client/api";

export default function Utilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");

  const charger = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    const r = await api(`/api/admin/utilisateurs?${params}`);
    if (r.ok) setUtilisateurs(r.utilisateurs);
  }, [q, role]);

  useEffect(() => {
    const t = setTimeout(charger, 250);
    return () => clearTimeout(t);
  }, [charger]);

  async function basculerStatut(u) {
    const statut = u.statut === "actif" ? "suspendu" : "actif";
    if (statut === "suspendu" && !window.confirm(`Suspendre le compte de ${u.nom} ?`)) return;
    const r = await api("/api/admin/utilisateurs", { method: "PUT", corps: { user_id: u.id, statut } });
    if (!r.ok) window.alert(r.erreur);
    charger();
  }

  return (
    <Coque
      espace="admin"
      titre="Utilisateurs"
      sousTitre="Recherche, consultation et suspension des comptes clients et partenaires."
    >
      <div className="carte">
        <div className="entete-ligne">
          <input
            placeholder="Rechercher par nom ou téléphone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <div className="filtres">
            {[["", "Tous"], ["client", "Clients"], ["partenaire", "Partenaires"], ["admin", "Admins"]].map(([r, libelle]) => (
              <button key={r || "tous"} className={`bouton-filtre ${role === r ? "actif" : ""}`} onClick={() => setRole(r)}>
                {libelle}
              </button>
            ))}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Rôle</th>
              <th>Vérifié</th>
              <th>Inscrit le</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.nom}</td>
                <td>{u.telephone}</td>
                <td>{u.role}</td>
                <td>{u.telephone_verifie ? "oui" : "non"}</td>
                <td className="info">{new Date(u.cree_le).toLocaleDateString("fr-FR")}</td>
                <td>
                  <span className={`badge ${u.statut}`}>{u.statut}</span>
                </td>
                <td>
                  {["client", "partenaire"].includes(u.role) ? (
                    <button
                      className={`bouton petit ${u.statut === "actif" ? "danger" : ""}`}
                      onClick={() => basculerStatut(u)}
                    >
                      {u.statut === "actif" ? "Suspendre" : "Réactiver"}
                    </button>
                  ) : (
                    <span className="info">via super-admin</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Coque>
  );
}
