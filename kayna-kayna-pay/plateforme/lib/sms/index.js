// Passerelle SMS — abstraction. La passerelle locale réelle (à sélectionner,
// cf. cahier des charges §9.1) s'ajoutera ici comme un nouveau fournisseur
// sans toucher au reste du code.
const console_ = require("./console");

const fournisseurs = { console: console_ };

function passerelle() {
  const nom = process.env.SMS_FOURNISSEUR || "console";
  return fournisseurs[nom] || console_;
}

async function envoyerSms(telephone, message) {
  return passerelle().envoyer(telephone, message);
}

module.exports = { envoyerSms };
