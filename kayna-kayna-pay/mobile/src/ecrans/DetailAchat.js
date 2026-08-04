import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ecran, Carte, Progression, Badge, Bouton, Chargement } from "../composants/Base";
import { api } from "../api/client";
import { surNotification } from "../api/socket";
import { couleurs, fcfa } from "../theme";

const STATUT_VERSEMENT = {
  initie: ["initié", "bleu"],
  en_attente: ["en attente", "ambre"],
  en_verification: ["en vérification", "ambre"],
  valide: ["validé ✓", "vert"],
  rejete: ["rejeté", "rouge"],
};

export default function DetailAchat({ route, navigation }) {
  const [achat, setAchat] = useState(null);

  const charger = useCallback(() => {
    api(`/api/achats/${route.params.id}`).then((r) => r.ok && setAchat(r.achat));
  }, [route.params.id]);

  useFocusEffect(charger);
  useEffect(() => surNotification(() => charger()), [charger]);

  if (!achat) {
    return (
      <Ecran titre="Mon achat" retour navigation={navigation}>
        <Chargement />
      </Ecran>
    );
  }

  const ratio = achat.montant_verse / achat.prix_total;
  const reste = Math.max(0, achat.prix_total - achat.montant_verse);
  const versementActif = achat.versements.find((v) => ["initie", "en_attente"].includes(v.statut));

  async function demanderAnnulation() {
    Alert.alert(
      "Annuler cet achat ?",
      "Notre équipe traitera votre demande. Le montant versé est remboursé selon les règles des CGU (frais de gestion éventuels).",
      [
        { text: "Non, je continue" },
        {
          text: "Demander l'annulation",
          style: "destructive",
          onPress: async () => {
            const r = await api(`/api/achats/${achat.id}/annulation`, { method: "POST", corps: {} });
            if (!r.ok) return Alert.alert("Impossible", r.erreur);
            charger();
          },
        },
      ]
    );
  }

  return (
    <Ecran titre={achat.produit_nom} retour navigation={navigation}>
      <Carte>
        <Text style={{ color: couleurs.gris, fontSize: 12.5 }}>Référence {achat.reference} · {achat.partenaire}</Text>
        <View style={{ marginVertical: 14 }}>
          <Progression ratio={ratio} hauteur={14} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: couleurs.gris, fontSize: 12 }}>Déjà versé</Text>
            <Text style={{ fontWeight: "900", color: couleurs.bleu, fontSize: 18 }}>{fcfa(achat.montant_verse)}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: couleurs.gris, fontSize: 12 }}>Progression</Text>
            <Text style={{ fontWeight: "900", color: couleurs.encre, fontSize: 18 }}>{Math.floor(ratio * 100)} %</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: couleurs.gris, fontSize: 12 }}>Reste à payer</Text>
            <Text style={{ fontWeight: "900", color: couleurs.encre, fontSize: 18 }}>{fcfa(reste)}</Text>
          </View>
        </View>
      </Carte>

      {achat.statut === "en_cours" ? (
        versementActif ? (
          <Carte style={{ borderColor: couleurs.ambre }}>
            <Text style={{ color: couleurs.encre, fontSize: 14, lineHeight: 20 }}>
              Un versement de <Text style={{ fontWeight: "800" }}>{fcfa(versementActif.montant_declare)}</Text> ({versementActif.reference}) est{" "}
              {versementActif.statut === "initie" ? "à finaliser" : "en attente de validation"}.
            </Text>
            <View style={{ height: 10 }} />
            <Bouton
              libelle={versementActif.statut === "initie" ? "Reprendre ce versement" : "Voir l'attente"}
              onPress={() =>
                navigation.navigate(
                  versementActif.statut === "initie" ? "VersementInstructions" : "VersementAttente",
                  { versementId: versementActif.id, achatId: achat.id }
                )
              }
            />
          </Carte>
        ) : (
          <Bouton
            libelle="Faire un versement"
            variante="ambre"
            onPress={() => navigation.navigate("VersementMontant", { achatId: achat.id, reste })}
          />
        )
      ) : achat.statut === "complete" || achat.statut === "en_preparation" || achat.statut === "livre" ? (
        <Carte style={{ borderColor: couleurs.vert }}>
          <Text style={{ fontWeight: "800", color: couleurs.vert, fontSize: 15, marginBottom: 4 }}>
            {achat.statut === "livre" ? "Produit remis — merci ! 🎉" : "Paiement complété 🎉"}
          </Text>
          <Text style={{ color: couleurs.encre, fontSize: 13.5, lineHeight: 20 }}>
            {achat.statut === "livre"
              ? "Votre historique de versements reste consultable ici : il vaut preuve d'achat."
              : `Nous organisons la remise avec ${achat.partenaire}. Modalités : ${achat.modalites_remise}`}
          </Text>
        </Carte>
      ) : (
        <Carte>
          <Badge texte={achat.statut} ton="rouge" />
        </Carte>
      )}

      <Text style={{ fontSize: 15, fontWeight: "800", color: couleurs.bleuFonce, marginVertical: 12 }}>
        Historique des versements
      </Text>
      {achat.versements.length === 0 ? (
        <Carte>
          <Text style={{ color: couleurs.gris, fontSize: 13.5 }}>
            Aucun versement pour l'instant. Même 100 F, c'est un pas de plus !
          </Text>
        </Carte>
      ) : (
        achat.versements.map((v) => {
          const [libelle, ton] = STATUT_VERSEMENT[v.statut] || [v.statut, "bleu"];
          return (
            <Carte key={v.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontWeight: "800", color: couleurs.encre, fontSize: 14.5 }}>
                    {fcfa(v.montant_valide != null ? v.montant_valide : v.montant_declare)}
                  </Text>
                  <Text style={{ color: couleurs.gris, fontSize: 12 }}>
                    {v.reference} · {String(v.operateur).toUpperCase()} ·{" "}
                    {new Date(v.initie_le).toLocaleDateString("fr-FR")}
                  </Text>
                  {v.motif_rejet ? (
                    <Text style={{ color: couleurs.rouge, fontSize: 12, marginTop: 2 }}>{v.motif_rejet}</Text>
                  ) : null}
                </View>
                <Badge texte={libelle} ton={ton} />
              </View>
            </Carte>
          );
        })
      )}

      {achat.statut === "en_cours" && !achat.annulation_demandee ? (
        <Text
          style={{ color: couleurs.rouge, textAlign: "center", marginTop: 14, fontSize: 13.5 }}
          onPress={demanderAnnulation}
        >
          Demander l'annulation de cet achat
        </Text>
      ) : achat.annulation_demandee && achat.statut === "en_cours" ? (
        <Text style={{ color: couleurs.gris, textAlign: "center", marginTop: 14, fontSize: 13 }}>
          Demande d'annulation en cours de traitement.
        </Text>
      ) : null}
    </Ecran>
  );
}
