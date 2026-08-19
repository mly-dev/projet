import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { api, enregistrerSession } from "../client/api";

// Connexion aux espaces web (administration et partenaires). L'application
// mobile est le point d'entrée des clients.
//
// Les comptes d'administration passent par un deuxième facteur : mot de passe,
// puis code reçu par SMS (cahier des charges §10).
export default function Connexion() {
  const router = useRouter();
  const [etape, setEtape] = useState("identifiants");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [code, setCode] = useState("");
  const [jetonTemporaire, setJetonTemporaire] = useState(null);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [enCours, setEnCours] = useState(false);

  function ouvrir(utilisateur) {
    enregistrerSession(utilisateur);
    if (["admin", "superadmin"].includes(utilisateur.role)) router.push("/admin/file");
    else if (utilisateur.role === "partenaire") router.push("/partenaire/tableau");
    else setErreur("Cet espace est réservé à l'équipe et aux partenaires. Clients : utilisez l'application mobile.");
  }

  async function soumettreIdentifiants(e) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);
    const r = await api("/api/auth/connexion", {
      method: "POST",
      corps: { telephone, mot_de_passe: motDePasse, espace_web: true },
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur || "Connexion impossible.");

    if (r.second_facteur) {
      setJetonTemporaire(r.jeton_temporaire);
      setInfo(r.message || "Un code de connexion vous a été envoyé par SMS.");
      setEtape("code");
      return;
    }
    ouvrir(r.utilisateur);
  }

  async function soumettreCode(e) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);
    const r = await api("/api/auth/connexion-2fa", {
      method: "POST",
      corps: { jeton_temporaire: jetonTemporaire, code, espace_web: true },
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur || "Code refusé.");
    ouvrir(r.utilisateur);
  }

  return (
    <div className="connexion-fond">
      <Head>
        <title>Connexion — Kayna Kayna Pay</title>
      </Head>

      <form
        className="connexion-boite"
        onSubmit={etape === "code" ? soumettreCode : soumettreIdentifiants}
      >
        <img src="/logo-marque.svg" alt="" width={58} height={58} className="logo-connexion" />
        <div className="marque">KAYNA KAYNA PAY</div>
        <div className="devise">« Kayan si djineh koy yan gandji »</div>

        {etape === "identifiants" ? (
          <>
            <div className="champ">
              <label htmlFor="tel">Numéro de téléphone</label>
              <input
                id="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+227 90 00 00 10"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="champ">
              <label htmlFor="mdp">Mot de passe</label>
              <input
                id="mdp"
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button className="bouton large" disabled={enCours || !telephone || !motDePasse}>
              {enCours ? "Connexion…" : "Se connecter"}
            </button>
          </>
        ) : (
          <>
            <div className="alerte info" style={{ marginTop: 0, marginBottom: 16 }}>
              {info}
            </div>
            <div className="champ champ-code">
              <label htmlFor="code">Code reçu par SMS</label>
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
              />
              <div className="aide" style={{ textAlign: "center" }}>
                Valable 10 minutes, utilisable une seule fois.
              </div>
            </div>
            <button className="bouton large" disabled={enCours || code.length < 6}>
              {enCours ? "Vérification…" : "Valider le code"}
            </button>
            <button
              type="button"
              className="bouton fantome"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => { setEtape("identifiants"); setCode(""); setErreur(""); }}
            >
              Recommencer
            </button>
          </>
        )}

        {erreur ? <div className="alerte erreur">{erreur}</div> : null}

        <div className="bas">Espace administration et partenaires</div>
      </form>
    </div>
  );
}
