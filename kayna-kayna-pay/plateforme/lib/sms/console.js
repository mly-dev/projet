// Fournisseur SMS de développement : affiche le message dans la console du
// serveur au lieu d'envoyer un vrai SMS.
//
// Le code est encadré parce qu'il doit être repérable d'un coup d'œil au milieu
// des lignes de compilation de Next.js. C'est la première source de confusion au
// premier essai : on recopie un code d'exemple, ou un code déjà périmé.

const LARGEUR = 58;

function extraireCode(message) {
  const m = String(message).match(/\b(\d{6})\b/);
  return m ? m[1] : null;
}

function ligneCentree(texte) {
  const marge = Math.max(0, Math.floor((LARGEUR - texte.length) / 2));
  const contenu = " ".repeat(marge) + texte;
  return "  │" + contenu + " ".repeat(Math.max(0, LARGEUR - contenu.length)) + "│";
}

function encadre(telephone, code) {
  const bord = "─".repeat(LARGEUR);
  return [
    "",
    "  ┌" + bord + "┐",
    ligneCentree("SMS de développement — aucun message réel envoyé"),
    ligneCentree("pour " + telephone),
    ligneCentree(""),
    ligneCentree("CODE :  " + code.split("").join(" ")),
    ligneCentree(""),
    ligneCentree("valable 10 minutes, utilisable une seule fois"),
    "  └" + bord + "┘",
    "",
  ].join("\n");
}

async function envoyer(telephone, message) {
  const code = extraireCode(message);
  console.log(code ? encadre(telephone, code) : `[SMS → ${telephone}] ${message}`);
  return { ok: true };
}

module.exports = { envoyer };
