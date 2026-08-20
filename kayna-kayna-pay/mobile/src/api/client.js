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
    // eslint-disable-next-line no-new
    new URL(v);
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

// Vérifie qu'une adresse répond bien, avant de l'enregistrer : mieux vaut le
// dire tout de suite que laisser le client découvrir la panne à la connexion.
export async function testerAdresse(valeur, delaiMs = 6000) {
  const propre = normaliserAdresse(valeur);
  if (!propre) return { ok: false, erreur: "Adresse invalide." };

  const abandon = new AbortController();
  const minuterie = setTimeout(() => abandon.abort(), delaiMs);
  try {
    const res = await fetch(propre + "/api/categories", { signal: abandon.signal });
    if (!res.ok) return { ok: false, erreur: `Le serveur a répondu ${res.status}.` };
    const corps = await res.json();
    if (!corps || !Array.isArray(corps.categories)) {
      return { ok: false, erreur: "Ce n'est pas une plateforme Kayna Kayna Pay." };
    }
    return { ok: true, categories: corps.categories.length };
  } catch (e) {
    return {
      ok: false,
      erreur:
        e.name === "AbortError"
          ? "Aucune réponse. Vérifiez que le téléphone et l'ordinateur sont sur le même Wi-Fi."
          : "Serveur injoignable à cette adresse.",
    };
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
