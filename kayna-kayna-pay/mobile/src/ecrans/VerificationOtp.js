import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ecran, Champ, Bouton, Alerte, Lien } from "../composants/Base";
import { api } from "../api/client";
import { useAuth } from "../contexte/Auth";
import { couleurs, texte, espace, rayon } from "../theme";

export default function VerificationOtp({ route, navigation }) {
  const { telephone } = route.params;
  const { ouvrirSession } = useAuth();
  const [code, setCode] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [renvoye, setRenvoye] = useState(false);

  async function verifier() {
    setErreur(null);
    setEnCours(true);
    const r = await api("/api/auth/verifier-otp", { method: "POST", corps: { telephone, code } });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    await ouvrirSession(r.jeton, r.utilisateur);
  }

  async function renvoyer() {
    setErreur(null);
    const r = await api("/api/auth/renvoyer-otp", { method: "POST", corps: { telephone } });
    if (!r.ok) return setErreur(r.erreur);
    setRenvoye(true);
  }

  const chiffres = code.replace(/\D/g, "");

  return (
    <Ecran titre="Vérification du numéro" retour navigation={navigation}>
      <View style={styles.bandeau}>
        <Text style={styles.bandeauIcone}>📩</Text>
        <Text style={styles.bandeauTexte}>
          Un code à <Text style={{ fontWeight: "800" }}>6 chiffres</Text> vient d'être envoyé par SMS au{" "}
          <Text style={{ fontWeight: "800" }}>{telephone}</Text>.
        </Text>
      </View>

      {erreur ? <Alerte type="erreur">{erreur}</Alerte> : null}
      {renvoye && !erreur ? <Alerte type="succes">Un nouveau code vient de partir.</Alerte> : null}

      <Champ
        libelle="Code reçu par SMS"
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={(v) => { setCode(v); setErreur(null); }}
        style={{ marginBottom: espace.sm }}
      />

      <View style={styles.cases}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.case_, chiffres[i] && styles.caseRemplie]}>
            <Text style={styles.caseTexte}>{chiffres[i] || ""}</Text>
          </View>
        ))}
      </View>

      <Bouton
        libelle={enCours ? "Vérification…" : "Confirmer mon numéro"}
        onPress={verifier}
        chargement={enCours}
        desactive={chiffres.length < 6}
      />

      <Lien libelle="Je n'ai rien reçu — renvoyer le code" onPress={renvoyer} style={{ marginTop: espace.lg }} />
      <Text style={styles.note}>
        Le code est valable quelques minutes. Vérifiez que le réseau capte bien.
      </Text>
    </Ecran>
  );
}

const styles = {
  bandeau: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espace.md,
    backgroundColor: couleurs.bleuClair,
    borderRadius: rayon.lg,
    padding: espace.lg,
    marginBottom: espace.lg,
  },
  bandeauIcone: { fontSize: 22 },
  bandeauTexte: { flex: 1, color: couleurs.bleuNuit, fontSize: 14, lineHeight: 20 },

  cases: { flexDirection: "row", gap: espace.sm, marginBottom: espace.xl },
  case_: {
    flex: 1,
    height: 46,
    borderRadius: rayon.md,
    borderWidth: 1.5,
    borderColor: couleurs.bord,
    backgroundColor: couleurs.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  caseRemplie: { borderColor: couleurs.bleu, backgroundColor: couleurs.bleuPale },
  caseTexte: { fontSize: 20, fontWeight: "900", color: couleurs.bleuNuit },

  note: { ...texte.legende, color: couleurs.encre3, textAlign: "center", marginTop: espace.sm },
};
