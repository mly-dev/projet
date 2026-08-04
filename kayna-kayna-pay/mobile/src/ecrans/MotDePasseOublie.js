import React, { useState } from "react";
import { Text, Alert } from "react-native";
import { Ecran, Champ, Bouton } from "../composants/Base";
import { api } from "../api/client";
import { useAuth } from "../contexte/Auth";
import { couleurs } from "../theme";

export default function MotDePasseOublie({ navigation }) {
  const { ouvrirSession } = useAuth();
  const [etape, setEtape] = useState(1);
  const [telephone, setTelephone] = useState("");
  const [code, setCode] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function demanderCode() {
    setEnCours(true);
    const r = await api("/api/auth/mot-de-passe-oublie", { method: "POST", corps: { telephone } });
    setEnCours(false);
    if (!r.ok) return Alert.alert("Erreur", r.erreur);
    setEtape(2);
  }

  async function reinitialiser() {
    setEnCours(true);
    const r = await api("/api/auth/reinitialiser", {
      method: "POST",
      corps: { telephone, code, nouveau_mot_de_passe: nouveau },
    });
    setEnCours(false);
    if (!r.ok) return Alert.alert("Erreur", r.erreur);
    await ouvrirSession(r.jeton, r.utilisateur);
  }

  return (
    <Ecran titre="Mot de passe oublié" retour navigation={navigation}>
      {etape === 1 ? (
        <>
          <Text style={{ color: couleurs.encre, marginBottom: 16, fontSize: 14.5 }}>
            Saisissez votre numéro : un code de réinitialisation vous sera envoyé par SMS.
          </Text>
          <Champ
            libelle="Numéro de téléphone"
            placeholder="90 00 00 00"
            keyboardType="phone-pad"
            value={telephone}
            onChangeText={setTelephone}
          />
          <Bouton libelle={enCours ? "Envoi…" : "Recevoir le code"} onPress={demanderCode} desactive={enCours} />
        </>
      ) : (
        <>
          <Champ
            libelle="Code reçu par SMS"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <Champ libelle="Nouveau mot de passe" secureTextEntry value={nouveau} onChangeText={setNouveau} />
          <Bouton libelle={enCours ? "…" : "Réinitialiser et me connecter"} onPress={reinitialiser} desactive={enCours} />
        </>
      )}
    </Ecran>
  );
}
