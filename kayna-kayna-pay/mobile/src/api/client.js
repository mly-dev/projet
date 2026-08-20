import AsyncStorage from "@react-native-async-storage/async-storage";

// Adresse de la plateforme.
//
// Elle est inscrite à la construction (EXPO_PUBLIC_API_URL), mais reste
// modifiable depuis l'application. C'est indispensable pour un APK installé à
// la main : les box attribuent les adresses dynamiquement, et une adresse
// figée condamnerait l'application à la première réattribution — il faudrait
// reconstruire un APK pour un chiffre qui change.
//
// L'adresse choisie par l'utilisateur l'emporte sur celle de la construction,
// et survit au redémarrage.

const ADRESSE_CONSTRUCTION = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const CLE = "kkp_adresse_serveur";

let adresse = ADRESSE_CONSTRUCTION;

export function baseUrl() {
  return adresse;
}

export function adresseDeConstruction() {
  return ADRESSE_CONSTRUCTION;
}

// Appelée une fois au démarrage, avant toute requête.
export async function chargerAdresse() {
  const enregistree = await AsyncStorage.getItem(CLE);
  if (enregistree) adresse = enregistree;
  return adresse;
}

// Normalise ce que saisit l'utilisateur : « 192.168.1.10 » suffit.
export function normaliserAdresse(saisie) {
  let v = String(saisie || "").trim().replace(/\s+/g, "");
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = "http://" + v;
  v = v.replace(/\/+$/, "");
  // Sans port explicite en http, la plateforme écoute sur 3000.
  if (/^http:\/\/[^/:]+$/i.test(v)) v = v + ":3000";
  try {
    const u = new URL(v);
    // `new URL` est très permissif : « pas une adresse !! » lui convient. On
    // exige donc un nom d'hôte plausible, sans quoi l'écran répondrait
    // « injoignable » là où « adresse invalide » est la vraie réponse.
    if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(u.hostname)) return null;
  } catch (e) {
    return null;
  }
  return v;
}

export async function definirAdresse(valeur) {
  const propre = normaliserAdresse(valeur);
  if (!propre) throw new Error("Adresse invalide.");
  adresse = propre;
  await AsyncStorage.setItem(CLE, propre);
  return propre;
}

export async function reinitialiserAdresse() {
  adresse = ADRESSE_CONSTRUCTION;
  await AsyncStorage.removeItem(CLE);
  return adresse;
}

// Une panne d'adresse a plusieurs causes, et elles n'appellent pas le même
// geste. Distinguer « le tunnel est mort » de « la plateforme est éteinte » de
// « mauvaise adresse » évite à celui qui essaie de tout reprendre au hasard.
//
// Les codes viennent de l'usage réel d'un tunnel Cloudflare :
//   530  le tunnel n'est plus enregistré (erreur Cloudflare 1033)
//   502  le tunnel répond, mais rien n'écoute derrière, sur le port 3000
function diagnostic(statut, adresse) {
  const parTunnel = /trycloudflare\.com|\.ngrok(-free)?\.(io|app|dev)/i.test(adresse);
  if (statut === 530 || statut === 1033) {
    return parTunnel
      ? "Le tunnel n'est plus actif. Demandez la nouvelle adresse : elle change à chaque redémarrage."
      : "Le serveur n'est plus joignable à cette adresse.";
  }
  if (statut === 502 || statut === 503 || statut === 504) {
    return parTunnel
      ? "Le tunnel fonctionne, mais la plateforme n'est pas démarrée sur l'ordinateur."
      : "Le serveur ne répond pas encore. Attendez qu'il ait fini de démarrer.";
  }
  if (statut === 404) return "Ce n'est pas une plateforme Kayna Kayna Pay.";
  if (statut === 403 || statut === 401) return "Cette adresse refuse la connexion.";
  return `Le serveur a répondu ${statut}.`;
}

// Vérifie qu'une adresse répond bien, avant de l'enregistrer : mieux vaut le
// dire tout de suite que laisser le client découvrir la panne à la connexion.
export async function testerAdresse(valeur, delaiMs = 6000) {
  const propre = normaliserAdresse(valeur);
  if (!propre) return { ok: false, erreur: "Adresse invalide." };

  const abandon = new AbortController();
  const minuterie = setTimeout(() => abandon.abort(), delaiMs);
  try {
    const res = await fetch(propre + "/api/categories", { signal: abandon.signal });
    if (!res.ok) return { ok: false, erreur: diagnostic(res.status, propre) };

    // Une page d'erreur de tunnel arrive parfois en 200 avec du HTML. Sans ce
    // contrôle, l'échec de lecture était rejeté plus bas en « injoignable »,
    // ce qui désigne la mauvaise cause.
    let corps;
    try {
      corps = await res.json();
    } catch (e) {
      return { ok: false, erreur: "Cette adresse répond, mais ce n'est pas la plateforme." };
    }
    if (!corps || !Array.isArray(corps.categories)) {
      return { ok: false, erreur: "Ce n'est pas une plateforme Kayna Kayna Pay." };
    }
    return { ok: true, categories: corps.categories.length };
  } catch (e) {
    if (e.name === "AbortError") {
      return {
        ok: false,
        erreur: /^https:/i.test(propre)
          ? "Aucune réponse. L'ordinateur qui héberge la plateforme est peut-être éteint ou en veille."
          : "Aucune réponse. Vérifiez que le téléphone et l'ordinateur sont sur le même Wi-Fi.",
      };
    }
    return { ok: false, erreur: "Serveur injoignable à cette adresse." };
  } finally {
    clearTimeout(minuterie);
  }
}

export async function jeton() {
  return AsyncStorage.getItem("kkp_jeton");
}

export async function enregistrerSession(jetonValeur, utilisateur) {
  await AsyncStorage.setItem("kkp_jeton", jetonValeur);
  await AsyncStorage.setItem("kkp_utilisateur", JSON.stringify(utilisateur));
}

export async function sessionEnregistree() {
  const [j, u] = await Promise.all([
    AsyncStorage.getItem("kkp_jeton"),
    AsyncStorage.getItem("kkp_utilisateur"),
  ]);
  return j && u ? { jeton: j, utilisateur: JSON.parse(u) } : null;
}

export async function effacerSession() {
  await AsyncStorage.multiRemove(["kkp_jeton", "kkp_utilisateur"]);
}

export async function api(chemin, options = {}) {
  const j = await jeton();
  let res;
  try {
    res = await fetch(baseUrl() + chemin, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(j ? { Authorization: `Bearer ${j}` } : {}),
      },
      body: options.corps ? JSON.stringify(options.corps) : undefined,
    });
  } catch (e) {
    return {
      ok: false,
      erreur: "Connexion impossible. Vérifiez votre réseau, ou l'adresse du serveur dans votre profil.",
      reseau: true,
    };
  }
  try {
    const corps = await res.json();
    return { statut: res.status, ...corps };
  } catch (e) {
    return { ok: false, erreur: "Réponse du serveur illisible." };
  }
}
