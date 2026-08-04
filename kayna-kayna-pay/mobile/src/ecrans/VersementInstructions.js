import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Ecran, Carte, Bouton, Chargement } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, fcfa } from "../theme";

// Instructions de dépôt : numéro de la plateforme pour l'opérateur choisi,
// montant, et référence unique à indiquer dans le motif du transfert.
export default function VersementInstructions({ route, navigation }) {
  const { versementId, achatId } = route.params;
  const [instructions, setInstructions] = useState(route.params.instructions || null);
  const [versement, setVersement] = useState(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    api(`/api/versements/${versementId}`).then(async (r) => {
      if (!r.ok) return;
      setVersement(r.versement);
      if (!instructions) {
        // Reprise d'un versement initié : on reconstruit les instructions.
        const parametres = await api("/api/contenus/contact");
        setInstructions({
          reference: r.versement.reference,
          montant: r.versement.montant_declare,
          operateur: r.versement.operateur,
          numero_depot: null,
          frais: "Les frais de dépôt mobile money sont à votre charge.",
          _contact: parametres.ok ? parametres.contenu.corps : "",
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versementId]);

  if (!instructions) {
    return (
      <Ecran titre="Instructions de dépôt" retour navigation={navigation}>
        <Chargement />
      </Ecran>
    );
  }

  async function confirmerDepot() {
    setEnCours(true);
    const r = await api(`/api/versements/${versementId}/confirmer`, { method: "POST" });
    setEnCours(false);
    if (!r.ok) return Alert.alert("Impossible", r.erreur);
    navigation.replace("VersementAttente", { versementId, achatId });
  }

  const etapes = [
    `Ouvrez votre application ${String(instructions.operateur).toUpperCase()}.`,
    instructions.numero_depot
      ? `Envoyez ${fcfa(instructions.montant)} au numéro ${instructions.numero_depot}.`
      : `Envoyez ${fcfa(instructions.montant)} au numéro de dépôt Kayna Kayna Pay (affiché lors de l'initiation).`,
    `Indiquez si possible la référence ${instructions.reference} dans le motif du transfert.`,
    "Revenez ici et appuyez sur « J'ai effectué le dépôt ».",
  ];

  return (
    <Ecran titre="Instructions de dépôt" retour navigation={navigation}>
      <Carte style={{ borderColor: couleurs.bleu, backgroundColor: couleurs.bleuClair }}>
        <Text style={{ color: couleurs.gris, fontSize: 12.5 }}>Votre référence de versement</Text>
        <Text style={{ fontSize: 26, fontWeight: "900", color: couleurs.bleu, letterSpacing: 1 }}>
          {instructions.reference}
        </Text>
        <Text style={{ color: couleurs.encre, marginTop: 6, fontSize: 14 }}>
          Montant : <Text style={{ fontWeight: "800" }}>{fcfa(instructions.montant)}</Text> par{" "}
          <Text style={{ fontWeight: "800", textTransform: "uppercase" }}>{instructions.operateur}</Text>
        </Text>
      </Carte>

      {etapes.map((e, i) => (
        <Carte key={i} style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 30, height: 30, borderRadius: 15, backgroundColor: couleurs.bleu,
              alignItems: "center", justifyContent: "center", marginRight: 12,
            }}
          >
            <Text style={{ color: couleurs.blanc, fontWeight: "800" }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, color: couleurs.encre, fontSize: 14, lineHeight: 20 }}>{e}</Text>
        </Carte>
      ))}

      <Text style={{ color: couleurs.gris, fontSize: 12.5, marginBottom: 14, textAlign: "center" }}>
        {instructions.frais}
      </Text>

      <Bouton
        libelle={enCours ? "Envoi…" : "J'ai effectué le dépôt ✓"}
        variante="ambre"
        onPress={confirmerDepot}
        desactive={enCours || (versement && versement.statut !== "initie")}
      />
    </Ecran>
  );
}
