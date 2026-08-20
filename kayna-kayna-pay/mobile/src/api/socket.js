import { io } from "socket.io-client";
import { baseUrl } from "./client";

// Connexion temps réel : notifications instantanées (validation de versement,
// achat complété…).
//
// Les abonnés sont tenus ici, dans un ensemble, et non sur l'instance socket.
// C'est ce qui rend l'abonnement indépendant du cycle de vie de la connexion :
// un écran peut s'abonner avant que la connexion soit ouverte, et il continue
// de recevoir après une reconnexion. La version précédente posait l'écouteur
// directement sur l'instance et rendait un abonnement mort quand celle-ci
// n'existait pas encore.

let socket = null;
const abonnesNotification = new Set();
const abonnesEtat = new Set();

// hors_ligne → connexion → en_ligne
let etat = "hors_ligne";

function diffuser(ensemble, valeur) {
  ensemble.forEach((rappel) => {
    try {
      rappel(valeur);
    } catch (e) {
      console.warn("[socket] abonné en erreur :", e.message);
    }
  });
}

function changerEtat(nouvel) {
  if (etat === nouvel) return;
  etat = nouvel;
  diffuser(abonnesEtat, etat);
}

export function connecterSocket(jeton) {
  fermerSocket();
  changerEtat("connexion");

  socket = io(baseUrl(), {
    auth: { jeton },
    // Le WebSocket seul échoue en silence derrière certains réseaux mobiles et
    // proxys : sans repli en polling, plus aucune notification n'arrive et rien
    // ne le signale. L'ordre garde le WebSocket en premier quand il passe.
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 12000,
  });

  socket.on("connect", () => changerEtat("en_ligne"));
  socket.on("disconnect", (raison) => {
    changerEtat("hors_ligne");
    console.log("[socket] déconnecté :", raison);
  });
  socket.on("connect_error", (e) => {
    changerEtat("hors_ligne");
    // Visible dans la console Expo : c'est la seule trace quand le temps réel
    // ne marche pas, et la cause est presque toujours l'adresse du serveur.
    console.warn(
      `[socket] connexion impossible vers ${baseUrl()} — ${e.message}. ` +
        "Le téléphone doit joindre l'IP de l'ordinateur, pas localhost — corrigez l'adresse du serveur depuis le profil."
    );
  });

  socket.on("notification", (notif) => diffuser(abonnesNotification, notif));

  return socket;
}

// S'abonne aux notifications. Rend la fonction de désabonnement.
export function surNotification(rappel) {
  abonnesNotification.add(rappel);
  return () => abonnesNotification.delete(rappel);
}

// S'abonne à l'état de la connexion, et le reçoit immédiatement.
export function surEtatSocket(rappel) {
  abonnesEtat.add(rappel);
  rappel(etat);
  return () => abonnesEtat.delete(rappel);
}

export function etatSocket() {
  return etat;
}

export function fermerSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }
  changerEtat("hors_ligne");
}
