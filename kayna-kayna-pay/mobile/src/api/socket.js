import { io } from "socket.io-client";
import { BASE_URL } from "./client";

let socket = null;

// Connexion temps réel : notifications instantanées (validation de versement,
// achat complété…). Reconnecté à chaque ouverture de session.
export function connecterSocket(jeton) {
  if (socket) socket.close();
  socket = io(BASE_URL, { auth: { jeton }, transports: ["websocket"] });
  return socket;
}

export function surNotification(rappel) {
  if (!socket) return () => {};
  socket.on("notification", rappel);
  return () => socket.off("notification", rappel);
}

export function fermerSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
