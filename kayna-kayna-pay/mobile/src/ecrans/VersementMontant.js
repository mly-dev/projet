import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ecran, Carte, Champ, Bouton, Puces, Segments, Alerte, Ligne } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, texte, espace, rayon, fcfa, OPERATEURS } from "../theme";

const SUGGESTIONS = [100, 500, 1000, 2500, 5000, 10000];

export default function VersementMontant({ route, navigation }) {
  const { achatId, reste } = route.params;
  const [montant, setMontant] = useState("");
  const [operateur, setOperateur] = useState("nita");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  const valeur = Number(montant.replace(/\D/g, "")) || 0;
  const trop = valeur > reste;
  const insuffisant = valeur > 0 && valeur < 100;
  const solde = trop ? 0 : reste - valeur;
  const solde_ = Math.max(0, solde);

  async function continuer() {
    setErreur(null);
    setEnCours(true);
    const r = await api("/api/versements", {
      method: "POST",
      corps: { achat_id: achatId, montant: valeur, operateur },
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    navigation.replace("VersementInstructions", {
      versementId: r.versement.id,
      achatId,
      instructions: r.instructions,
    });
  }

  const suggestions = SUGGESTIONS.filter((s) => s <= Math.max(reste, 100)).map((s) => ({
    cle: String(s),
    libelle: fcfa(s),
  }));
  if (reste > 0 && !SUGGESTIONS.includes(reste)) {
    suggestions.push({ cle: String(reste), libelle: `Tout solder — ${fcfa(reste)}` });
  }

  return (
    <Ecran
      titre="Faire un versement"
      sousTitre="Vous choisissez le montant. Il n'y a aucun minimum imposé au-delà de 100 F."
      retour
      navigation={navigation}
      pied={
        <>
          <Bouton
            libelle={enCours ? "Préparation…" : "Voir les instructions de dépôt"}
            onPress={continuer}
            chargement={enCours}
            desactive={valeur < 100 || trop}
          />
          <Text style={styles.piedNote}>
            Rien n'est débité ici : l'étape suivante vous indique où déposer l'argent.
          </Text>
        </>
      }
    >
      <Carte>
        <Ligne libelle="Reste à payer sur cet achat" valeur={fcfa(reste)} fort dernier />
      </Carte>

      {erreur ? <Alerte type="erreur">{erreur}</Alerte> : null}

      <Champ
        libelle="Montant à verser"
        suffixe="F CFA"
        placeholder="Ex. 1 000"
        keyboardType="number-pad"
        value={montant}
        onChangeText={(v) => { setMontant(v); setErreur(null); }}
        erreur={
          insuffisant ? "Le minimum est de 100 F."
          : trop ? `C'est plus que le reste à payer (${fcfa(reste)}).`
          : null
        }
        style={{ marginBottom: espace.md }}
      />

      <Text style={styles.libelleGroupe}>Montants fréquents</Text>
      <Puces
        options={suggestions}
        valeur={String(valeur)}
        onChoisir={(c) => { setMontant(c); setErreur(null); }}
        style={{ marginBottom: espace.xl }}
      />

      <Text style={styles.libelleGroupe}>Je dépose avec</Text>
      <Segments
        options={OPERATEURS.map((o) => ({ cle: o.cle, libelle: o.nom }))}
        valeur={operateur}
        onChoisir={setOperateur}
        style={{ marginBottom: espace.xl }}
      />

      {valeur >= 100 && !trop ? (
        <Carte ton="bleu">
          <Text style={styles.apercuTitre}>Après ce versement</Text>
          <View style={styles.apercuLigne}>
            <Text style={styles.apercuValeur}>{fcfa(solde_)}</Text>
            <Text style={styles.apercuTexte}>
              {solde_ === 0
                ? "Votre achat sera entièrement payé — nous organiserons la remise. 🎉"
                : "resteront à payer sur cet achat."}
            </Text>
          </View>
        </Carte>
      ) : null}

      <Alerte type="attention">
        Les frais de dépôt mobile money restent à votre charge : c'est l'opérateur qui les
        prélève, pas Kayna Kayna Pay.
      </Alerte>
    </Ecran>
  );
}

const styles = {
  libelleGroupe: { ...texte.legende, color: couleurs.encre2, fontWeight: "700", marginBottom: espace.sm },
  apercuTitre: { ...texte.legende, color: couleurs.encre2, fontWeight: "700", marginBottom: 6 },
  apercuLigne: { flexDirection: "row", alignItems: "baseline", gap: espace.sm, flexWrap: "wrap" },
  apercuValeur: { fontSize: 22, fontWeight: "900", color: couleurs.bleu, letterSpacing: -0.5 },
  apercuTexte: { ...texte.petit, color: couleurs.encre, flex: 1, minWidth: 140 },
  piedNote: { ...texte.legende, color: couleurs.encre3, textAlign: "center", marginTop: espace.sm },
};
