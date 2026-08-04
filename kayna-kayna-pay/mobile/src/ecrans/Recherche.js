import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Ecran, Carte, Champ, Chargement, Bouton } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, fcfa } from "../theme";

export default function Recherche({ route, navigation }) {
  const params = route.params || {};
  const [q, setQ] = useState(params.q || "");
  const [prixMax, setPrixMax] = useState("");
  const [produits, setProduits] = useState(null);

  async function chercher() {
    const parametres = new URLSearchParams();
    if (q) parametres.set("q", q);
    if (params.categorie) parametres.set("categorie", params.categorie);
    if (prixMax) parametres.set("prix_max", prixMax.replace(/\D/g, ""));
    const r = await api(`/api/produits?${parametres}`);
    setProduits(r.ok ? r.produits : []);
  }

  useEffect(() => {
    chercher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ecran titre={params.nomCategorie || "Recherche"} retour navigation={navigation}>
      <Champ
        placeholder="Mot-clé…"
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
        onSubmitEditing={chercher}
      />
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Champ
            libelle="Prix maximum (F CFA)"
            placeholder="Ex. 100 000"
            keyboardType="number-pad"
            value={prixMax}
            onChangeText={setPrixMax}
          />
        </View>
        <View style={{ marginBottom: 14, width: 110 }}>
          <Bouton libelle="Filtrer" onPress={chercher} />
        </View>
      </View>

      {produits == null ? (
        <Chargement />
      ) : produits.length === 0 ? (
        <Carte>
          <Text style={{ color: couleurs.gris }}>Aucun produit trouvé. Essayez un autre mot-clé.</Text>
        </Carte>
      ) : (
        produits.map((p) => (
          <Carte key={p.id} onPress={() => navigation.navigate("FicheProduit", { id: p.id })}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontWeight: "700", color: couleurs.encre, fontSize: 14.5 }}>{p.nom}</Text>
                <Text style={{ color: couleurs.gris, fontSize: 12.5, marginTop: 2 }}>
                  {p.partenaire} · {p.categorie}
                </Text>
              </View>
              <Text style={{ color: couleurs.bleu, fontWeight: "900", fontSize: 15 }}>{fcfa(p.prix_affiche)}</Text>
            </View>
          </Carte>
        ))
      )}
    </Ecran>
  );
}
