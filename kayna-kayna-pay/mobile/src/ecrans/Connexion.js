import React, { useState } from "react";
import { Text, Alert } from "react-native";
import { Ecran, Champ, Bouton } from "../composants/Base";
import { api } from "../api/client";
import { useAuth } from "../contexte/Auth";
import { couleurs } from "../theme";

export default function Connexion({ navigation }) {
  const { ouvrirSession } = useAuth();
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function soumettre() {
    setEnCours(true);
    const r = await api("/api/auth/connexion", {
      method: "POST",
      corps: { telephone, mot_de_passe: motDePasse },
    });
    setEnCours(false);
    if (!r.ok) return Alert.alert("Connexion impossible", r.erreur);
    if (r.utilisateur.role !== "client") {
      return Alert.alert("Espace réservé", "Cette application est destinée aux clients. Administrateurs et partenaires : utilisez l'espace web.");
    }
    await ouvrirSession(r.jeton, r.utilisateur);
  }

  return (
    <Ecran titre="Se connecter" retour navigation={navigation}>
      <Champ
        libelle="Numéro de téléphone"
        placeholder="90 00 00 00"
        keyboardType="phone-pad"
        value={telephone}
        onChangeText={setTelephone}
      />
      <Champ libelle="Mot de passe" secureTextEntry value={motDePasse} onChangeText={setMotDePasse} />
      <Bouton libelle={enCours ? "Connexion…" : "Se connecter"} onPress={soumettre} desactive={enCours} />
      <Text
        style={{ color: couleurs.bleu, textAlign: "center", marginTop: 18, fontSize: 14 }}
        onPress={() => navigation.navigate("MotDePasseOublie")}
      >
        Mot de passe oublié ?
      </Text>
    </Ecran>
  );
}
