import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { surNotification, surEtatSocket } from "../api/socket";
import { useToast } from "../composants/Toasts";
import { naviguer } from "../navigation";

// Compteur de notifications non lues, partagé entre la pastille de l'onglet et
// l'écran de la liste. Sans état partagé, la pastille resterait allumée après
// que le client a lu ses notifications.
const ContexteNotifications = createContext({ nonLues: 0, rafraichir: () => {}, enLigne: false });

// Chaque type de notification a son ton, son pictogramme, et l'écran vers
// lequel le client est emmené s'il appuie sur le bandeau.
const AFFICHAGE = {
  versement_valide: { ton: "succes", icone: "✓" },
  versement_rejete: { ton: "erreur", icone: "!" },
  versement_verification: { ton: "attention", icone: "?" },
  achat_complete: { ton: "succes", icone: "🎉" },
  achat_livre: { ton: "succes", icone: "📦" },
  campagne: { ton: "info", icone: "💬" },
};

function destination(notif) {
  const d = notif.donnees || {};
  if (d.achat_id) return ["DetailAchat", { id: d.achat_id }];
  return ["Principal", undefined];
}

export function FournisseurNotifications({ children }) {
  const [nonLues, setNonLues] = useState(0);
  const [enLigne, setEnLigne] = useState(false);
  const toast = useToast();

  const rafraichir = useCallback(async () => {
    const r = await api("/api/notifications");
    if (r.ok) setNonLues(Number(r.non_lues) || 0);
  }, []);

  // Toute notification reçue en temps réel devient un bandeau, quel que soit
  // l'écran affiché. C'est ce qui manquait : le socket fonctionnait, mais rien
  // ne le montrait tant qu'on n'ouvrait pas l'onglet Notifications.
  useEffect(() => {
    return surNotification((n) => {
      const style = AFFICHAGE[n.type] || { ton: "info", icone: "🔔" };
      toast(style.ton, n.titre, n.corps, {
        icone: style.icone,
        onPress: () => naviguer(...destination(n)),
      });
      rafraichir();
    });
  }, [toast, rafraichir]);

  // À chaque (re)connexion, on resynchronise : une notification arrivée pendant
  // une coupure réseau ne doit pas passer inaperçue.
  useEffect(() => {
    return surEtatSocket((etat) => {
      setEnLigne(etat === "en_ligne");
      if (etat === "en_ligne") rafraichir();
    });
  }, [rafraichir]);

  // Repli si le temps réel reste coupé (réseau instable, veille du téléphone).
  useEffect(() => {
    rafraichir();
    const minuterie = setInterval(rafraichir, 60000);
    return () => clearInterval(minuterie);
  }, [rafraichir]);

  return (
    <ContexteNotifications.Provider value={{ nonLues, rafraichir, enLigne }}>
      {children}
    </ContexteNotifications.Provider>
  );
}

export function useNotifications() {
  return useContext(ContexteNotifications);
}
