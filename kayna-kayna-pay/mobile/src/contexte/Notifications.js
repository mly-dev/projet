import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { surNotification } from "../api/socket";

// Compteur de notifications non lues, partagé entre la pastille de l'onglet et
// l'écran de la liste. Sans état partagé, la pastille resterait allumée après
// que le client a lu ses notifications.
const ContexteNotifications = createContext({ nonLues: 0, rafraichir: () => {} });

export function FournisseurNotifications({ children }) {
  const [nonLues, setNonLues] = useState(0);

  const rafraichir = useCallback(async () => {
    const r = await api("/api/notifications");
    if (r.ok) setNonLues(Number(r.non_lues) || 0);
  }, []);

  useEffect(() => {
    rafraichir();
    const arreter = surNotification(() => rafraichir());
    // Repli si le temps réel est coupé (réseau instable, veille du téléphone).
    const minuterie = setInterval(rafraichir, 60000);
    return () => {
      arreter();
      clearInterval(minuterie);
    };
  }, [rafraichir]);

  return (
    <ContexteNotifications.Provider value={{ nonLues, rafraichir }}>
      {children}
    </ContexteNotifications.Provider>
  );
}

export function useNotifications() {
  return useContext(ContexteNotifications);
}
