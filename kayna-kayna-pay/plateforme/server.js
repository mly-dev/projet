// Serveur Kayna Kayna Pay : Next.js (API + espaces web) + Socket.io (temps réel).
require("dotenv").config();
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { verifierJeton } = require("./lib/auth");
const { balayerMinuteurs } = require("./lib/versements");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const serveur = http.createServer((req, res) => handle(req, res));

  const io = new Server(serveur, { cors: { origin: "*" } });
  global._io = io;

  // Authentification des sockets par jeton ; salons par utilisateur + salon
  // « admins » pour la file de validation en temps réel.
  io.use((socket, suivant) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.jeton;
      if (!token) return suivant(new Error("Jeton requis."));
      socket.donnees = verifierJeton(token);
      suivant();
    } catch (e) {
      suivant(new Error("Jeton invalide."));
    }
  });

  io.on("connection", (socket) => {
    const { uid, role } = socket.donnees;
    socket.join(`user:${uid}`);
    if (role === "admin" || role === "superadmin") socket.join("admins");
  });

  // Balayage du minuteur des versements (10 min → « en vérification »).
  setInterval(() => {
    balayerMinuteurs().catch((e) => console.error("Balayage minuteurs :", e.message));
  }, 60 * 1000);

  serveur.listen(port, () => {
    console.log(`Kayna Kayna Pay — plateforme démarrée sur http://localhost:${port}`);
  });
});
