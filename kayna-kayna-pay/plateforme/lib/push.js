// Notifications push — interface unique. En production : Firebase Cloud
// Messaging (via jetons d'appareil enregistrés). En développement : journal.
async function envoyerPush(userId, titre, corps, donnees = {}) {
  console.log(`[PUSH → user ${userId}] ${titre} — ${corps}`);
  return { ok: true };
}

module.exports = { envoyerPush };
