import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ecran, Carte, Progression, Chargement, Champ } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, fcfa } from "../theme";
import { useAuth } from "../contexte/Auth";

export default function Accueil({ navigation }) {
  const { utilisateur } = useAuth();
  const [donnees, setDonnees] = useState(null);
  const [recherche, setRecherche] = useState("");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [achats, categories, misEnAvant] = await Promise.all([
          api("/api/achats"),
          api("/api/categories"),
          api("/api/produits?mis_en_avant=1&limite=10"),
        ]);
        setDonnees({
          achats: (achats.achats || []).filter((a) => a.statut === "en_cours").slice(0, 3),
          categories: categories.categories || [],
          produits: misEnAvant.produits || [],
        });
      })();
    }, [])
  );

  if (!donnees) {
    return (
      <Ecran titre="Kayna Kayna Pay">
        <Chargement />
      </Ecran>
    );
  }

  return (
    <Ecran titre="Kayna Kayna Pay">
      <Text style={{ fontSize: 16, color: couleurs.encre, marginBottom: 12 }}>
        Bonjour <Text style={{ fontWeight: "800" }}>{utilisateur.nom}</Text> 👋
      </Text>

      <Champ
        placeholder="Rechercher un produit ou un service…"
        value={recherche}
        onChangeText={setRecherche}
        returnKeyType="search"
        onSubmitEditing={() => {
          navigation.navigate("Recherche", { q: recherche });
          setRecherche("");
        }}
      />

      {donnees.achats.length ? (
        <>
          <Text style={styles.section}>Mes achats en cours</Text>
          {donnees.achats.map((a) => (
            <Carte key={a.id} onPress={() => navigation.navigate("DetailAchat", { id: a.id })}>
              <Text style={styles.produitNom}>{a.produit_nom}</Text>
              <Progression ratio={a.montant_verse / a.prix_total} />
              <Text style={styles.progressionTexte}>
                {fcfa(a.montant_verse)} versés sur {fcfa(a.prix_total)} —{" "}
                {Math.floor((a.montant_verse / a.prix_total) * 100)} %
              </Text>
            </Carte>
          ))}
        </>
      ) : (
        <Carte>
          <Text style={{ color: couleurs.encre, fontSize: 14.5, lineHeight: 21 }}>
            Bienvenue ! Choisissez un produit dans le catalogue et commencez à le payer
            petit à petit — même 100 F par jour.
          </Text>
        </Carte>
      )}

      <Text style={styles.section}>Catégories</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}>
        {donnees.categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.puceCategorie}
            onPress={() => navigation.navigate("Recherche", { categorie: c.slug, nomCategorie: c.nom })}
          >
            <Text style={{ color: couleurs.bleu, fontWeight: "700", fontSize: 12.5 }}>{c.nom}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Produits mis en avant</Text>
      {donnees.produits.map((p) => (
        <Carte key={p.id} onPress={() => navigation.navigate("FicheProduit", { id: p.id })}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.produitNom}>{p.nom}</Text>
              <Text style={{ color: couleurs.gris, fontSize: 12.5 }}>{p.partenaire}</Text>
            </View>
            <Text style={styles.prix}>{fcfa(p.prix_affiche)}</Text>
          </View>
        </Carte>
      ))}
    </Ecran>
  );
}

const styles = {
  section: { fontSize: 15, fontWeight: "800", color: couleurs.bleuFonce, marginTop: 10, marginBottom: 10 },
  produitNom: { fontSize: 14.5, fontWeight: "700", color: couleurs.encre, marginBottom: 6 },
  progressionTexte: { color: couleurs.gris, fontSize: 12.5, marginTop: 6 },
  prix: { color: couleurs.bleu, fontWeight: "900", fontSize: 15 },
  puceCategorie: {
    backgroundColor: couleurs.bleuClair,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
};
