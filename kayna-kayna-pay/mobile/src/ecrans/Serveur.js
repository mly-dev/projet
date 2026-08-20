import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ecran, Carte, Champ, Bouton, Lien, Alerte, Ligne } from "../composants/Base";
import { useToast } from "../composants/Toasts";
import {
  baseUrl, adresseDeConstruction, definirAdresse, reinitialiserAdresse, testerAdresse,
} from "../api/client";
import { couleurs, texte, espace } from "../theme";

// Adresse de la plateforme.
//
// Cet écran existe pour une raison précise : dans un APK, l'adresse du serveur
// est inscrite à la construction. Or les box attribuent les adresses
// dynamiquement — le jour où l'ordinateur en change, une application sans cet
// écran serait définitivement muette, et il faudrait reconstruire un APK pour
// un chiffre qui a bougé.
//
// Il est accessible avant la connexion : sans serveur joignable, on ne peut
// justement pas se connecter pour aller le corriger.
export default function Serveur({ navigation }) {
  const toast = useToast();
  const [saisie, setSaisie] = useState(baseUrl());
  const [essai, setEssai] = useState(false);
  const [resultat, setResultat] = useState(null);

  async function tester() {
    setResultat(null);
    setEssai(true);
    const r = await testerAdresse(saisie);
    setEssai(false);
    setResultat(r);
  }

  async function enregistrer() {
    try {
      const propre = await definirAdresse(saisie);
      setSaisie(propre);
      toast("succes", "Adresse enregistrée", "L'application s'y connectera désormais.");
      navigation.goBack();
    } catch (e) {
      toast("erreur", "Adresse invalide", e.message);
    }
  }

  async function remettre() {
    const v = await reinitialiserAdresse();
    setSaisie(v);
    setResultat(null);
    toast("info", "Adresse d'origine rétablie", v);
  }

  const modifiee = baseUrl() !== adresseDeConstruction();

  return (
    <Ecran
      titre="Adresse du serveur"
      sousTitre="À changer si l'adresse de l'ordinateur qui héberge la plateforme a bougé."
      retour
      navigation={navigation}
      pied={
        <>
          <Bouton
            libelle={essai ? "Essai en cours…" : "Tester cette adresse"}
            variante="secondaire"
            onPress={tester}
            chargement={essai}
            desactive={!saisie.trim()}
          />
          <View style={{ height: espace.sm }} />
          <Bouton
            libelle="Enregistrer"
            onPress={enregistrer}
            desactive={!saisie.trim() || essai}
          />
        </>
      }
    >
      <Champ
        libelle="Adresse de la plateforme"
        placeholder="192.168.1.10"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={saisie}
        onChangeText={(v) => { setSaisie(v); setResultat(null); }}
        aide="L'adresse IP de l'ordinateur suffit : « http:// » et le port 3000 sont ajoutés tout seuls."
      />

      {resultat ? (
        <Alerte type={resultat.ok ? "succes" : "erreur"}>
          {resultat.ok
            ? `Plateforme jointe. ${resultat.categories} catégorie${resultat.categories > 1 ? "s" : ""} au catalogue.`
            : resultat.erreur}
        </Alerte>
      ) : null}

      <Carte>
        <Text style={styles.titreBloc}>État actuel</Text>
        <Ligne libelle="Adresse utilisée" valeur={baseUrl()} fort />
        <Ligne
          libelle="Adresse d'origine"
          valeur={adresseDeConstruction()}
          dernier={!modifiee}
        />
        {modifiee ? (
          <View style={{ paddingTop: espace.sm }}>
            <Lien libelle="Revenir à l'adresse d'origine" onPress={remettre} />
          </View>
        ) : null}
      </Carte>

      <Alerte type="info">
        Le téléphone et l'ordinateur doivent être sur le même Wi-Fi. Sur
        l'ordinateur, la commande « ipconfig » donne l'adresse à saisir — celle
        de la carte Wi-Fi, pas une adresse commençant par 172 ou 192.168.56.
      </Alerte>
    </Ecran>
  );
}

const styles = {
  titreBloc: { ...texte.sousTitre, color: couleurs.bleuNuit, marginBottom: espace.sm },
};
