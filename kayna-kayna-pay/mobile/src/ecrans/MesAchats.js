import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ecran, Carte, Progression, Badge, Chargement } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, fcfa } from "../theme";

const TONS = {
  en_cours: ["en cours", "bleu"],
  complete: ["complété 🎉", "vert"],
  en_preparation: ["en préparation", "ambre"],
  livre: ["livré ✓", "vert"],
  annule: ["annulé", "rouge"],
  rembourse: ["remboursé", "rouge"],
};

export default function MesAchats({ navigation }) {
  const [achats, setAchats] = useState(null);

  useFocusEffect(
    useCallback(() => {
      api("/api/achats").then((r) => setAchats(r.ok ? r.achats : []));
    }, [])
  );

  return (
    <Ecran titre="Mes achats">
      {achats == null ? (
        <Chargement />
      ) : achats.length === 0 ? (
        <Carte>
          <Text style={{ color: couleurs.encre, fontSize: 14.5, lineHeight: 21 }}>
            Vous n'avez pas encore d'achat. Parcourez le catalogue depuis l'accueil et
            lancez-vous — petit à petit !
          </Text>
        </Carte>
      ) : (
        achats.map((a) => {
          const [libelle, ton] = TONS[a.statut] || [a.statut, "bleu"];
          return (
            <Carte key={a.id} onPress={() => navigation.navigate("DetailAchat", { id: a.id })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontWeight: "700", color: couleurs.encre, flex: 1, paddingRight: 8, fontSize: 14.5 }}>
                  {a.produit_nom}
                </Text>
                <Badge texte={libelle} ton={ton} />
              </View>
              <Progression ratio={a.montant_verse / a.prix_total} />
              <Text style={{ color: couleurs.gris, fontSize: 12.5, marginTop: 6 }}>
                {fcfa(a.montant_verse)} / {fcfa(a.prix_total)} · {a.partenaire} · réf. {a.reference}
              </Text>
            </Carte>
          );
        })
      )}
    </Ecran>
  );
}
