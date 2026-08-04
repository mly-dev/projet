import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Ecran, Carte, Champ, Bouton, Chargement, Badge } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, fcfa } from "../theme";

export default function FicheProduit({ route, navigation }) {
  const [produit, setProduit] = useState(null);
  const [parJour, setParJour] = useState("500");
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    api(`/api/produits/${route.params.id}`).then((r) => r.ok && setProduit(r.produit));
  }, [route.params.id]);

  if (!produit) {
    return (
      <Ecran titre="Produit" retour navigation={navigation}>
        <Chargement />
      </Ecran>
    );
  }

  const montantJour = Number(parJour.replace(/\D/g, "")) || 0;
  const jours = montantJour > 0 ? Math.ceil(produit.prix_affiche / montantJour) : null;
  const dateFin = jours
    ? new Date(Date.now() + jours * 24 * 3600 * 1000).toLocaleDateString("fr-FR")
    : null;

  async function commencer() {
    setEnCours(true);
    const r = await api("/api/achats", { method: "POST", corps: { produit_id: produit.id } });
    setEnCours(false);
    if (!r.ok) return Alert.alert("Impossible de démarrer", r.erreur);
    Alert.alert(
      "C'est parti ! 🎉",
      `Votre portefeuille pour « ${produit.nom} » est ouvert. Versez à votre rythme, même 100 F.`,
      [{ text: "Voir mon achat", onPress: () => navigation.replace("DetailAchat", { id: r.achat.id }) }]
    );
  }

  return (
    <Ecran titre={produit.nom} retour navigation={navigation}>
      <Carte>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: couleurs.encre }}>{produit.nom}</Text>
            <Text style={{ color: couleurs.gris, marginTop: 4, fontSize: 13 }}>
              Vendu par {produit.partenaire} · {produit.categorie}
            </Text>
          </View>
          <Badge texte={produit.disponible ? "disponible" : "indisponible"} ton={produit.disponible ? "vert" : "rouge"} />
        </View>
        <Text style={{ fontSize: 26, fontWeight: "900", color: couleurs.bleu, marginTop: 12 }}>
          {fcfa(produit.prix_affiche)}
        </Text>
        <Text style={{ color: couleurs.gris, fontSize: 12, marginTop: 2 }}>
          Prix garanti pendant toute la durée de votre achat. Commission plateforme incluse.
        </Text>
      </Carte>

      {produit.description ? (
        <Carte>
          <Text style={{ color: couleurs.encre, lineHeight: 21, fontSize: 14 }}>{produit.description}</Text>
          <Text style={{ color: couleurs.gris, fontSize: 12.5, marginTop: 8 }}>
            Remise : {produit.modalites_remise}
          </Text>
        </Carte>
      ) : null}

      <Carte>
        <Text style={{ fontWeight: "800", color: couleurs.bleuFonce, marginBottom: 10, fontSize: 14.5 }}>
          À votre rythme — simulez
        </Text>
        <Champ
          libelle="Si je verse chaque jour (F CFA)…"
          keyboardType="number-pad"
          value={parJour}
          onChangeText={setParJour}
        />
        {jours ? (
          <Text style={{ color: couleurs.encre, fontSize: 14.5, lineHeight: 21 }}>
            À <Text style={{ fontWeight: "800" }}>{fcfa(montantJour)}</Text> par jour, vous terminez en{" "}
            <Text style={{ fontWeight: "800", color: couleurs.bleu }}>{jours} jours</Text> (vers le {dateFin}).
          </Text>
        ) : (
          <Text style={{ color: couleurs.gris, fontSize: 13 }}>Saisissez un montant pour simuler.</Text>
        )}
      </Carte>

      <Bouton
        libelle={enCours ? "Ouverture…" : "Commencer à payer"}
        variante="ambre"
        onPress={commencer}
        desactive={enCours || !produit.disponible}
      />
      <Text style={{ color: couleurs.gris, fontSize: 12.5, textAlign: "center", marginTop: 10 }}>
        Aucun engagement de montant ni de fréquence. Vous versez quand vous voulez.
      </Text>
    </Ecran>
  );
}
