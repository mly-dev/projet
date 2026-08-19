import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ecran, Champ, Bouton, Alerte, Lien } from "../composants/Base";
import { api } from "../api/client";
import { useAuth } from "../contexte/Auth";
import { couleurs, espace, rayon } from "../theme";

export default function MotDePasseOublie({ navigation }) {
  const { ouvrirSession } = useAuth();
  const [etape, setEtape] = useState(1);
  const [telephone, setTelephone] = useState("");
  const [code, setCode] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function demanderCode() {
    setErreur(null);
    setEnCours(true);
    const r = await api("/api/auth/mot-de-passe-oublie", { method: "POST", corps: { telephone } });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    setEtape(2);
  }

  async function reinitialiser() {
    setErreur(null);
    setEnCours(true);
    const r = await api("/api/auth/reinitialiser", {
      method: "POST",
      corps: { telephone, code, nouveau_mot_de_passe: nouveau },
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    await ouvrirSession(r.jeton, r.utilisateur);
  }

  return (
    <Ecran titre="Mot de passe oublié" retour navigation={navigation}>
      <View style={styles.fil}>
        {[["1", "Votre numéro"], ["2", "Nouveau mot de passe"]].map(([n, libelle], i) => {
          const active = etape === i + 1;
          const faite = etape > i + 1;
          return (
            <View key={n} style={styles.filEtape}>
              <View
                style={[
                  styles.filPastille,
                  active && { backgroundColor: couleurs.bleu },
                  faite && { backgroundColor: couleurs.vert },
                ]}
              >
                <Text style={styles.filNumero}>{faite ? "✓" : n}</Text>
              </View>
              <Text style={[styles.filLibelle, (active || faite) && { color: couleurs.encre, fontWeight: "700" }]}>
                {libelle}
              </Text>
            </View>
          );
        })}
      </View>

      {erreur ? <Alerte type="erreur">{erreur}</Alerte> : null}

      {etape === 1 ? (
        <>
          <Alerte type="info">
            Saisissez votre numéro : un code de réinitialisation vous sera envoyé par SMS.
          </Alerte>
          <Champ
            libelle="Numéro de téléphone"
            placeholder="90 00 00 00"
            keyboardType="phone-pad"
            value={telephone}
            onChangeText={(v) => { setTelephone(v); setErreur(null); }}
          />
          <Bouton
            libelle={enCours ? "Envoi…" : "Recevoir le code"}
            onPress={demanderCode}
            chargement={enCours}
            desactive={!telephone.trim()}
          />
        </>
      ) : (
        <>
          <Alerte type="succes">Code envoyé au {telephone}. Il est valable quelques minutes.</Alerte>
          <Champ
            libelle="Code reçu par SMS"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(v) => { setCode(v); setErreur(null); }}
          />
          <Champ
            libelle="Nouveau mot de passe"
            secureTextEntry
            value={nouveau}
            onChangeText={(v) => { setNouveau(v); setErreur(null); }}
            aide="6 caractères minimum."
          />
          <Bouton
            libelle={enCours ? "Réinitialisation…" : "Réinitialiser et me connecter"}
            onPress={reinitialiser}
            chargement={enCours}
            desactive={code.replace(/\D/g, "").length < 6 || nouveau.length < 6}
          />
          <Lien
            libelle="Changer de numéro"
            onPress={() => { setEtape(1); setCode(""); setErreur(null); }}
            style={{ marginTop: espace.md }}
          />
        </>
      )}
    </Ecran>
  );
}

const styles = {
  fil: { flexDirection: "row", gap: espace.lg, marginBottom: espace.xl },
  filEtape: { flexDirection: "row", alignItems: "center", gap: espace.sm, flex: 1 },
  filPastille: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: couleurs.bordFort,
    alignItems: "center",
    justifyContent: "center",
  },
  filNumero: { color: couleurs.blanc, fontWeight: "800", fontSize: 12 },
  filLibelle: { color: couleurs.encre3, fontSize: 12.5, flex: 1 },
};
