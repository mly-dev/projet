import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ecran, Carte, Champ, Bouton } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, fcfa, OPERATEURS } from "../theme";

const SUGGESTIONS = [100, 500, 1000, 2500, 5000, 10000];

export default function VersementMontant({ route, navigation }) {
  const { achatId, reste } = route.params;
  const [montant, setMontant] = useState("");
  const [operateur, setOperateur] = useState("nita");
  const [enCours, setEnCours] = useState(false);

  const valeur = Number(montant.replace(/\D/g, "")) || 0;

  async function continuer() {
    setEnCours(true);
    const r = await api("/api/versements", {
      method: "POST",
      corps: { achat_id: achatId, montant: valeur, operateur },
    });
    setEnCours(false);
    if (!r.ok) return Alert.alert("Impossible", r.erreur);
    navigation.replace("VersementInstructions", {
      versementId: r.versement.id,
      achatId,
      instructions: r.instructions,
    });
  }

  return (
    <Ecran titre="Faire un versement" retour navigation={navigation}>
      <Carte>
        <Text style={{ color: couleurs.encre, fontSize: 14 }}>
          Reste à payer : <Text style={{ fontWeight: "800" }}>{fcfa(reste)}</Text>
        </Text>
      </Carte>

      <Champ
        libelle="Montant à verser (F CFA) — dès 100 F"
        placeholder="Ex. 1 000"
        keyboardType="number-pad"
        value={montant}
        onChangeText={setMontant}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {SUGGESTIONS.filter((s) => s <= Math.max(reste, 100)).map((s) => (
          <TouchableOpacity
            key={s}
            style={{
              backgroundColor: valeur === s ? couleurs.bleu : couleurs.bleuClair,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
              marginRight: 8,
              marginBottom: 8,
            }}
            onPress={() => setMontant(String(s))}
          >
            <Text style={{ color: valeur === s ? couleurs.blanc : couleurs.bleu, fontWeight: "700", fontSize: 13 }}>
              {fcfa(s)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ color: couleurs.gris, fontSize: 12.5, marginBottom: 6 }}>Je dépose avec</Text>
      <View style={{ flexDirection: "row", marginBottom: 18 }}>
        {OPERATEURS.map((op) => (
          <TouchableOpacity
            key={op.cle}
            style={{
              flex: 1,
              backgroundColor: operateur === op.cle ? couleurs.bleu : couleurs.blanc,
              borderWidth: 1,
              borderColor: operateur === op.cle ? couleurs.bleu : couleurs.bord,
              borderRadius: 10,
              paddingVertical: 12,
              marginRight: op.cle !== "wave" ? 8 : 0,
              alignItems: "center",
            }}
            onPress={() => setOperateur(op.cle)}
          >
            <Text style={{ color: operateur === op.cle ? couleurs.blanc : couleurs.encre, fontWeight: "800" }}>
              {op.nom}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Bouton
        libelle={enCours ? "Préparation…" : "Voir les instructions de dépôt"}
        onPress={continuer}
        desactive={enCours || valeur < 100}
      />
      <Text style={{ color: couleurs.gris, fontSize: 12, textAlign: "center", marginTop: 10 }}>
        Les frais de dépôt mobile money sont à votre charge.
      </Text>
    </Ecran>
  );
}
