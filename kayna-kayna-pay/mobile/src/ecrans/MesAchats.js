import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Ecran, Carte, CarteSquelette, Progression, Badge, Vide, Bouton, Puces, Section,
} from "../composants/Base";
import { api } from "../api/client";
import { surNotification } from "../api/socket";
import { couleurs, texte, espace, fcfa, ETATS_ACHAT } from "../theme";

const FILTRES = [
  { cle: "actifs", libelle: "En cours" },
  { cle: "termines", libelle: "Terminés" },
  { cle: "tous", libelle: "Tous" },
];

const ACTIFS = ["en_cours", "complete", "en_preparation"];

export default function MesAchats({ navigation }) {
  const [achats, setAchats] = useState(null);
  const [filtre, setFiltre] = useState("actifs");

  const charger = useCallback(async () => {
    const r = await api("/api/achats");
    setAchats(r.ok ? r.achats : []);
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  // Même raison qu'à l'accueil : la progression doit avancer sous les yeux du
  // client au moment où son versement est validé.
  useEffect(() => surNotification(() => charger()), [charger]);

  const visibles = (achats || []).filter((a) =>
    filtre === "tous" ? true : filtre === "actifs" ? ACTIFS.includes(a.statut) : !ACTIFS.includes(a.statut)
  );

  const enCours = (achats || []).filter((a) => a.statut === "en_cours");
  const total = enCours.reduce(
    (acc, a) => ({ verse: acc.verse + Number(a.montant_verse), du: acc.du + Number(a.prix_total) }),
    { verse: 0, du: 0 }
  );

  return (
    <Ecran titre="Mes achats" onRafraichir={charger}>
      {achats === null ? (
        <>
          <CarteSquelette lignes={2} />
          <CarteSquelette lignes={2} />
        </>
      ) : achats.length === 0 ? (
        <Vide
          icone="💼"
          titre="Aucun achat pour l'instant"
          detail="Choisissez un produit dans le catalogue et commencez à le payer petit à petit — même 100 F."
          action={
            <Bouton
              libelle="Parcourir le catalogue"
              variante="ambre"
              onPress={() => navigation.navigate("Recherche", {})}
            />
          }
        />
      ) : (
        <>
          {enCours.length ? (
            <Carte>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: espace.md }}>
                <View>
                  <Text style={styles.grandLibelle}>Total déjà versé</Text>
                  <Text style={styles.grandChiffre}>{fcfa(total.verse)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.grandLibelle}>Reste à payer</Text>
                  <Text style={[styles.grandChiffre, { color: couleurs.encre }]}>
                    {fcfa(Math.max(0, total.du - total.verse))}
                  </Text>
                </View>
              </View>
              <Progression ratio={total.du ? total.verse / total.du : 0} />
              <Text style={styles.grandNote}>
                {enCours.length} achat{enCours.length > 1 ? "s" : ""} en cours ·{" "}
                {total.du ? Math.floor((total.verse / total.du) * 100) : 0} % du total
              </Text>
            </Carte>
          ) : null}

          <Puces options={FILTRES} valeur={filtre} onChoisir={setFiltre} style={{ marginBottom: espace.lg }} />

          {visibles.length === 0 ? (
            <Vide
              titre={filtre === "actifs" ? "Aucun achat en cours" : "Aucun achat terminé"}
              detail={
                filtre === "actifs"
                  ? "Vos achats en cours apparaîtront ici."
                  : "Les achats livrés, annulés ou remboursés se retrouveront ici."
              }
            />
          ) : (
            visibles.map((a) => {
              const etat = ETATS_ACHAT[a.statut] || { libelle: a.statut, fond: couleurs.bleuClair, texte: couleurs.bleu };
              const ratio = a.montant_verse / a.prix_total;
              return (
                <Carte key={a.id} onPress={() => navigation.navigate("DetailAchat", { id: a.id })}>
                  <View style={styles.enTete}>
                    <Text style={styles.nom} numberOfLines={1}>{a.produit_nom}</Text>
                    <Badge etat={etat} />
                  </View>
                  <Progression ratio={ratio} />
                  <View style={styles.basLigne}>
                    <Text style={styles.montants}>
                      <Text style={{ fontWeight: "800", color: couleurs.bleu }}>{fcfa(a.montant_verse)}</Text>
                      {" / "}
                      {fcfa(a.prix_total)}
                    </Text>
                    <Text style={styles.pourcent}>{Math.floor(ratio * 100)} %</Text>
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {a.partenaire} · réf. {a.reference}
                  </Text>
                </Carte>
              );
            })
          )}
        </>
      )}
    </Ecran>
  );
}

const styles = {
  grandLibelle: { ...texte.legende, color: couleurs.encre2 },
  grandChiffre: { fontSize: 21, fontWeight: "900", color: couleurs.bleu, letterSpacing: -0.5, marginTop: 2 },
  grandNote: { ...texte.legende, color: couleurs.encre3, marginTop: 8 },

  enTete: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: espace.sm, gap: espace.sm },
  nom: { ...texte.corpsFort, color: couleurs.encre, flex: 1 },
  basLigne: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  montants: { ...texte.petit, color: couleurs.encre2 },
  pourcent: { color: couleurs.bleu, fontWeight: "900", fontSize: 13 },
  meta: { ...texte.legende, color: couleurs.encre3, marginTop: 4 },
};
