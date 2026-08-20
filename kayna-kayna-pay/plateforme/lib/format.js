// Mise en forme des montants côté serveur.
//
// Les notifications et les messages d'erreur sont lus par le client : un
// montant y apparaît tel quel, sans passer par la mise en forme du navigateur
// ou de l'application. « 81900 F » se lit mal et se vérifie mal quand on
// compare avec le SMS de son opérateur ; « 81 900 F » se lit d'un coup d'œil.
//
// L'espace utilisé est l'espace insécable étroit (U+202F), conforme à l'usage
// francophone et qui n'introduit jamais de retour à la ligne au milieu d'un
// montant.
const SEPARATEUR = " ";

function fcfa(montant) {
  const n = Math.round(Number(montant) || 0);
  return `${n.toLocaleString("fr-FR").replace(/ |\s/g, SEPARATEUR)}${SEPARATEUR}F`;
}

module.exports = { fcfa };
