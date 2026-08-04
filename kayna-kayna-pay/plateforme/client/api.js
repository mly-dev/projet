// Aides côté navigateur (espaces web admin et partenaire).

export function jeton() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("kkp_jeton");
}

export function utilisateur() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("kkp_utilisateur") || "null");
  } catch (e) {
    return null;
  }
}

export function enregistrerSession(jetonValeur, utilisateurValeur) {
  window.localStorage.setItem("kkp_jeton", jetonValeur);
  window.localStorage.setItem("kkp_utilisateur", JSON.stringify(utilisateurValeur));
}

export function deconnexion() {
  window.localStorage.removeItem("kkp_jeton");
  window.localStorage.removeItem("kkp_utilisateur");
  window.location.href = "/";
}

export async function api(chemin, options = {}) {
  const res = await fetch(chemin, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(jeton() ? { Authorization: `Bearer ${jeton()}` } : {}),
    },
    body: options.corps ? JSON.stringify(options.corps) : undefined,
  });
  const corps = await res.json();
  if (res.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/") {
    deconnexion();
  }
  return { statut: res.status, ...corps };
}

export function fcfa(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " F";
}
