const { query } = require("./db");
const { envoyerPush } = require("./push");

function io() {
  return global._io || null;
}

// Notification complète : enregistrement en base + socket temps réel + push.
async function notifier(userId, type, titre, corps, donnees = {}) {
  const r = await query(
    `INSERT INTO notifications (user_id, type, titre, corps, donnees)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, titre, corps, JSON.stringify(donnees)]
  );
  const notif = r.rows[0];
  if (io()) io().to(`user:${userId}`).emit("notification", notif);
  await envoyerPush(userId, titre, corps, donnees);
  return notif;
}

// Événement destiné à la file de validation de l'espace admin.
function emettreAdmins(evenement, donnees) {
  if (io()) io().to("admins").emit(evenement, donnees);
}

module.exports = { notifier, emettreAdmins };
