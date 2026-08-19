import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { Ecran, Carte, Bouton, Progression, Alerte, Etape } from "../composants/Base";
import { api } from "../api/client";
import { surNotification } from "../api/socket";
import { couleurs, texte, espace, rayon, fcfa } from "../theme";

const DUREE_SECONDES = 10 * 60;

// Page d'attente : minuteur de 10 minutes pendant que l'équipe vérifie le
// dépôt. Résultat notifié en temps réel ; si le minuteur expire, le versement
// passe « en vérification » — il n'est jamais perdu.
export default function VersementAttente({ route, navigation }) {
  const { versementId, achatId } = route.params;
  const [resultat, setResultat] = useState(null); // valide | rejete | verification
  const [details, setDetails] = useState(null);
  const [versement, setVersement] = useState(null);
  const [secondes, setSecondes] = useState(DUREE_SECONDES);
  const minuterie = useRef(null);
  const pouls = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    api(`/api/versements/${versementId}`).then((r) => r.ok && setVersement(r.versement));
  }, [versementId]);

  useEffect(() => {
    minuterie.current = setInterval(() => setSecondes((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(minuterie.current);
  }, []);

  // Battement discret : l'écran montre qu'il est vivant sans distraire.
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pouls, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pouls, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    boucle.start();
    return () => boucle.stop();
  }, [pouls]);

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
      setVersement(r.versement);
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
  const montant = versement
    ? fcfa(versement.montant_valide != null ? versement.montant_valide : versement.montant_declare)
    : null;

  /* ── Validé ──────────────────────────────────────────────────────── */
  if (resultat === "valide") {
    return (
      <Ecran
        titre="Versement validé"
        navigation={navigation}
        pied={
          <Bouton
            libelle="Voir mon achat"
            onPress={() => navigation.replace("DetailAchat", { id: achatId })}
          />
        }
      >
        <Carte ton="vert" style={styles.centre}>
          <View style={[styles.rond, { backgroundColor: couleurs.vertPale }]}>
            <Text style={{ fontSize: 44 }}>🎉</Text>
          </View>
          <Text style={[styles.grandTitre, { color: couleurs.vert }]}>Versement validé !</Text>
          {montant ? <Text style={styles.grandMontant}>{montant}</Text> : null}
          <Text style={styles.grandTexte}>
            {details ? details.corps : "Votre portefeuille vient d'être crédité."}
          </Text>
        </Carte>
        <Alerte type="succes">
          Ce versement est définitif : une fois validé, il ne peut plus être modifié ni annulé
          par qui que ce soit. Il apparaît dans l'historique de votre achat.
        </Alerte>
      </Ecran>
    );
  }

  /* ── Rejeté ──────────────────────────────────────────────────────── */
  if (resultat === "rejete") {
    return (
      <Ecran
        titre="Versement non validé"
        navigation={navigation}
        pied={
          <Bouton
            libelle="Retour à mon achat"
            onPress={() => navigation.replace("DetailAchat", { id: achatId })}
          />
        }
      >
        <Carte ton="rouge">
          <Text style={[styles.titreEtat, { color: couleurs.rouge }]}>Le dépôt n'a pas été confirmé</Text>
          <Text style={[texte.corps, { color: couleurs.encre, marginTop: 6 }]}>
            {details && details.corps ? details.corps : "Le dépôt n'a pas pu être confirmé."}
          </Text>
        </Carte>

        <Carte>
          <Text style={styles.titreBloc}>Que faire maintenant ?</Text>
          <Etape numero={1}>
            Vérifiez le SMS de confirmation de votre opérateur : le dépôt est-il bien parti ?
          </Etape>
          <Etape numero={2}>
            S'il est parti, contactez le support avec la référence — l'argent réellement
            déposé n'est jamais perdu.
          </Etape>
          <Etape numero={3}>
            Sinon, relancez simplement un nouveau versement depuis votre achat.
          </Etape>
        </Carte>

        <Alerte type="info">
          Un rejet ne retire rien de ce que vous aviez déjà versé : votre progression est intacte.
        </Alerte>
      </Ecran>
    );
  }

  /* ── En vérification ─────────────────────────────────────────────── */
  if (resultat === "verification") {
    return (
      <Ecran
        titre="Vérification en cours"
        navigation={navigation}
        pied={
          <Bouton
            libelle="Retour à mon achat"
            onPress={() => navigation.replace("DetailAchat", { id: achatId })}
          />
        }
      >
        <Carte style={styles.centre}>
          <View style={[styles.rond, { backgroundColor: couleurs.orangePale }]}>
            <Text style={{ fontSize: 38 }}>🔎</Text>
          </View>
          <Text style={styles.titreEtat}>Votre dépôt est en cours de vérification</Text>
          <Text style={styles.grandTexte}>
            La vérification prend un peu plus de temps que d'habitude. Inutile de rester
            sur cette page : vous serez notifié dès la validation.
          </Text>
        </Carte>
        <Alerte type="info">
          Un dépôt réellement effectué n'est jamais perdu. Il reste rattaché à votre achat par
          sa référence, quelle que soit la durée de la vérification.
        </Alerte>
      </Ecran>
    );
  }

  /* ── Attente ─────────────────────────────────────────────────────── */
  return (
    <Ecran
      titre="Vérification du dépôt"
      navigation={navigation}
      pied={
        <Bouton
          libelle="Revenir à mon achat"
          variante="secondaire"
          onPress={() => navigation.replace("DetailAchat", { id: achatId })}
        />
      }
    >
      <Carte style={styles.centre}>
        <Animated.View style={[styles.rond, { backgroundColor: couleurs.bleuClair, transform: [{ scale: pouls }] }]}>
          <Text style={styles.minuteur}>
            {minutes}:{resteSecondes}
          </Text>
        </Animated.View>

        <Text style={styles.titreEtat}>Notre équipe vérifie votre dépôt</Text>
        {montant ? (
          <Text style={styles.grandMontant}>{montant}</Text>
        ) : null}
        <Text style={styles.grandTexte}>
          Vous serez notifié dès la validation, où que vous soyez dans l'application.
        </Text>

        <View style={{ alignSelf: "stretch", marginTop: espace.xl }}>
          <Progression ratio={1 - secondes / DUREE_SECONDES} />
        </View>
      </Carte>

      <Alerte type="info">
        Vous pouvez quitter cette page sans risque : la vérification continue et la
        notification arrivera, même si le minuteur expire.
      </Alerte>
    </Ecran>
  );
}

const styles = {
  centre: { alignItems: "center", paddingVertical: espace.xl },
  rond: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espace.lg,
  },
  minuteur: { fontSize: 32, fontWeight: "900", color: couleurs.bleu, letterSpacing: -1 },

  grandTitre: { fontSize: 19, fontWeight: "900", textAlign: "center" },
  titreEtat: { ...texte.titre, color: couleurs.encre, textAlign: "center" },
  grandMontant: { ...texte.montant, color: couleurs.bleu, marginTop: 6 },
  grandTexte: {
    ...texte.petit,
    color: couleurs.encre2,
    textAlign: "center",
    marginTop: espace.sm,
    lineHeight: 20,
    paddingHorizontal: espace.sm,
  },
  titreBloc: { ...texte.sousTitre, color: couleurs.bleuNuit, marginBottom: espace.md },
};
