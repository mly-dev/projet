import React, { createContext, useContext, useEffect, useState } from "react";
import { api, enregistrerSession, sessionEnregistree, effacerSession } from "../api/client";
import { connecterSocket, fermerSocket } from "../api/socket";

const ContexteAuth = createContext(null);

export function FournisseurAuth({ children }) {
  const [chargement, setChargement] = useState(true);
  const [utilisateur, setUtilisateur] = useState(null);

  useEffect(() => {
    (async () => {
      const session = await sessionEnregistree();
      if (session) {
        setUtilisateur(session.utilisateur);
        connecterSocket(session.jeton);
      }
      setChargement(false);
    })();
    return fermerSocket;
  }, []);

  async function ouvrirSession(jeton, utilisateurValeur) {
    await enregistrerSession(jeton, utilisateurValeur);
    connecterSocket(jeton);
    setUtilisateur(utilisateurValeur);
  }

  async function fermerSession() {
    await effacerSession();
    fermerSocket();
    setUtilisateur(null);
  }

  async function supprimerCompte() {
    const r = await api("/api/profil", { method: "DELETE" });
    if (r.ok) await fermerSession();
    return r;
  }

  return (
    <ContexteAuth.Provider value={{ chargement, utilisateur, ouvrirSession, fermerSession, supprimerCompte }}>
      {children}
    </ContexteAuth.Provider>
  );
}

export function useAuth() {
  return useContext(ContexteAuth);
}
