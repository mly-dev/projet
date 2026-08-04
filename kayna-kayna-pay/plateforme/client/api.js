// Aides côté navigateur (espaces web admin et partenaire).
//
// Le jeton de session n'est JAMAIS manipulé ici : il vit dans un cookie
// httpOnly que le navigateur joint automatiquement à chaque requête de même
// origine. Le JavaScript de la page ne peut pas le lire, donc une faille XSS
// ne permet pas de voler la session. Seul le profil affiché (nom, rôle) est
// conservé localement — ce n'est pas un identifiant de connexion.

export function utilisateur() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("kkp_utilisateur") || "null");
  } catch (e) {
    return null;
  }
}

export function enregistrerSession(utilisateurValeur) {
  window.localStorage.setItem("kkp_utilisateur", JSON.stringify(utilisateurValeur));
}

function oublierProfil() {
  window.localStorage.removeItem("kkp_utilisateur");
  // Nettoyage d'une éventuelle session laissée par une version antérieure
  window.localStorage.removeItem("kkp_jeton");
}

export async function deconnexion() {
  try {
    await fetch("/api/auth/deconnexion", { method: "POST", credentials: "same-origin" });
  } catch (e) {
    // Le cookie expirera de lui-même ; on sort de toute façon.
  }
  oublierProfil();
  window.location.href = "/";
}

export async function api(chemin, options = {}) {
  const res = await fetch(chemin, {
    method: options.method || "GET",
    credentials: "same-origin", // joint le cookie de session
    headers: { "Content-Type": "application/json" },
    body: options.corps ? JSON.stringify(options.corps) : undefined,
  });
  const corps = await res.json();
  if (res.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/") {
    oublierProfil();
    window.location.href = "/";
  }
  return { statut: res.status, ...corps };
}

export function fcfa(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " F";
}
