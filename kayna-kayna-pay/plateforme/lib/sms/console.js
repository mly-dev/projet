// Fournisseur SMS de développement : écrit le message dans les journaux du
// serveur au lieu d'envoyer un vrai SMS.
async function envoyer(telephone, message) {
  console.log(`[SMS → ${telephone}] ${message}`);
  return { ok: true };
}

module.exports = { envoyer };
