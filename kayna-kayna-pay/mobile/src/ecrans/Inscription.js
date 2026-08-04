import React, { useState } from "react";
import { View, Text, Switch, Alert } from "react-native";
import { Ecran, Champ, Bouton } from "../composants/Base";
import { api } from "../api/client";
import { couleurs } from "../theme";

export default function Inscription({ navigation }) {
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [cgu, setCgu] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function soumettre() {
    if (!cgu) {
      return Alert.alert(
        "Conditions d'utilisation",
        "Vous devez accepter les conditions générales d'utilisation et la politique de confidentialité pour créer un compte."
      );
    }
    setEnCours(true);
    const r = await api("/api/auth/inscription", {
      method: "POST",
      corps: { telephone, nom, mot_de_passe: motDePasse, cgu_acceptees: true },
    });
    setEnCours(false);
    if (!r.ok) return Alert.alert("Inscription impossible", r.erreur);
    navigation.navigate("VerificationOtp", { telephone: r.telephone });
  }

  return (
    <Ecran titre="Créer mon compte" retour navigation={navigation}>
      <Champ
        libelle="Numéro de téléphone (identifiant)"
        placeholder="90 00 00 00"
        keyboardType="phone-pad"
        value={telephone}
        onChangeText={setTelephone}
      />
      <Champ libelle="Nom complet" placeholder="Votre nom et prénom" value={nom} onChangeText={setNom} />
      <Champ
        libelle="Mot de passe (6 caractères minimum)"
        secureTextEntry
        value={motDePasse}
        onChangeText={setMotDePasse}
      />
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
        <Switch value={cgu} onValueChange={setCgu} trackColor={{ true: couleurs.bleu }} />
        <Text style={{ flex: 1, marginLeft: 10, color: couleurs.encre, fontSize: 13 }}>
          J'accepte les{" "}
          <Text style={{ color: couleurs.bleu }} onPress={() => navigation.navigate("Contenu", { cle: "cgu" })}>
            conditions générales d'utilisation
          </Text>{" "}
          et la{" "}
          <Text style={{ color: couleurs.bleu }} onPress={() => navigation.navigate("Contenu", { cle: "confidentialite" })}>
            politique de confidentialité
          </Text>
          .
        </Text>
      </View>
      <Bouton libelle={enCours ? "Envoi du code…" : "Recevoir mon code par SMS"} onPress={soumettre} desactive={enCours} />
      <Text style={{ color: couleurs.gris, fontSize: 12.5, marginTop: 14, textAlign: "center" }}>
        Un code de vérification vous sera envoyé par SMS pour confirmer votre numéro.
      </Text>
    </Ecran>
  );
}
