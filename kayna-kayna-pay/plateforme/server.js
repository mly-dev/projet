// Serveur Kayna Kayna Pay : Next.js (API + espaces web) + Socket.io (temps réel).
require("dotenv").config();
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { verifierJetonSession, jetonDuCookieBrut } = require("./lib/auth");
const { balayerMinuteurs } = require("./lib/versements");
const config = require("./lib/config");

// Une configuration dangereuse arrête le serveur avant qu'il n'écoute : voir
// lib/config.js. Hors production, ces mêmes contrôles ne font qu'avertir.
config.controlerOuArreter();

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
// Les hébergeurs joignent le conteneur depuis l'extérieur : écouter sur
// 127.0.0.1 le rendrait injoignable, et la panne se présente comme un
// déploiement qui « ne répond pas » sans rien dans les journaux.
const hote = process.env.HOST || "0.0.0.0";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const serveur = http.createServer((req, res) => handle(req, res));

  // Socket.io accepte toute origine : l'application mobile n'en a pas, et les
  // espaces web sont servis par ce même serveur. L'authentification se joue
  // sur le jeton ci-dessous, pas sur l'origine.
  const io = new Server(serveur, { cors: { origin: "*" } });
  global._io = io;

  // Authentification des sockets ; salons par utilisateur + salon « admins »
  // pour la file de validation en temps réel. Le jeton vient de la poignée de
  // main (application mobile) ou du cookie httpOnly (espaces web) — dans ce
  // dernier cas le navigateur l'envoie seul, la page ne peut pas le lire.
  io.use((socket, suivant) => {
    try {
      const token =
        (socket.handshake.auth && socket.handshake.auth.jeton) ||
        jetonDuCookieBrut(socket.handshake.headers.cookie);
      if (!token) return suivant(new Error("Jeton requis."));
      socket.donnees = verifierJetonSession(token);
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
  const minuteurs = setInterval(() => {
    balayerMinuteurs().catch((e) => console.error("Balayage minuteurs :", e.message));
  }, 60 * 1000);

  serveur.listen(port, hote, () => {
    console.log(`\nKayna Kayna Pay — plateforme à l'écoute sur ${hote}:${port}`);
    console.log(config.resume());
    console.log("");
  });

  // Un hébergeur remplace l'ancienne version par la nouvelle en envoyant
  // SIGTERM. Sans cette écoute, le processus est tué net : les requêtes en
  // cours sont coupées et un client peut voir échouer un versement qui vient
  // pourtant d'être écrit. On cesse d'accepter, on laisse finir, puis on sort.
  let enArret = false;
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => {
      if (enArret) return;
      enArret = true;
      console.log(`\n${signal} reçu — arrêt en cours, requêtes en vol laissées finir.`);
      clearInterval(minuteurs);
      io.close();
      serveur.close(() => {
        console.log("Arrêt propre.");
        process.exit(0);
      });
      // Filet : si une connexion reste ouverte, ne pas bloquer le déploiement.
      setTimeout(() => {
        console.warn("Délai dépassé — arrêt forcé.");
        process.exit(0);
      }, 10000).unref();
    });
  }
});
