import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";
import { api, fcfa } from "../client/api";
import { useToast } from "./Toasts";

// Temps réel de l'espace d'administration.
//
// La connexion vivait auparavant dans la seule page de la file de validation :
// dès qu'on la quittait pour le catalogue ou les utilisateurs, plus rien
// n'arrivait — ni bandeau, ni compteur. Un versement pouvait attendre sans que
// personne à l'écran ne le sache.
//
// Elle est donc montée dans la coquille, une fois pour toutes les pages. Les
// pages qui ont besoin des événements bruts s'y abonnent, comme la file.

const ContexteDirect = createContext({
  direct: false,
  aTraiter: 0,
  rafraichir: () => {},
  surEvenement: () => () => {},
});

export function FournisseurDirect({ children }) {
  const toast = useToast();
  const router = useRouter();
  const [direct, setDirect] = useState(false);
  const [aTraiter, setATraiter] = useState(0);
  const abonnes = useRef(new Set());

  const rafraichir = useCallback(async () => {
    const r = await api("/api/admin/stats");
    if (r.ok) setATraiter(r.stats.versements_a_traiter);
  }, []);

  const surEvenement = useCallback((rappel) => {
    abonnes.current.add(rappel);
    return () => abonnes.current.delete(rappel);
  }, []);

  const diffuser = useCallback((nom, donnees) => {
    abonnes.current.forEach((rappel) => {
      try {
        rappel(nom, donnees);
      } catch (e) {
        console.warn("[direct] abonné en erreur :", e.message);
      }
    });
  }, []);

  // Hors de l'espace d'administration — page de connexion, espace partenaire —
  // il n'y a ni file à surveiller ni droit de la consulter : on ne se connecte
  // pas, et on n'appelle pas une route qui répondrait 401.
  const espaceAdmin = router.pathname.startsWith("/admin");

  useEffect(() => {
    if (!espaceAdmin) {
      setDirect(false);
      setATraiter(0);
      return undefined;
    }

    const socket = io({ withCredentials: true });

    socket.on("connect", () => {
      setDirect(true);
      // À chaque reconnexion : ce qui s'est passé pendant la coupure ne doit
      // pas rester invisible.
      rafraichir();
    });
    socket.on("disconnect", () => setDirect(false));
    socket.on("connect_error", () => setDirect(false));

    socket.on("file:nouveau", (v) => {
      toast(
        "info",
        "Nouveau versement à valider",
        `${v.client_nom || "Un client"} — ${fcfa(v.montant_declare)} par ${String(v.operateur).toUpperCase()}`
      );
      rafraichir();
      diffuser("file:nouveau", v);
    });

    socket.on("file:verification", (d) => {
      toast(
        "attention",
        "Un versement passe en vérification",
        "Son minuteur de dix minutes a expiré. Il reste validable."
      );
      rafraichir();
      diffuser("file:verification", d);
    });

    socket.on("file:traite", (d) => {
      // Traité par un collègue, ou par soi-même : le compteur doit descendre
      // dans les deux cas, sur tous les postes ouverts.
      rafraichir();
      diffuser("file:traite", d);
    });

    // Repli si le temps réel est coupé (réseau, veille du poste).
    const rythme = setInterval(rafraichir, 45000);
    rafraichir();

    return () => {
      socket.close();
      clearInterval(rythme);
    };
  }, [espaceAdmin, toast, rafraichir, diffuser]);

  // Les événements de la file conduisent tous au même endroit : on y va d'un
  // clic depuis n'importe quelle page.
  const allerALaFile = useCallback(() => router.push("/admin/file"), [router]);

  return (
    <ContexteDirect.Provider value={{ direct, aTraiter, rafraichir, surEvenement, allerALaFile }}>
      {children}
    </ContexteDirect.Provider>
  );
}

export function useDirect() {
  return useContext(ContexteDirect);
}
