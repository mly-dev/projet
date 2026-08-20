import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Ecran, Carte, Bouton, CarteSquelette, Etape, Alerte, Badge } from "../composants/Base";
import { useToast } from "../composants/Toasts";
import { api } from "../api/client";
import { couleurs, texte, espace, rayon, fcfa, ETATS_VERSEMENT } from "../theme";

// Instructions de dépôt : numéro de la plateforme pour l'opérateur choisi,
// montant, et référence unique à indiquer dans le motif du transfert.
//
// C'est l'écran le plus important de l'application : c'est ici que le client
// engage de l'argent réel. La référence est donc affichée en très grand,
// chiffre par chiffre, pour qu'elle soit recopiable sans erreur au guichet.
export default function VersementInstructions({ route, navigation }) {
  const toast = useToast();
  const { versementId, achatId } = route.params;
  const [instructions, setInstructions] = useState(route.params.instructions || null);
  const [versement, setVersement] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [confirme, setConfirme] = useState(false);

  useEffect(() => {
    api(`/api/versements/${versementId}`).then((r) => {
      if (!r.ok) return;
      setVersement(r.versement);
      // Reprise d'un versement initié : les instructions viennent du serveur,
      // numéro de dépôt compris.
      if (r.instructions) setInstructions((prec) => prec || r.instructions);
    });
  }, [versementId]);

  if (!instructions) {
    return (
      <Ecran titre="Instructions de dépôt" retour navigation={navigation}>
        <CarteSquelette lignes={2} />
        <CarteSquelette lignes={3} />
      </Ecran>
    );
  }

  async function confirmerDepot() {
    setEnCours(true);
    const r = await api(`/api/versements/${versementId}/confirmer`, { method: "POST" });
    setEnCours(false);
    if (!r.ok) return toast("erreur", "Déclaration impossible", r.erreur);
    navigation.replace("VersementAttente", { versementId, achatId });
  }

  const operateur = String(instructions.operateur).toUpperCase();
  const dejaEnvoye = versement && versement.statut !== "initie";

  const etapes = [
    `Ouvrez votre application ou allez chez un agent ${operateur}.`,
    instructions.numero_depot
      ? `Envoyez ${fcfa(instructions.montant)} au numéro ${instructions.numero_depot}.`
      : `Envoyez ${fcfa(instructions.montant)} au numéro de dépôt Kayna Kayna Pay indiqué ci-dessus.`,
    `Indiquez la référence ${instructions.reference} dans le motif du transfert.`,
    "Revenez ici et appuyez sur « J'ai effectué le dépôt ».",
  ];

  return (
    <Ecran
      titre="Instructions de dépôt"
      retour
      navigation={navigation}
      pied={
        dejaEnvoye ? (
          <Bouton
            libelle="Voir où en est mon dépôt"
            onPress={() => navigation.replace("VersementAttente", { versementId, achatId })}
          />
        ) : confirme ? (
          <>
            <Text style={styles.confirmeQuestion}>
              Avez-vous bien envoyé {fcfa(instructions.montant)} par {operateur} ?
            </Text>
            <Bouton
              libelle={enCours ? "Envoi…" : "Oui, j'ai effectué le dépôt"}
              variante="ambre"
              onPress={confirmerDepot}
              chargement={enCours}
            />
            <View style={{ height: espace.sm }} />
            <Bouton libelle="Pas encore" variante="fantome" onPress={() => setConfirme(false)} taille="petit" />
          </>
        ) : (
          <>
            <Bouton
              libelle="J'ai effectué le dépôt ✓"
              variante="ambre"
              onPress={() => setConfirme(true)}
            />
            <Text style={styles.piedNote}>
              N'appuyez qu'après avoir réellement envoyé l'argent.
            </Text>
          </>
        )
      }
    >
      {/* ── La référence, en très grand ─────────────────────────────── */}
      <View style={styles.blocReference}>
        <Text style={styles.blocLibelle}>Référence à indiquer dans le motif</Text>
        <View style={styles.caracteres}>
          {String(instructions.reference).split("").map((c, i) => (
            <View key={i} style={styles.caractere}>
              <Text style={styles.caractereTexte}>{c}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.blocAide}>
          Recopiez-la exactement. C'est elle qui relie votre dépôt à votre achat.
        </Text>
      </View>

      {/* ── Le montant et le numéro ─────────────────────────────────── */}
      <Carte>
        <View style={styles.duo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.duoLibelle}>Montant à envoyer</Text>
            <Text style={styles.duoMontant}>{fcfa(instructions.montant)}</Text>
          </View>
          <View style={styles.duoTrait} />
          <View style={{ flex: 1 }}>
            <Text style={styles.duoLibelle}>Opérateur</Text>
            <Text style={styles.duoOperateur}>{operateur}</Text>
          </View>
        </View>

        <View style={styles.numeroBloc}>
          <Text style={styles.duoLibelle}>Numéro de dépôt Kayna Kayna Pay</Text>
          {instructions.numero_depot ? (
            <Text style={styles.numero} selectable>
              {instructions.numero_depot}
            </Text>
          ) : (
            <Text style={styles.numeroAbsent}>
              Numéro momentanément indisponible — contactez le support avant de déposer.
            </Text>
          )}
        </View>
      </Carte>

      {versement ? (
        <View style={{ alignItems: "flex-start", marginBottom: espace.md }}>
          <Badge etat={ETATS_VERSEMENT[versement.statut]} />
        </View>
      ) : null}

      {/* ── Le mode d'emploi ────────────────────────────────────────── */}
      <Carte>
        <Text style={styles.titreBloc}>Marche à suivre</Text>
        {etapes.map((e, i) => (
          <Etape key={i} numero={i + 1}>{e}</Etape>
        ))}
      </Carte>

      <Alerte type="attention">
        {instructions.frais} Envoyez bien le montant exact : un écart oblige notre équipe à
        vérifier, ce qui retarde la validation.
      </Alerte>

      <Alerte type="info">
        Un dépôt réellement effectué n'est jamais perdu, même si vous fermez l'application.
        Vous le retrouverez dans votre achat.
      </Alerte>
    </Ecran>
  );
}

const styles = {
  blocReference: {
    backgroundColor: couleurs.bleuNuit,
    borderRadius: rayon.lg,
    padding: espace.lg,
    marginBottom: espace.md,
    alignItems: "center",
  },
  blocLibelle: { color: "#C7DDF0", fontSize: 12, fontWeight: "700", marginBottom: espace.md },
  caracteres: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 5 },
  caractere: {
    minWidth: 30,
    paddingHorizontal: 5,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  caractereTexte: { color: couleurs.blanc, fontSize: 21, fontWeight: "900", letterSpacing: 0.5 },
  blocAide: { color: "#9FBEDA", fontSize: 11.5, textAlign: "center", marginTop: espace.md, lineHeight: 16 },

  duo: { flexDirection: "row", alignItems: "center", gap: espace.lg },
  duoTrait: { width: 1, height: 36, backgroundColor: couleurs.bord },
  duoLibelle: { ...texte.legende, color: couleurs.encre2, fontWeight: "700" },
  duoMontant: { fontSize: 21, fontWeight: "900", color: couleurs.bleu, marginTop: 2, letterSpacing: -0.5 },
  duoOperateur: { fontSize: 19, fontWeight: "900", color: couleurs.encre, marginTop: 2 },

  numeroBloc: {
    marginTop: espace.lg,
    paddingTop: espace.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.bleuPale,
  },
  numero: { fontSize: 25, fontWeight: "900", color: couleurs.encre, letterSpacing: 2, marginTop: 4 },
  numeroAbsent: { ...texte.petit, color: couleurs.rouge, marginTop: 4, lineHeight: 18 },

  titreBloc: { ...texte.sousTitre, color: couleurs.bleuNuit, marginBottom: espace.md },

  confirmeQuestion: {
    ...texte.petit,
    color: couleurs.encre,
    textAlign: "center",
    marginBottom: espace.md,
    lineHeight: 19,
  },
  piedNote: { ...texte.legende, color: couleurs.encre3, textAlign: "center", marginTop: espace.sm },
};
