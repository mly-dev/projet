import { useState } from "react";
import { useRouter } from "next/router";
import { api, enregistrerSession } from "../client/api";

// Connexion aux espaces web (administration et partenaires).
// L'application mobile est le point d'entrée des clients.
export default function Connexion() {
  const router = useRouter();
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);
    const r = await api("/api/auth/connexion", {
      method: "POST",
      corps: { telephone, mot_de_passe: motDePasse },
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur || "Connexion impossible.");
    if (["admin", "superadmin"].includes(r.utilisateur.role)) {
      enregistrerSession(r.jeton, r.utilisateur);
      router.push("/admin/file");
    } else if (r.utilisateur.role === "partenaire") {
      enregistrerSession(r.jeton, r.utilisateur);
      router.push("/partenaire/tableau");
    } else {
      setErreur("Cet espace est réservé à l'équipe et aux partenaires. Clients : utilisez l'application mobile.");
    }
  }

  return (
    <div className="connexion-fond">
      <form className="connexion-boite" onSubmit={soumettre}>
        <div className="marque">KAYNA KAYNA PAY</div>
        <div className="devise">« Kayan si djineh koy yan gandji »</div>
        <label>Numéro de téléphone</label>
        <input
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="+227 90 00 00 10"
          autoFocus
        />
        <label>Mot de passe</label>
        <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
        <div style={{ marginTop: 18 }}>
          <button className="bouton" style={{ width: "100%" }} disabled={enCours}>
            {enCours ? "Connexion…" : "Se connecter"}
          </button>
        </div>
        {erreur ? <div className="erreur">{erreur}</div> : null}
        <div className="info" style={{ marginTop: 16, textAlign: "center" }}>
          Espace administration et partenaires
        </div>
      </form>
    </div>
  );
}
