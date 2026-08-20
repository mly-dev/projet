import React, { useCallback, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ecran, Carte, Champ, Bouton, Lien, Section, Alerte } from "../composants/Base";
import { useToast } from "../composants/Toasts";
import { api } from "../api/client";
import { useAuth } from "../contexte/Auth";
import { couleurs, texte, espace, rayon, fcfa } from "../theme";

const LIENS = [
  ["📄", "Conditions générales d'utilisation", "cgu"],
  ["🔐", "Politique de confidentialité", "confidentialite"],
  ["❓", "Aide / questions fréquentes", "faq"],
  ["☎️", "Nous contacter", "contact"],
];

function initiales(nom) {
  return String(nom || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();
}

export default function Profil({ navigation }) {
  const toast = useToast();
  const { utilisateur, fermerSession, supprimerCompte } = useAuth();
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [stats, setStats] = useState(null);

  const charger = useCallback(async () => {
    const r = await api("/api/achats");
    if (!r.ok) return;
    const achats = r.achats || [];
    setStats({
      achats: achats.length,
      verse: achats.reduce((s, a) => s + Number(a.montant_verse || 0), 0),
      livres: achats.filter((a) => a.statut === "livre").length,
    });
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  async function changerMotDePasse() {
    setErreur(null);
    setSucces(false);
    setEnCours(true);
    const r = await api("/api/profil", {
      method: "PUT",
      corps: { ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau },
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    setAncien("");
    setNouveau("");
    setSucces(true);
    setOuvert(false);
  }

  function confirmerSuppression() {
    Alert.alert(
      "Supprimer mon compte ?",
      "Vos données personnelles seront supprimées. Cette action est définitive.",
      [
        { text: "Annuler" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const r = await supprimerCompte();
            if (!r.ok) toast("erreur", "Suppression impossible", r.erreur);
          },
        },
      ]
    );
  }

  return (
    <Ecran titre="Mon profil" onRafraichir={charger}>
      <Carte>
        <View style={{ flexDirection: "row", alignItems: "center", gap: espace.lg }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexte}>{initiales(utilisateur.nom)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nom}>{utilisateur.nom}</Text>
            <Text style={styles.telephone}>{utilisateur.telephone}</Text>
          </View>
        </View>

        {stats ? (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValeur}>{stats.achats}</Text>
              <Text style={styles.statLibelle}>achat{stats.achats > 1 ? "s" : ""}</Text>
            </View>
            <View style={styles.statTrait} />
            <View style={styles.stat}>
              <Text style={styles.statValeur}>{fcfa(stats.verse)}</Text>
              <Text style={styles.statLibelle}>versés au total</Text>
            </View>
            <View style={styles.statTrait} />
            <View style={styles.stat}>
              <Text style={styles.statValeur}>{stats.livres}</Text>
              <Text style={styles.statLibelle}>reçu{stats.livres > 1 ? "s" : ""}</Text>
            </View>
          </View>
        ) : null}
      </Carte>

      <Section titre="Sécurité" />
      {succes ? <Alerte type="succes">Votre mot de passe a été changé.</Alerte> : null}
      <Carte>
        {!ouvert ? (
          <Pressable onPress={() => { setOuvert(true); setSucces(false); }} style={styles.rangee}>
            <Text style={styles.rangeeIcone}>🔑</Text>
            <Text style={styles.rangeeTexte}>Changer mon mot de passe</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ) : (
          <>
            <Text style={styles.titreBloc}>Changer mon mot de passe</Text>
            {erreur ? <Alerte type="erreur">{erreur}</Alerte> : null}
            <Champ libelle="Mot de passe actuel" secureTextEntry value={ancien} onChangeText={(v) => { setAncien(v); setErreur(null); }} />
            <Champ
              libelle="Nouveau mot de passe"
              secureTextEntry
              value={nouveau}
              onChangeText={(v) => { setNouveau(v); setErreur(null); }}
              aide="6 caractères minimum."
            />
            <Bouton
              libelle={enCours ? "Enregistrement…" : "Enregistrer"}
              onPress={changerMotDePasse}
              chargement={enCours}
              desactive={!ancien || nouveau.length < 6}
            />
            <Bouton
              libelle="Annuler"
              variante="fantome"
              taille="petit"
              onPress={() => { setOuvert(false); setAncien(""); setNouveau(""); setErreur(null); }}
              style={{ marginTop: espace.sm }}
            />
          </>
        )}
      </Carte>

      <Section titre="Informations" />
      <Carte style={{ paddingVertical: espace.xs }}>
        {LIENS.map(([icone, libelle, cle], i) => (
          <Pressable
            key={cle}
            onPress={() => navigation.navigate("Contenu", { cle })}
            style={[styles.rangee, i < LIENS.length - 1 && styles.rangeeBord]}
          >
            <Text style={styles.rangeeIcone}>{icone}</Text>
            <Text style={styles.rangeeTexte}>{libelle}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </Carte>

      <Alerte type="info">
        Votre argent versé est conservé par Kayna Kayna Pay jusqu'à la remise du produit.
        Aucun versement validé ne peut être modifié ni supprimé, par personne.
      </Alerte>

      <Bouton libelle="Se déconnecter" variante="secondaire" onPress={fermerSession} />
      <Lien
        libelle="Supprimer mon compte"
        ton="rouge"
        onPress={confirmerSuppression}
        style={{ marginTop: espace.lg }}
      />
      <Text style={styles.version}>Kayna Kayna Pay · « Petit à petit, paye »</Text>
    </Ecran>
  );
}

const styles = {
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: couleurs.bleuNuit, alignItems: "center", justifyContent: "center",
  },
  avatarTexte: { color: couleurs.ambre, fontSize: 19, fontWeight: "900", letterSpacing: 0.5 },
  nom: { ...texte.titre, color: couleurs.encre },
  telephone: { ...texte.petit, color: couleurs.encre2, marginTop: 2 },

  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: espace.lg,
    paddingTop: espace.lg,
    borderTopWidth: 1,
    borderTopColor: couleurs.bleuPale,
  },
  stat: { flex: 1, alignItems: "center" },
  statTrait: { width: 1, height: 28, backgroundColor: couleurs.bord },
  statValeur: { fontSize: 15, fontWeight: "900", color: couleurs.bleu, letterSpacing: -0.3 },
  statLibelle: { ...texte.legende, color: couleurs.encre3, marginTop: 2 },

  titreBloc: { ...texte.sousTitre, color: couleurs.bleuNuit, marginBottom: espace.md },

  rangee: { flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: espace.md },
  rangeeBord: { borderBottomWidth: 1, borderBottomColor: couleurs.bleuPale },
  rangeeIcone: { fontSize: 16, width: 22, textAlign: "center" },
  rangeeTexte: { ...texte.corps, color: couleurs.encre, flex: 1 },
  chevron: { color: couleurs.encre3, fontSize: 22, fontWeight: "300" },

  version: { ...texte.legende, color: couleurs.encre3, textAlign: "center", marginTop: espace.xl },
};
