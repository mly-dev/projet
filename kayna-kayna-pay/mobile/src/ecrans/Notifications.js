import React, { useCallback, useState, useEffect } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ecran, Carte, Chargement } from "../composants/Base";
import { api } from "../api/client";
import { surNotification } from "../api/socket";
import { couleurs } from "../theme";

export default function Notifications() {
  const [liste, setListe] = useState(null);

  const charger = useCallback(() => {
    api("/api/notifications").then(async (r) => {
      if (!r.ok) return;
      setListe(r.notifications);
      if (r.non_lues > 0) await api("/api/notifications", { method: "POST" });
    });
  }, []);

  useFocusEffect(charger);
  useEffect(() => surNotification(() => charger()), [charger]);

  return (
    <Ecran titre="Notifications">
      {liste == null ? (
        <Chargement />
      ) : liste.length === 0 ? (
        <Carte>
          <Text style={{ color: couleurs.gris, fontSize: 14 }}>
            Rien pour le moment. Vos validations de versements apparaîtront ici, en temps réel.
          </Text>
        </Carte>
      ) : (
        liste.map((n) => (
          <Carte key={n.id} style={!n.lue ? { borderColor: couleurs.bleu } : null}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontWeight: "800", color: couleurs.encre, flex: 1, fontSize: 14 }}>{n.titre}</Text>
              {!n.lue ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: couleurs.bleu }} /> : null}
            </View>
            <Text style={{ color: couleurs.encre, fontSize: 13.5, lineHeight: 19 }}>{n.corps}</Text>
            <Text style={{ color: couleurs.gris, fontSize: 11.5, marginTop: 6 }}>
              {new Date(n.cree_le).toLocaleString("fr-FR")}
            </Text>
          </Carte>
        ))
      )}
    </Ecran>
  );
}
