import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Ecran, Carte, Champ, Bouton } from "../composants/Base";
import { api } from "../api/client";
import { useAuth } from "../contexte/Auth";
import { couleurs } from "../theme";

export default function Profil({ navigation }) {
  const { utilisateur, fermerSession, supprimerCompte } = useAuth();
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function changerMotDePasse() {
    setEnCours(true);
    const r = await api("/api/profil", {
      method: "PUT",
      corps: { ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau },
    });
    setEnCours(false);
    if (!r.ok) return Alert.alert("Impossible", r.erreur);
    setAncien("");
    setNouveau("");
    Alert.alert("C'est fait", "Votre mot de passe a été changé.");
  }

  function confirmerSuppression() {
    Alert.alert(
      "Supprimer mon compte ?",
      "Vos données personnelles seront supprimées. Cette action est définitive.",
      [
        { text: "Annuler" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const r = await supprimerCompte();
            if (!r.ok) Alert.alert("Impossible", r.erreur);
          },
        },
      ]
    );
  }

  return (
    <Ecran titre="Mon profil">
      <Carte>
        <Text style={{ fontSize: 16, fontWeight: "800", color: couleurs.encre }}>{utilisateur.nom}</Text>
        <Text style={{ color: couleurs.gris, marginTop: 2 }}>{utilisateur.telephone}</Text>
      </Carte>

      <Carte>
        <Text style={{ fontWeight: "800", color: couleurs.bleuFonce, marginBottom: 10 }}>Changer mon mot de passe</Text>
        <Champ libelle="Ancien mot de passe" secureTextEntry value={ancien} onChangeText={setAncien} />
        <Champ libelle="Nouveau mot de passe" secureTextEntry value={nouveau} onChangeText={setNouveau} />
        <Bouton libelle={enCours ? "…" : "Changer"} onPress={changerMotDePasse} desactive={enCours || !ancien || !nouveau} />
      </Carte>

      <Carte>
        <Text style={{ fontWeight: "800", color: couleurs.bleuFonce, marginBottom: 8 }}>Informations</Text>
        {[
          ["Conditions générales d'utilisation", "cgu"],
          ["Politique de confidentialité", "confidentialite"],
          ["Aide / FAQ", "faq"],
          ["Nous contacter", "contact"],
        ].map(([libelle, cle]) => (
          <Text
            key={cle}
            style={{ color: couleurs.bleu, paddingVertical: 8, fontSize: 14.5 }}
            onPress={() => navigation.navigate("Contenu", { cle })}
          >
            {libelle} ›
          </Text>
        ))}
      </Carte>

      <Bouton libelle="Se déconnecter" variante="secondaire" onPress={fermerSession} />
      <Text
        style={{ color: couleurs.rouge, textAlign: "center", marginTop: 18, fontSize: 13.5 }}
        onPress={confirmerSuppression}
      >
        Supprimer mon compte
      </Text>
    </Ecran>
  );
}
