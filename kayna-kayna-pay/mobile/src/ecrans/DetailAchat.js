import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Ecran, Carte, CarteSquelette, Anneau, Badge, Bouton, Lien, Alerte, Section, Ligne,
} from "../composants/Base";
import { api } from "../api/client";
import { surNotification } from "../api/socket";
import { couleurs, texte, espace, rayon, fcfa, ETATS_VERSEMENT, ETATS_ACHAT } from "../theme";

// Les deux états dans lesquels un versement occupe la place : tant qu'il en
// existe un, la plateforme refuse d'en ouvrir un second (règle d'unicité).
const VERSEMENT_OUVERT = ["initie", "en_attente"];

export default function DetailAchat({ route, navigation }) {
  const [achat, setAchat] = useState(null);

  const charger = useCallback(async () => {
    const r = await api(`/api/achats/${route.params.id}`);
    if (r.ok) setAchat(r.achat);
  }, [route.params.id]);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));
  useEffect(() => surNotification(() => charger()), [charger]);

  if (!achat) {
    return (
      <Ecran titre="Mon achat" retour navigation={navigation}>
        <CarteSquelette lignes={3} />
        <CarteSquelette lignes={2} />
      </Ecran>
    );
  }

  const ratio = achat.montant_verse / achat.prix_total;
  const reste = Math.max(0, achat.prix_total - achat.montant_verse);
  const versementActif = achat.versements.find((v) => VERSEMENT_OUVERT.includes(v.statut));
  const valides = achat.versements.filter((v) => v.statut === "valide");
  const etatAchat = ETATS_ACHAT[achat.statut] || { libelle: achat.statut, fond: couleurs.bleuClair, texte: couleurs.bleu };
  const termine = ["complete", "en_preparation", "livre"].includes(achat.statut);

  // Estimation honnête : moyenne des versements validés, jamais une promesse.
  const moyenne = valides.length
    ? Math.round(valides.reduce((s, v) => s + Number(v.montant_valide || 0), 0) / valides.length)
    : 0;
  const versementsRestants = moyenne > 0 && reste > 0 ? Math.ceil(reste / moyenne) : null;

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
    <Ecran
      titre={achat.produit_nom}
      sousTitre={`Réf. ${achat.reference} · ${achat.partenaire}`}
      retour
      navigation={navigation}
      onRafraichir={charger}
      pied={
        achat.statut === "en_cours" && !versementActif ? (
          <Bouton
            libelle="Faire un versement"
            variante="ambre"
            icone="💸"
            onPress={() => navigation.navigate("VersementMontant", { achatId: achat.id, reste })}
          />
        ) : null
      }
    >
      {/* ── Avancement ─────────────────────────────────────────────── */}
      <Carte style={{ alignItems: "center", paddingVertical: espace.xl }}>
        <Anneau
          ratio={ratio}
          enfant={
            <>
              <Text style={styles.anneauPourcent}>{Math.floor(ratio * 100)}</Text>
              <Text style={styles.anneauUnite}>% payé</Text>
            </>
          }
        />

        <View style={styles.chiffres}>
          <View style={styles.chiffreBloc}>
            <Text style={styles.chiffreLibelle}>Déjà versé</Text>
            <Text style={[styles.chiffreValeur, { color: couleurs.bleu }]}>{fcfa(achat.montant_verse)}</Text>
          </View>
          <View style={styles.chiffreTrait} />
          <View style={styles.chiffreBloc}>
            <Text style={styles.chiffreLibelle}>Reste à payer</Text>
            <Text style={styles.chiffreValeur}>{fcfa(reste)}</Text>
          </View>
        </View>

        {versementsRestants && achat.statut === "en_cours" ? (
          <Text style={styles.estimation}>
            À votre rythme habituel ({fcfa(moyenne)} par versement), il vous reste environ{" "}
            <Text style={{ fontWeight: "800", color: couleurs.encre }}>
              {versementsRestants} versement{versementsRestants > 1 ? "s" : ""}
            </Text>
            .
          </Text>
        ) : null}
      </Carte>

      {/* ── Ce qu'il faut faire maintenant ─────────────────────────── */}
      {achat.statut === "en_cours" ? (
        versementActif ? (
          <Carte ton="ambre">
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: espace.sm }}>
              <Text style={[texte.sousTitre, { color: couleurs.encre }]}>Versement en cours</Text>
              <Badge etat={ETATS_VERSEMENT[versementActif.statut]} />
            </View>
            <Text style={[texte.petit, { color: couleurs.encre, lineHeight: 19 }]}>
              {versementActif.statut === "initie"
                ? `Un versement de ${fcfa(versementActif.montant_declare)} est ouvert mais le dépôt n'a pas encore été confirmé. Reprenez-le pour aller au bout.`
                : `Votre dépôt de ${fcfa(versementActif.montant_declare)} est en attente de validation par notre équipe. Vous serez notifié dès que c'est fait.`}
            </Text>
            <Text style={styles.reference}>Référence {versementActif.reference}</Text>
            <Bouton
              libelle={versementActif.statut === "initie" ? "Reprendre ce versement" : "Voir l'attente"}
              onPress={() =>
                navigation.navigate(
                  versementActif.statut === "initie" ? "VersementInstructions" : "VersementAttente",
                  { versementId: versementActif.id, achatId: achat.id }
                )
              }
              style={{ marginTop: espace.md }}
            />
            <Text style={styles.note}>
              Un seul versement à la fois : c'est ce qui garantit qu'aucun dépôt ne se
              perd entre deux références.
            </Text>
          </Carte>
        ) : (
          <Alerte type="info">
            Versez ce que vous pouvez, quand vous pouvez — dès 100 F. Aucun rythme n'est imposé.
          </Alerte>
        )
      ) : termine ? (
        <Carte ton="vert">
          <Text style={styles.succesTitre}>
            {achat.statut === "livre" ? "Produit remis — merci ! 🎉" : "Paiement complété 🎉"}
          </Text>
          <Text style={[texte.petit, { color: couleurs.encre, lineHeight: 20 }]}>
            {achat.statut === "livre"
              ? "Votre historique de versements reste consultable ici : il vaut preuve d'achat."
              : `Nous organisons la remise avec ${achat.partenaire}. Modalités : ${achat.modalites_remise}`}
          </Text>
        </Carte>
      ) : (
        <Carte ton="rouge">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[texte.sousTitre, { color: couleurs.encre }]}>Achat {etatAchat.libelle}</Text>
            <Badge etat={etatAchat} />
          </View>
          <Text style={[texte.petit, { color: couleurs.encre2, marginTop: 6, lineHeight: 19 }]}>
            Le détail du traitement vous a été transmis par notification. En cas de doute,
            contactez le support depuis votre profil.
          </Text>
        </Carte>
      )}

      {/* ── Récapitulatif ──────────────────────────────────────────── */}
      <Carte>
        <Text style={[texte.sousTitre, { color: couleurs.bleuNuit, marginBottom: espace.sm }]}>
          Récapitulatif
        </Text>
        <Ligne libelle="Prix du produit" valeur={fcfa(achat.prix_total)} fort />
        <Ligne libelle="Versements validés" valeur={String(valides.length)} />
        <Ligne libelle="Vendeur" valeur={achat.partenaire} />
        <Ligne libelle="Remise" valeur={achat.modalites_remise || "à convenir"} dernier />
      </Carte>

      {/* ── Historique ─────────────────────────────────────────────── */}
      <Section titre="Historique des versements" />
      {achat.versements.length === 0 ? (
        <Carte>
          <Text style={[texte.petit, { color: couleurs.encre2, lineHeight: 19 }]}>
            Aucun versement pour l'instant. Même 100 F, c'est un pas de plus.
          </Text>
        </Carte>
      ) : (
        achat.versements.map((v) => {
          const etat = ETATS_VERSEMENT[v.statut] || { libelle: v.statut, fond: couleurs.bleuClair, texte: couleurs.bleu };
          const montant = v.montant_valide != null ? v.montant_valide : v.montant_declare;
          return (
            <Carte key={v.id} style={{ paddingVertical: espace.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: espace.md }}>
                  <Text style={styles.versementMontant}>{fcfa(montant)}</Text>
                  <Text style={styles.versementMeta}>
                    {v.reference} · {String(v.operateur).toUpperCase()} ·{" "}
                    {new Date(v.initie_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </Text>
                  {v.motif_rejet ? (
                    <Text style={styles.motifRejet}>Motif : {v.motif_rejet}</Text>
                  ) : null}
                </View>
                <Badge etat={etat} />
              </View>
            </Carte>
          );
        })
      )}

      {achat.statut === "en_cours" && !achat.annulation_demandee ? (
        <Lien
          libelle="Demander l'annulation de cet achat"
          ton="rouge"
          onPress={demanderAnnulation}
          style={{ marginTop: espace.md }}
        />
      ) : achat.annulation_demandee && achat.statut === "en_cours" ? (
        <Alerte type="attention" style={{ marginTop: espace.md }}>
          Votre demande d'annulation est en cours de traitement. Vous serez notifié de la
          suite donnée.
        </Alerte>
      ) : null}
    </Ecran>
  );
}

const styles = {
  anneauPourcent: { fontSize: 32, fontWeight: "900", color: couleurs.bleuNuit, letterSpacing: -1 },
  anneauUnite: { ...texte.legende, color: couleurs.encre2, marginTop: -2 },

  chiffres: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", marginTop: espace.xl },
  chiffreBloc: { flex: 1, alignItems: "center" },
  chiffreTrait: { width: 1, height: 32, backgroundColor: couleurs.bord },
  chiffreLibelle: { ...texte.legende, color: couleurs.encre2 },
  chiffreValeur: { fontSize: 18, fontWeight: "900", color: couleurs.encre, marginTop: 2, letterSpacing: -0.4 },

  estimation: {
    ...texte.legende,
    color: couleurs.encre2,
    textAlign: "center",
    marginTop: espace.lg,
    lineHeight: 17,
    paddingHorizontal: espace.sm,
  },

  reference: {
    ...texte.legende,
    color: couleurs.encre2,
    marginTop: 6,
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  note: { ...texte.legende, color: couleurs.encre3, marginTop: espace.sm, lineHeight: 16 },

  succesTitre: { ...texte.sousTitre, color: couleurs.vert, marginBottom: 5 },

  versementMontant: { fontSize: 16, fontWeight: "800", color: couleurs.encre },
  versementMeta: { ...texte.legende, color: couleurs.encre3, marginTop: 2 },
  motifRejet: { ...texte.legende, color: couleurs.rouge, marginTop: 4, lineHeight: 16 },
};
