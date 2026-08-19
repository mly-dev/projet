import React, { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Ecran, Carte, CarteSquelette, Progression, Champ, Section, Vide, Bouton,
} from "../composants/Base";
import { api } from "../api/client";
import { couleurs, texte, espace, rayon, ombre, fcfa, rythmeIndicatif } from "../theme";
import { useAuth } from "../contexte/Auth";

// Le pictogramme de catégorie est déduit du slug : le catalogue peut grandir
// sans qu'il faille livrer une nouvelle version de l'application.
const ICONES_CATEGORIE = {
  telephonie: "📱", informatique: "💻", "motos-vehicules": "🏍️",
  "maison-cuisine": "🍳", "billets-transport": "🎫", assurances: "🛡️",
  electromenager: "🔌", meubles: "🛋️", alimentation: "🌾", vetements: "👕",
  scolaire: "🎒", sante: "💊", energie: "🔋", batiment: "🧱", services: "🛠️",
};
const icone = (slug) => ICONES_CATEGORIE[slug] || "🏷️";

function bonjour() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function Accueil({ navigation }) {
  const { utilisateur } = useAuth();
  const [donnees, setDonnees] = useState(null);
  const [recherche, setRecherche] = useState("");

  const charger = useCallback(async () => {
    const [achats, categories, misEnAvant] = await Promise.all([
      api("/api/achats"),
      api("/api/categories"),
      api("/api/produits?mis_en_avant=1&limite=10"),
    ]);
    const tous = achats.achats || [];
    setDonnees({
      achats: tous.filter((a) => a.statut === "en_cours").slice(0, 3),
      aRetirer: tous.filter((a) => ["complete", "en_preparation"].includes(a.statut)),
      categories: categories.categories || [],
      produits: misEnAvant.produits || [],
    });
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  function lancerRecherche() {
    if (!recherche.trim()) return;
    navigation.navigate("Recherche", { q: recherche.trim() });
    setRecherche("");
  }

  if (!donnees) {
    return (
      <Ecran titre="Kayna Kayna Pay">
        <CarteSquelette lignes={2} />
        <CarteSquelette lignes={2} />
        <CarteSquelette lignes={1} />
      </Ecran>
    );
  }

  const total = donnees.achats.reduce(
    (acc, a) => ({ verse: acc.verse + Number(a.montant_verse), du: acc.du + Number(a.prix_total) }),
    { verse: 0, du: 0 }
  );

  return (
    <Ecran titre="Kayna Kayna Pay" onRafraichir={charger}>
      <Text style={styles.salutation}>
        {bonjour()} <Text style={{ fontWeight: "800", color: couleurs.bleuNuit }}>{utilisateur.nom}</Text> 👋
      </Text>

      <Champ
        placeholder="Rechercher un produit ou un service…"
        value={recherche}
        onChangeText={setRecherche}
        returnKeyType="search"
        onSubmitEditing={lancerRecherche}
        style={{ marginBottom: espace.md }}
      />

      {donnees.aRetirer.length ? (
        <Carte ton="vert" onPress={() => navigation.navigate("DetailAchat", { id: donnees.aRetirer[0].id })}>
          <Text style={styles.retraitTitre}>🎉 Vous avez fini de payer !</Text>
          <Text style={styles.retraitTexte}>
            {donnees.aRetirer.length === 1
              ? `« ${donnees.aRetirer[0].produit_nom} » est prêt : nous organisons la remise avec ${donnees.aRetirer[0].partenaire}.`
              : `${donnees.aRetirer.length} de vos achats sont complétés et en cours de remise.`}
          </Text>
        </Carte>
      ) : null}

      {donnees.achats.length ? (
        <>
          <Section
            titre="Mes achats en cours"
            action={
              <Pressable onPress={() => navigation.navigate("MesAchats")} hitSlop={8}>
                <Text style={styles.lienSection}>Tout voir ›</Text>
              </Pressable>
            }
          />

          <View style={styles.resume}>
            <View style={styles.resumeBloc}>
              <Text style={styles.resumeValeur}>{fcfa(total.verse)}</Text>
              <Text style={styles.resumeLibelle}>déjà versés</Text>
            </View>
            <View style={styles.resumeTrait} />
            <View style={styles.resumeBloc}>
              <Text style={[styles.resumeValeur, { color: couleurs.blanc }]}>
                {fcfa(Math.max(0, total.du - total.verse))}
              </Text>
              <Text style={styles.resumeLibelle}>reste à payer</Text>
            </View>
          </View>

          {donnees.achats.map((a) => {
            const ratio = a.montant_verse / a.prix_total;
            return (
              <Carte key={a.id} onPress={() => navigation.navigate("DetailAchat", { id: a.id })}>
                <View style={styles.ligneHaut}>
                  <Text style={styles.produitNom} numberOfLines={1}>{a.produit_nom}</Text>
                  <Text style={styles.pourcent}>{Math.floor(ratio * 100)} %</Text>
                </View>
                <Progression ratio={ratio} />
                <Text style={styles.progressionTexte}>
                  {fcfa(a.montant_verse)} versés sur {fcfa(a.prix_total)}
                </Text>
              </Carte>
            );
          })}
        </>
      ) : (
        <Carte accent>
          <Text style={styles.accrocheTitre}>Comment ça marche ?</Text>
          {[
            "Choisissez un produit dans le catalogue.",
            "Versez ce que vous pouvez, dès 100 F, quand vous voulez.",
            "Récupérez le produit une fois le montant complété.",
          ].map((t, i) => (
            <View key={i} style={styles.accrocheLigne}>
              <View style={styles.accrochePastille}>
                <Text style={styles.accrocheNumero}>{i + 1}</Text>
              </View>
              <Text style={styles.accrocheTexte}>{t}</Text>
            </View>
          ))}
        </Carte>
      )}

      <Section titre="Catégories" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: espace.sm, paddingRight: espace.lg }}
        style={{ marginHorizontal: -espace.lg, paddingHorizontal: espace.lg, marginBottom: espace.sm }}
      >
        {donnees.categories.map((c) => (
          <Pressable
            key={c.id}
            style={({ pressed }) => [styles.categorie, ombre.carte, pressed && { opacity: 0.75 }]}
            onPress={() => navigation.navigate("Recherche", { categorie: c.slug, nomCategorie: c.nom })}
          >
            <Text style={{ fontSize: 22 }}>{icone(c.slug)}</Text>
            <Text style={styles.categorieNom} numberOfLines={2}>{c.nom}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Section
        titre="Produits mis en avant"
        action={
          <Pressable onPress={() => navigation.navigate("Recherche", {})} hitSlop={8}>
            <Text style={styles.lienSection}>Tout le catalogue ›</Text>
          </Pressable>
        }
      />
      {donnees.produits.length === 0 ? (
        <Vide
          icone="🛍️"
          titre="Le catalogue se remplit"
          detail="Aucun produit mis en avant pour l'instant. Utilisez la recherche pour explorer."
          action={<Bouton libelle="Ouvrir le catalogue" onPress={() => navigation.navigate("Recherche", {})} />}
        />
      ) : (
        donnees.produits.map((p) => {
          const rythme = rythmeIndicatif(p.prix_affiche);
          return (
            <Carte key={p.id} onPress={() => navigation.navigate("FicheProduit", { id: p.id })}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.vignette}>
                  <Text style={{ fontSize: 20 }}>{icone(p.categorie_slug)}</Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: espace.md }}>
                  <Text style={styles.produitNom} numberOfLines={1}>{p.nom}</Text>
                  <Text style={styles.partenaire} numberOfLines={1}>{p.partenaire}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.prix}>{fcfa(p.prix_affiche)}</Text>
                  {rythme ? <Text style={styles.prixNote}>{rythme.libelle}</Text> : null}
                </View>
              </View>
            </Carte>
          );
        })
      )}
    </Ecran>
  );
}

const styles = {
  salutation: { ...texte.corps, color: couleurs.encre2, marginBottom: espace.md },
  lienSection: { color: couleurs.bleu, fontSize: 13, fontWeight: "700" },

  resume: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: couleurs.bleuNuit,
    borderRadius: rayon.lg,
    paddingVertical: espace.lg,
    marginBottom: espace.md,
  },
  resumeBloc: { flex: 1, alignItems: "center" },
  resumeTrait: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.18)" },
  resumeValeur: { color: couleurs.ambre, fontSize: 19, fontWeight: "900", letterSpacing: -0.4 },
  resumeLibelle: { color: "#C7DDF0", fontSize: 11.5, marginTop: 3 },

  ligneHaut: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: espace.sm },
  produitNom: { ...texte.corpsFort, color: couleurs.encre, flex: 1, paddingRight: espace.sm },
  pourcent: { color: couleurs.bleu, fontWeight: "900", fontSize: 14 },
  progressionTexte: { ...texte.petit, color: couleurs.encre2, marginTop: 7 },
  partenaire: { ...texte.legende, color: couleurs.encre3, marginTop: 2 },
  prix: { color: couleurs.bleu, fontWeight: "900", fontSize: 15.5 },
  prixNote: { color: couleurs.encre3, fontSize: 10.5, marginTop: 1 },

  vignette: {
    width: 44, height: 44, borderRadius: rayon.md,
    backgroundColor: couleurs.bleuClair, alignItems: "center", justifyContent: "center",
  },

  retraitTitre: { ...texte.sousTitre, color: couleurs.vert, marginBottom: 4 },
  retraitTexte: { ...texte.petit, color: couleurs.encre, lineHeight: 19 },

  accrocheTitre: { ...texte.sousTitre, color: couleurs.bleuNuit, marginBottom: espace.md },
  accrocheLigne: { flexDirection: "row", alignItems: "flex-start", gap: espace.md, marginBottom: espace.sm },
  accrochePastille: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: couleurs.ambre,
    alignItems: "center", justifyContent: "center",
  },
  accrocheNumero: { color: "#4A3200", fontWeight: "900", fontSize: 11.5 },
  accrocheTexte: { ...texte.petit, color: couleurs.encre, flex: 1, lineHeight: 19 },

  categorie: {
    width: 92, height: 92, borderRadius: rayon.lg,
    backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bord,
    alignItems: "center", justifyContent: "center", padding: espace.sm, gap: 5,
  },
  categorieNom: { color: couleurs.encre, fontWeight: "700", fontSize: 11.5, textAlign: "center" },
};
