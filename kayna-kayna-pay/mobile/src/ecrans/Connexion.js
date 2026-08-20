import React, { useState } from "react";
import { Ecran, Champ, Bouton, Lien, Alerte } from "../composants/Base";
import { useToast } from "../composants/Toasts";
import { api } from "../api/client";
import { useAuth } from "../contexte/Auth";
import { espace } from "../theme";

export default function Connexion({ navigation }) {
  const toast = useToast();
  const { ouvrirSession } = useAuth();
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function soumettre() {
    setErreur(null);
    setEnCours(true);
    const r = await api("/api/auth/connexion", {
      method: "POST",
      corps: { telephone, mot_de_passe: motDePasse },
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    if (r.utilisateur.role !== "client") {
      return toast(
        "attention",
        "Espace réservé aux clients",
        "Administrateurs et partenaires : utilisez l'espace web depuis un navigateur."
      );
    }
    await ouvrirSession(r.jeton, r.utilisateur);
  }

  const complet = telephone.trim() && motDePasse;

  return (
    <Ecran
      titre="Se connecter"
      sousTitre="Votre numéro de téléphone est votre identifiant."
      retour
      navigation={navigation}
    >
      {erreur ? <Alerte type="erreur">{erreur}</Alerte> : null}

      <Champ
        libelle="Numéro de téléphone"
        placeholder="90 00 00 00"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={telephone}
        onChangeText={(v) => { setTelephone(v); setErreur(null); }}
      />
      <Champ
        libelle="Mot de passe"
        secureTextEntry
        value={motDePasse}
        onChangeText={(v) => { setMotDePasse(v); setErreur(null); }}
      />

      <Bouton
        libelle={enCours ? "Connexion…" : "Se connecter"}
        onPress={soumettre}
        chargement={enCours}
        desactive={!complet}
      />

      <Lien
        libelle="Mot de passe oublié ?"
        onPress={() => navigation.navigate("MotDePasseOublie")}
        style={{ marginTop: espace.lg }}
      />
      <Lien
        libelle="Créer un compte"
        onPress={() => navigation.navigate("Inscription")}
      />
    </Ecran>
  );
}
