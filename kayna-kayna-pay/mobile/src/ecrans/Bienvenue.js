import React from "react";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bouton, Lien } from "../composants/Base";
import { couleurs, espace, rayon } from "../theme";

// Premier écran : il doit répondre en dix secondes à « c'est quoi, et
// qu'est-ce que ça m'apporte ? ». Les trois promesses sont là pour ça.
const PROMESSES = [
  ["🪙", "Versez ce que vous pouvez", "Dès 100 F, quand vous voulez, sans engagement."],
  ["🔒", "Votre argent est gardé", "Conservé par la plateforme jusqu'à la remise du produit."],
  ["🏷️", "Le prix ne bouge pas", "Le prix affiché au départ est celui que vous payez."],
];

export default function Bienvenue({ navigation }) {
  return (
    <SafeAreaView style={styles.fond}>
      <ScrollView contentContainerStyle={styles.defilement} showsVerticalScrollIndicator={false}>
        <View style={styles.centre}>
          <Image
            source={require("../../assets/logo-marque-blanc.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.marque}>KAYNA KAYNA PAY</Text>
          <Text style={styles.sousTitre}>« Petit à petit, paye »</Text>

          <View style={styles.promesses}>
            {PROMESSES.map(([icone, titre, detail]) => (
              <View key={titre} style={styles.promesse}>
                <Text style={styles.promesseIcone}>{icone}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.promesseTitre}>{titre}</Text>
                  <Text style={styles.promesseDetail}>{detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bas}>
          <Bouton
            libelle="Créer mon compte"
            variante="ambre"
            onPress={() => navigation.navigate("Inscription")}
          />
          <View style={{ height: espace.md }} />
          <Bouton
            libelle="J'ai déjà un compte"
            variante="secondaire"
            onPress={() => navigation.navigate("Connexion")}
          />
          <Lien
            libelle="Configurer l'adresse du serveur"
            onPress={() => navigation.navigate("Serveur")}
            style={{ color: "#9FBEDA", fontSize: 12.5, marginTop: espace.lg }}
          />
          <Text style={styles.slogan}>« Kayan si djineh koy yan gandji »</Text>
          <Text style={styles.sloganTr}>Faire petit n'empêche pas d'avancer</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.bleuNuit },
  defilement: { flexGrow: 1, padding: espace.xl, paddingBottom: espace.lg },
  centre: { flex: 1, justifyContent: "center", paddingTop: espace.xl },
  logo: { width: 116, height: 116, alignSelf: "center", marginBottom: espace.xl },
  marque: {
    color: couleurs.blanc,
    fontSize: 29,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1.2,
  },
  sousTitre: {
    color: couleurs.ambre,
    fontSize: 15.5,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 6,
  },

  promesses: { marginTop: espace.xxl, gap: espace.md },
  promesse: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espace.md,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: rayon.lg,
    padding: espace.lg,
  },
  promesseIcone: { fontSize: 20, marginTop: 1 },
  promesseTitre: { color: couleurs.blanc, fontSize: 14.5, fontWeight: "800" },
  promesseDetail: { color: "#C7DDF0", fontSize: 12.8, lineHeight: 18, marginTop: 2 },

  bas: { paddingTop: espace.xxl },
  slogan: {
    color: couleurs.ambre,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: espace.xl,
    fontSize: 13.5,
  },
  sloganTr: { color: "#9FBEDA", textAlign: "center", marginTop: 3, fontSize: 12 },
});
