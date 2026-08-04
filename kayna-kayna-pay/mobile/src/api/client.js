import AsyncStorage from "@react-native-async-storage/async-storage";

// Adresse du serveur : sur un téléphone (Expo Go), remplacez par l'adresse
// IP locale de la machine qui fait tourner la plateforme, par exemple
// EXPO_PUBLIC_API_URL=http://192.168.1.10:3000 npx expo start
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

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
    res = await fetch(BASE_URL + chemin, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(j ? { Authorization: `Bearer ${j}` } : {}),
      },
      body: options.corps ? JSON.stringify(options.corps) : undefined,
    });
  } catch (e) {
    return { ok: false, erreur: "Connexion impossible. Vérifiez votre réseau et réessayez." };
  }
  try {
    const corps = await res.json();
    return { statut: res.status, ...corps };
  } catch (e) {
    return { ok: false, erreur: "Réponse du serveur illisible." };
  }
}
