import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ecran, Carte, CarteSquelette, Champ, Bouton, Vide, Puces } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, texte, espace, rayon, fcfa, rythmeIndicatif } from "../theme";

// Fourchettes proposées : elles évitent au client de taper un nombre, et
// couvrent les paliers réels du catalogue nigérien.
const PALIERS = [
  { cle: "", libelle: "Tous les prix" },
  { cle: "25000", libelle: "≤ 25 000 F" },
  { cle: "75000", libelle: "≤ 75 000 F" },
  { cle: "200000", libelle: "≤ 200 000 F" },
  { cle: "500000", libelle: "≤ 500 000 F" },
];

export default function Recherche({ route, navigation }) {
  const params = route.params || {};
  const [q, setQ] = useState(params.q || "");
  const [prixMax, setPrixMax] = useState("");
  const [produits, setProduits] = useState(null);

  const chercher = useCallback(
    async (plafond) => {
      setProduits(null);
      const parametres = new URLSearchParams();
      if (q.trim()) parametres.set("q", q.trim());
      if (params.categorie) parametres.set("categorie", params.categorie);
      const max = plafond === undefined ? prixMax : plafond;
      if (max) parametres.set("prix_max", String(max).replace(/\D/g, ""));
      const r = await api(`/api/produits?${parametres}`);
      setProduits(r.ok ? r.produits : []);
    },
    [q, prixMax, params.categorie]
  );

  useEffect(() => {
    chercher();
    // Premier chargement uniquement : ensuite, la recherche est déclenchée
    // par le clavier ou par un palier de prix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choisirPalier(cle) {
    setPrixMax(cle);
    chercher(cle);
  }

  return (
    <Ecran
      titre={params.nomCategorie || "Catalogue"}
      sousTitre={params.nomCategorie ? "Tous les produits de cette catégorie." : null}
      retour
      navigation={navigation}
      onRafraichir={() => chercher()}
    >
      <Champ
        placeholder="Mot-clé : téléphone, sac de riz, moto…"
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
        onSubmitEditing={() => chercher()}
        style={{ marginBottom: espace.md }}
      />

      <Text style={styles.filtreLibelle}>Filtrer par prix</Text>
      <Puces options={PALIERS} valeur={prixMax} onChoisir={choisirPalier} style={{ marginBottom: espace.lg }} />

      {produits === null ? (
        <>
          <CarteSquelette lignes={1} />
          <CarteSquelette lignes={1} />
          <CarteSquelette lignes={1} />
        </>
      ) : produits.length === 0 ? (
        <Vide
          icone="🔍"
          titre="Aucun produit trouvé"
          detail={
            q.trim() || prixMax
              ? "Essayez un autre mot-clé, ou élargissez la fourchette de prix."
              : "Cette catégorie est encore vide. Revenez bientôt."
          }
          action={
            q.trim() || prixMax ? (
              <Bouton
                libelle="Effacer les filtres"
                variante="secondaire"
                onPress={() => { setQ(""); setPrixMax(""); chercher(""); }}
              />
            ) : null
          }
        />
      ) : (
        <>
          <Text style={styles.compte}>
            {produits.length} produit{produits.length > 1 ? "s" : ""} disponible
            {produits.length > 1 ? "s" : ""}
          </Text>
          {produits.map((p) => {
            const rythme = rythmeIndicatif(p.prix_affiche);
            return (
              <Carte key={p.id} onPress={() => navigation.navigate("FicheProduit", { id: p.id })}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, paddingRight: espace.md }}>
                    <Text style={styles.nom} numberOfLines={2}>{p.nom}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {p.partenaire} · {p.categorie}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.prix}>{fcfa(p.prix_affiche)}</Text>
                    {rythme ? <Text style={styles.jours}>{rythme.libelle}</Text> : null}
                  </View>
                </View>
              </Carte>
            );
          })}
        </>
      )}
    </Ecran>
  );
}

const styles = {
  filtreLibelle: { ...texte.legende, color: couleurs.encre2, fontWeight: "700", marginBottom: espace.sm },
  compte: { ...texte.legende, color: couleurs.encre3, marginBottom: espace.sm },
  nom: { ...texte.corpsFort, color: couleurs.encre },
  meta: { ...texte.legende, color: couleurs.encre3, marginTop: 3 },
  prix: { color: couleurs.bleu, fontWeight: "900", fontSize: 15.5 },
  jours: { color: couleurs.encre3, fontSize: 10.5, marginTop: 2 },
};
