import React, { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { Ecran, Carte, Bouton, Progression } from "../composants/Base";
import { api } from "../api/client";
import { surNotification } from "../api/socket";
import { couleurs, fcfa } from "../theme";

const DUREE_SECONDES = 10 * 60;

// Page d'attente : minuteur de 10 minutes pendant que l'équipe vérifie le
// dépôt. Résultat notifié en temps réel ; si le minuteur expire, le versement
// passe « en vérification » — il n'est jamais perdu.
export default function VersementAttente({ route, navigation }) {
  const { versementId, achatId } = route.params;
  const [resultat, setResultat] = useState(null); // valide | rejete | verification
  const [details, setDetails] = useState(null);
  const [secondes, setSecondes] = useState(DUREE_SECONDES);
  const minuterie = useRef(null);

  useEffect(() => {
    minuterie.current = setInterval(() => setSecondes((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(minuterie.current);
  }, []);

  // Notification temps réel du résultat.
  useEffect(
    () =>
      surNotification((n) => {
        const d = n.donnees || {};
        if (Number(d.versement_id) !== Number(versementId)) return;
        if (n.type === "versement_valide") setResultat("valide");
        if (n.type === "versement_rejete") setResultat("rejete");
        if (n.type === "versement_verification") setResultat("verification");
        setDetails(n);
      }),
    [versementId]
  );

  // Repli sans socket : vérification douce toutes les 15 s, puis au bout du
  // minuteur, bascule sur l'état « en vérification ».
  useEffect(() => {
    const interroger = async () => {
      const r = await api(`/api/versements/${versementId}`);
      if (!r.ok) return;
      if (r.versement.statut === "valide") setResultat("valide");
      if (r.versement.statut === "rejete") {
        setResultat("rejete");
        setDetails({ corps: r.versement.motif_rejet });
      }
      if (r.versement.statut === "en_verification") setResultat("verification");
    };
    const id = setInterval(interroger, 15000);
    return () => clearInterval(id);
  }, [versementId]);

  useEffect(() => {
    if (secondes === 0 && !resultat) setResultat("verification");
  }, [secondes, resultat]);

  const minutes = Math.floor(secondes / 60);
  const resteSecondes = String(secondes % 60).padStart(2, "0");

  if (resultat === "valide") {
    return (
      <Ecran titre="Versement validé" navigation={navigation}>
        <Carte style={{ borderColor: couleurs.vert, alignItems: "center", paddingVertical: 30 }}>
          <Text style={{ fontSize: 44 }}>🎉</Text>
          <Text style={{ fontSize: 18, fontWeight: "900", color: couleurs.vert, marginTop: 8 }}>
            Versement validé !
          </Text>
          <Text style={{ color: couleurs.encre, textAlign: "center", marginTop: 8, fontSize: 14, lineHeight: 20 }}>
            {details ? details.corps : "Votre portefeuille vient d'être crédité."}
          </Text>
        </Carte>
        <Bouton libelle="Voir mon achat" onPress={() => navigation.replace("DetailAchat", { id: achatId })} />
      </Ecran>
    );
  }

  if (resultat === "rejete") {
    return (
      <Ecran titre="Versement non validé" navigation={navigation}>
        <Carte style={{ borderColor: couleurs.rouge }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: couleurs.rouge, marginBottom: 6 }}>
            Versement non validé
          </Text>
          <Text style={{ color: couleurs.encre, fontSize: 14, lineHeight: 21 }}>
            {details ? details.corps : "Le dépôt n'a pas pu être confirmé."}
          </Text>
          <Text style={{ color: couleurs.gris, fontSize: 13, marginTop: 8 }}>
            Vous pouvez relancer un versement ou contacter le support depuis votre profil.
          </Text>
        </Carte>
        <Bouton libelle="Retour à mon achat" onPress={() => navigation.replace("DetailAchat", { id: achatId })} />
      </Ecran>
    );
  }

  if (resultat === "verification") {
    return (
      <Ecran titre="Vérification en cours" navigation={navigation}>
        <Carte style={{ alignItems: "center", paddingVertical: 26 }}>
          <Text style={{ fontSize: 40 }}>🔎</Text>
          <Text style={{ fontSize: 16, fontWeight: "800", color: couleurs.encre, marginTop: 6 }}>
            Votre dépôt est en cours de vérification
          </Text>
          <Text style={{ color: couleurs.gris, textAlign: "center", marginTop: 8, fontSize: 13.5, lineHeight: 20 }}>
            Inutile de rester sur cette page : vous serez notifié dès la validation.
            Un dépôt réel n'est jamais perdu.
          </Text>
        </Carte>
        <Bouton libelle="Retour à mon achat" onPress={() => navigation.replace("DetailAchat", { id: achatId })} />
      </Ecran>
    );
  }

  return (
    <Ecran titre="Vérification du dépôt" navigation={navigation}>
      <Carte style={{ alignItems: "center", paddingVertical: 30 }}>
        <Text style={{ fontSize: 42, fontWeight: "900", color: couleurs.bleu }}>
          {minutes}:{resteSecondes}
        </Text>
        <Text style={{ color: couleurs.encre, textAlign: "center", marginTop: 10, fontSize: 14.5, lineHeight: 21 }}>
          Notre équipe vérifie la réception de votre dépôt.{"\n"}Vous serez notifié dès la validation.
        </Text>
        <View style={{ alignSelf: "stretch", marginTop: 18 }}>
          <Progression ratio={1 - secondes / DUREE_SECONDES} />
        </View>
      </Carte>
      <Text style={{ color: couleurs.gris, fontSize: 12.5, textAlign: "center", lineHeight: 19 }}>
        Vous pouvez quitter cette page : la vérification continue et la notification
        arrivera, même si le minuteur expire.
      </Text>
      <View style={{ height: 12 }} />
      <Bouton
        libelle="Revenir à mon achat"
        variante="secondaire"
        onPress={() => navigation.replace("DetailAchat", { id: achatId })}
      />
    </Ecran>
  );
}
