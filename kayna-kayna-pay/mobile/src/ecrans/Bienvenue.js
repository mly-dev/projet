import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bouton } from "../composants/Base";
import { couleurs } from "../theme";

export default function Bienvenue({ navigation }) {
  return (
    <SafeAreaView style={styles.fond}>
      <View style={styles.centre}>
        <Text style={styles.marque}>KAYNA KAYNA PAY</Text>
        <Text style={styles.sousTitre}>« Petit à petit, paye »</Text>
        <View style={styles.barre}>
          <View style={styles.barreFond} />
          <View style={styles.barreRemplie} />
          <View style={styles.curseur} />
        </View>
        <Text style={styles.texte}>
          Choisissez un produit, versez par mobile money à votre rythme — même 100 F —
          et recevez-le une fois le montant complété. Garanti.
        </Text>
      </View>
      <View style={styles.bas}>
        <Bouton libelle="Créer mon compte" variante="ambre" onPress={() => navigation.navigate("Inscription")} />
        <View style={{ height: 10 }} />
        <Bouton libelle="J'ai déjà un compte" onPress={() => navigation.navigate("Connexion")} />
        <Text style={styles.slogan}>« Kayan si djineh koy yan gandji »</Text>
        <Text style={styles.sloganTr}>Faire petit n'empêche pas d'avancer</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.bleuFonce, padding: 24 },
  centre: { flex: 1, justifyContent: "center" },
  marque: { color: couleurs.blanc, fontSize: 30, fontWeight: "900", textAlign: "center", letterSpacing: 1 },
  sousTitre: { color: couleurs.blanc, fontSize: 16, fontStyle: "italic", textAlign: "center", marginTop: 6, opacity: 0.9 },
  barre: { height: 12, marginVertical: 28, justifyContent: "center" },
  barreFond: { position: "absolute", left: 30, right: 30, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF30" },
  barreRemplie: { position: "absolute", left: 30, width: "55%", height: 12, borderRadius: 6, backgroundColor: couleurs.ambre },
  curseur: {
    position: "absolute", left: "58%", width: 22, height: 22, borderRadius: 11,
    backgroundColor: couleurs.blanc, borderWidth: 3, borderColor: couleurs.ambre,
  },
  texte: { color: "#DBE8F5", fontSize: 15, lineHeight: 22, textAlign: "center", paddingHorizontal: 8 },
  bas: { paddingBottom: 12 },
  slogan: { color: couleurs.ambre, fontStyle: "italic", textAlign: "center", marginTop: 22, fontSize: 13.5 },
  sloganTr: { color: "#DBE8F5", textAlign: "center", marginTop: 3, fontSize: 12.5 },
});
