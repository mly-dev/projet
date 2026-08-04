import React, { useState } from "react";
import { Text, Alert } from "react-native";
import { Ecran, Champ, Bouton } from "../composants/Base";
import { api } from "../api/client";
import { useAuth } from "../contexte/Auth";
import { couleurs } from "../theme";

export default function VerificationOtp({ route, navigation }) {
  const { telephone } = route.params;
  const { ouvrirSession } = useAuth();
  const [code, setCode] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function verifier() {
    setEnCours(true);
    const r = await api("/api/auth/verifier-otp", { method: "POST", corps: { telephone, code } });
    setEnCours(false);
    if (!r.ok) return Alert.alert("Vérification impossible", r.erreur);
    await ouvrirSession(r.jeton, r.utilisateur);
  }

  return (
    <Ecran titre="Vérification du numéro" retour navigation={navigation}>
      <Text style={{ color: couleurs.encre, fontSize: 14.5, marginBottom: 16, lineHeight: 21 }}>
        Un code à 6 chiffres a été envoyé par SMS au {telephone}. Saisissez-le pour activer votre compte.
      </Text>
      <Champ
        libelle="Code reçu par SMS"
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <Bouton libelle={enCours ? "Vérification…" : "Confirmer"} onPress={verifier} desactive={enCours || code.length < 6} />
    </Ecran>
  );
}
