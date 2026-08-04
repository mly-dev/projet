import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { couleurs } from "../theme";

export function Ecran({ titre, retour, navigation, children, defiler = true, pied }) {
  const Contenu = defiler ? ScrollView : View;
  return (
    <SafeAreaView style={styles.ecran} edges={["top"]}>
      {titre ? (
        <View style={styles.entete}>
          {retour ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retour}>
              <Text style={styles.retourTexte}>‹</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.enteteTitre} numberOfLines={1}>
            {titre}
          </Text>
        </View>
      ) : null}
      <Contenu style={{ flex: 1 }} contentContainerStyle={defiler ? styles.defilement : null}>
        {children}
      </Contenu>
      {pied}
    </SafeAreaView>
  );
}

export function Bouton({ libelle, onPress, variante = "primaire", desactive, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={desactive}
      style={[
        styles.bouton,
        variante === "secondaire" && styles.boutonSecondaire,
        variante === "ambre" && styles.boutonAmbre,
        desactive && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={[styles.boutonTexte, variante === "secondaire" && { color: couleurs.bleu }]}>
        {libelle}
      </Text>
    </TouchableOpacity>
  );
}

export function Champ({ libelle, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {libelle ? <Text style={styles.libelle}>{libelle}</Text> : null}
      <TextInput
        style={styles.champ}
        placeholderTextColor={couleurs.gris}
        {...props}
      />
    </View>
  );
}

export function Progression({ ratio, hauteur = 10 }) {
  const pct = Math.max(0, Math.min(1, ratio || 0));
  return (
    <View style={[styles.progression, { height: hauteur, borderRadius: hauteur / 2 }]}>
      <View
        style={{
          width: `${pct * 100}%`,
          backgroundColor: pct >= 1 ? couleurs.vert : couleurs.bleu,
          height: "100%",
          borderRadius: hauteur / 2,
        }}
      />
    </View>
  );
}

export function Badge({ texte, ton = "bleu" }) {
  const fonds = {
    bleu: [couleurs.bleuClair, couleurs.bleu],
    vert: ["#E2F2E5", couleurs.vert],
    rouge: ["#FBE4E4", couleurs.rouge],
    ambre: ["#FFF3D6", "#9A6C00"],
  };
  const [fond, texteCouleur] = fonds[ton] || fonds.bleu;
  return (
    <View style={[styles.badge, { backgroundColor: fond }]}>
      <Text style={{ color: texteCouleur, fontSize: 11.5, fontWeight: "700" }}>{texte}</Text>
    </View>
  );
}

export function Carte({ children, style, onPress }) {
  const Composant = onPress ? TouchableOpacity : View;
  return (
    <Composant onPress={onPress} style={[styles.carte, style]}>
      {children}
    </Composant>
  );
}

export function Chargement() {
  return (
    <View style={{ padding: 40, alignItems: "center" }}>
      <ActivityIndicator color={couleurs.bleu} size="large" />
    </View>
  );
}

export const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  entete: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: couleurs.bleuFonce,
  },
  enteteTitre: { color: couleurs.blanc, fontSize: 17, fontWeight: "800", flex: 1 },
  retour: { paddingRight: 12 },
  retourTexte: { color: couleurs.blanc, fontSize: 28, fontWeight: "700", marginTop: -4 },
  defilement: { padding: 16, paddingBottom: 32 },
  bouton: {
    backgroundColor: couleurs.bleu,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  boutonSecondaire: {
    backgroundColor: couleurs.blanc,
    borderWidth: 1,
    borderColor: couleurs.bleu,
  },
  boutonAmbre: { backgroundColor: couleurs.ambre },
  boutonTexte: { color: couleurs.blanc, fontWeight: "800", fontSize: 15 },
  libelle: { color: couleurs.gris, fontSize: 12.5, marginBottom: 5 },
  champ: {
    backgroundColor: couleurs.blanc,
    borderWidth: 1,
    borderColor: couleurs.bord,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: couleurs.encre,
  },
  progression: { backgroundColor: couleurs.bord, overflow: "hidden" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  carte: {
    backgroundColor: couleurs.blanc,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 14,
    marginBottom: 12,
  },
});
