import React, { useState } from "react";
import { View, Text, Switch, Pressable } from "react-native";
import { Ecran, Champ, Bouton, Lien, Alerte } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, texte, espace, rayon } from "../theme";

export default function Inscription({ navigation }) {
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [cgu, setCgu] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function soumettre() {
    setErreur(null);
    setEnCours(true);
    const r = await api("/api/auth/inscription", {
      method: "POST",
      corps: { telephone, nom, mot_de_passe: motDePasse, cgu_acceptees: true },
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    navigation.navigate("VerificationOtp", { telephone: r.telephone });
  }

  const motDePasseCourt = motDePasse.length > 0 && motDePasse.length < 6;
  const complet = telephone.trim() && nom.trim() && motDePasse.length >= 6 && cgu;

  return (
    <Ecran
      titre="Créer mon compte"
      sousTitre="Trois informations suffisent. Aucun frais à l'inscription."
      retour
      navigation={navigation}
    >
      {erreur ? <Alerte type="erreur">{erreur}</Alerte> : null}

      <Champ
        libelle="Numéro de téléphone"
        aide="C'est votre identifiant. Il recevra le code de vérification."
        placeholder="90 00 00 00"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={telephone}
        onChangeText={(v) => { setTelephone(v); setErreur(null); }}
      />
      <Champ
        libelle="Nom complet"
        placeholder="Votre nom et prénom"
        value={nom}
        onChangeText={(v) => { setNom(v); setErreur(null); }}
      />
      <Champ
        libelle="Mot de passe"
        secureTextEntry
        value={motDePasse}
        onChangeText={(v) => { setMotDePasse(v); setErreur(null); }}
        aide="6 caractères minimum."
        erreur={motDePasseCourt ? "Encore un peu court : 6 caractères minimum." : null}
      />

      <Pressable
        onPress={() => setCgu(!cgu)}
        style={[styles.cgu, cgu && { borderColor: couleurs.bleu, backgroundColor: couleurs.bleuPale }]}
      >
        <Switch
          value={cgu}
          onValueChange={setCgu}
          trackColor={{ true: couleurs.bleu, false: couleurs.bordFort }}
          thumbColor={couleurs.blanc}
        />
        <Text style={styles.cguTexte}>
          J'accepte les{" "}
          <Text
            style={styles.cguLien}
            onPress={() => navigation.navigate("Contenu", { cle: "cgu" })}
          >
            conditions générales d'utilisation
          </Text>{" "}
          et la{" "}
          <Text
            style={styles.cguLien}
            onPress={() => navigation.navigate("Contenu", { cle: "confidentialite" })}
          >
            politique de confidentialité
          </Text>
          .
        </Text>
      </Pressable>

      <Bouton
        libelle={enCours ? "Envoi du code…" : "Recevoir mon code par SMS"}
        onPress={soumettre}
        chargement={enCours}
        desactive={!complet}
      />

      <Text style={styles.note}>
        Un code à 6 chiffres vous sera envoyé par SMS pour confirmer votre numéro.
      </Text>

      <Lien libelle="J'ai déjà un compte" onPress={() => navigation.navigate("Connexion")} />
    </Ecran>
  );
}

const styles = {
  cgu: {
    flexDirection: "row",
    alignItems: "center",
    gap: espace.md,
    borderWidth: 1.5,
    borderColor: couleurs.bord,
    borderRadius: rayon.md,
    padding: espace.md,
    marginBottom: espace.lg,
    backgroundColor: couleurs.surface,
  },
  cguTexte: { flex: 1, color: couleurs.encre, fontSize: 13, lineHeight: 18 },
  cguLien: { color: couleurs.bleu, fontWeight: "700" },
  note: {
    ...texte.petit,
    color: couleurs.encre3,
    textAlign: "center",
    marginTop: espace.md,
  },
};
