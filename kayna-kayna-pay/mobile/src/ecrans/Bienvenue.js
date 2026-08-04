import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bouton } from "../composants/Base";
import { couleurs } from "../theme";

export default function Bienvenue({ navigation }) {
  return (
    <SafeAreaView style={styles.fond}>
      <View style={styles.centre}>
        <Image
          source={require("../../assets/logo-marque-blanc.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.marque}>KAYNA KAYNA PAY</Text>
        <Text style={styles.sousTitre}>« Petit à petit, paye »</Text>
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
  logo: { width: 130, height: 130, alignSelf: "center", marginBottom: 26 },
  marque: { color: couleurs.blanc, fontSize: 30, fontWeight: "900", textAlign: "center", letterSpacing: 1 },
  sousTitre: { color: couleurs.blanc, fontSize: 16, fontStyle: "italic", textAlign: "center", marginTop: 6, opacity: 0.9 },
  texte: { color: "#DBE8F5", fontSize: 15, lineHeight: 22, textAlign: "center", paddingHorizontal: 8, marginTop: 28 },
  bas: { paddingBottom: 12 },
  slogan: { color: couleurs.ambre, fontStyle: "italic", textAlign: "center", marginTop: 22, fontSize: 13.5 },
  sloganTr: { color: "#DBE8F5", textAlign: "center", marginTop: 3, fontSize: 12.5 },
});
