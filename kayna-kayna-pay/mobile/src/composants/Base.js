import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  StyleSheet,
  Animated,
  Easing,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { couleurs, texte, espace, rayon, ombre } from "../theme";
import { BASE_URL } from "../api/client";

// Bibliothèque de composants de l'application. Un écran ne doit jamais
// redéfinir une couleur, une taille de texte ou une ombre : tout vient d'ici,
// et tout vient de theme.js. C'est ce qui rend l'application homogène d'un
// bout à l'autre du parcours.

/* ─────────────────────────── Structure d'écran ────────────────────────── */

export function Ecran({
  titre,
  sousTitre,
  retour,
  navigation,
  children,
  defiler = true,
  pied,
  actionEntete,
  onRafraichir,
  contenuStyle,
}) {
  const [rafraichit, setRafraichit] = useState(false);

  async function rafraichir() {
    if (!onRafraichir) return;
    setRafraichit(true);
    try {
      await onRafraichir();
    } finally {
      setRafraichit(false);
    }
  }

  const corps = defiler ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.defilement, contenuStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRafraichir ? (
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={rafraichir}
            colors={[couleurs.bleu]}
            tintColor={couleurs.bleu}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contenuStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.ecran} edges={["top"]}>
      {titre ? (
        <View style={styles.entete}>
          <View style={styles.enteteLigne}>
            {retour ? (
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={12}
                style={({ pressed }) => [styles.retour, pressed && { opacity: 0.55 }]}
                accessibilityRole="button"
                accessibilityLabel="Revenir en arrière"
              >
                <Text style={styles.retourTexte}>‹</Text>
              </Pressable>
            ) : null}
            <Text style={styles.enteteTitre} numberOfLines={1}>
              {titre}
            </Text>
            {actionEntete}
          </View>
          {sousTitre ? (
            <Text style={styles.enteteSousTitre} numberOfLines={2}>
              {sousTitre}
            </Text>
          ) : null}
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {corps}
      </KeyboardAvoidingView>

      {pied ? <View style={styles.pied}>{pied}</View> : null}
    </SafeAreaView>
  );
}

// Titre de section : sépare les blocs d'un écran sans alourdir.
export function Section({ titre, action, style }) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitre}>{titre}</Text>
      {action}
    </View>
  );
}

/* ──────────────────────────────── Boutons ─────────────────────────────── */

const VARIANTES = {
  primaire: { fond: couleurs.bleu, texte: couleurs.blanc, bord: couleurs.bleu },
  ambre: { fond: couleurs.ambre, texte: "#4A3200", bord: couleurs.ambre },
  secondaire: { fond: couleurs.surface, texte: couleurs.bleu, bord: couleurs.bleu },
  fantome: { fond: "transparent", texte: couleurs.bleu, bord: "transparent" },
  danger: { fond: couleurs.surface, texte: couleurs.rouge, bord: couleurs.rouge },
};

export function Bouton({
  libelle,
  onPress,
  variante = "primaire",
  desactive,
  chargement,
  taille = "normal",
  style,
  icone,
}) {
  const v = VARIANTES[variante] || VARIANTES.primaire;
  const inactif = desactive || chargement;
  const compact = taille === "petit";

  return (
    <Pressable
      onPress={onPress}
      disabled={inactif}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactif }}
      style={({ pressed }) => [
        styles.bouton,
        {
          backgroundColor: v.fond,
          borderColor: v.bord,
          paddingVertical: compact ? 9 : 14,
          paddingHorizontal: compact ? espace.lg : espace.xl,
        },
        variante === "primaire" && !inactif ? ombre.carte : null,
        inactif && { opacity: 0.45 },
        pressed && !inactif && { opacity: 0.82, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {chargement ? <ActivityIndicator color={v.texte} style={{ marginRight: 8 }} size="small" /> : null}
      {icone && !chargement ? <Text style={{ fontSize: 15, marginRight: 7 }}>{icone}</Text> : null}
      <Text style={[styles.boutonTexte, { color: v.texte, fontSize: compact ? 13.5 : 15 }]}>{libelle}</Text>
    </Pressable>
  );
}

// Lien discret : suppression de compte, annulation, mot de passe oublié…
export function Lien({ libelle, onPress, ton = "bleu", style }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link">
      {({ pressed }) => (
        <Text
          style={[
            styles.lien,
            { color: ton === "rouge" ? couleurs.rouge : couleurs.bleu },
            pressed && { opacity: 0.55 },
            style,
          ]}
        >
          {libelle}
        </Text>
      )}
    </Pressable>
  );
}

/* ───────────────────────────────── Champs ─────────────────────────────── */

export function Champ({ libelle, aide, erreur, suffixe, style, ...props }) {
  const [actif, setActif] = useState(false);

  return (
    <View style={[{ marginBottom: espace.lg }, style]}>
      {libelle ? <Text style={styles.libelle}>{libelle}</Text> : null}
      <View
        style={[
          styles.champEnveloppe,
          actif && styles.champActif,
          erreur && { borderColor: couleurs.rouge, backgroundColor: couleurs.rougePale },
        ]}
      >
        <TextInput
          style={styles.champ}
          placeholderTextColor={couleurs.encre3}
          onFocus={() => setActif(true)}
          onBlur={() => setActif(false)}
          {...props}
        />
        {suffixe ? <Text style={styles.champSuffixe}>{suffixe}</Text> : null}
      </View>
      {erreur ? (
        <Text style={styles.champErreur}>{erreur}</Text>
      ) : aide ? (
        <Text style={styles.champAide}>{aide}</Text>
      ) : null}
    </View>
  );
}

// Choix parmi quelques options courtes : opérateur, montant suggéré…
export function Puces({ options, valeur, onChoisir, style }) {
  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: espace.sm }, style]}>
      {options.map((o) => {
        const choisie = o.cle === valeur;
        return (
          <Pressable
            key={o.cle}
            onPress={() => onChoisir(o.cle)}
            accessibilityRole="button"
            accessibilityState={{ selected: choisie }}
            style={({ pressed }) => [
              styles.puce,
              choisie && { backgroundColor: couleurs.bleu, borderColor: couleurs.bleu },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text
              style={[
                styles.puceTexte,
                choisie && { color: couleurs.blanc },
              ]}
            >
              {o.libelle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Choix étalé sur la largeur : les trois opérateurs mobile money.
export function Segments({ options, valeur, onChoisir, style }) {
  return (
    <View style={[{ flexDirection: "row", gap: espace.sm }, style]}>
      {options.map((o) => {
        const choisi = o.cle === valeur;
        return (
          <Pressable
            key={o.cle}
            onPress={() => onChoisir(o.cle)}
            accessibilityRole="button"
            accessibilityState={{ selected: choisi }}
            style={({ pressed }) => [
              styles.segment,
              choisi && { backgroundColor: couleurs.bleu, borderColor: couleurs.bleu },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.segmentTexte, choisi && { color: couleurs.blanc }]}>{o.libelle}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ──────────────────────────────── Cartes ──────────────────────────────── */

export function Carte({ children, style, onPress, accent, ton }) {
  const bordure =
    ton === "vert" ? couleurs.vert
    : ton === "rouge" ? couleurs.rouge
    : ton === "ambre" ? couleurs.ambre
    : ton === "bleu" ? couleurs.bleu
    : couleurs.bord;

  const contenu = [
    styles.carte,
    ombre.carte,
    { borderColor: bordure },
    ton && ton !== "neutre" ? { borderWidth: 1.5 } : null,
    accent && { borderLeftWidth: 4, borderLeftColor: couleurs.ambre },
    style,
  ];

  if (!onPress) return <View style={contenu}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [...contenu, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }]}
    >
      {children}
    </Pressable>
  );
}

// Ligne « libellé → valeur » d'un récapitulatif.
export function Ligne({ libelle, valeur, fort, dernier }) {
  return (
    <View style={[styles.ligne, dernier && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <Text style={styles.ligneLibelle}>{libelle}</Text>
      <Text style={[styles.ligneValeur, fort && { color: couleurs.bleu, fontWeight: "900" }]}>{valeur}</Text>
    </View>
  );
}

export function Alerte({ type = "info", children, style }) {
  const tons = {
    info: [couleurs.bleuClair, couleurs.bleu, couleurs.bleuFonce],
    attention: [couleurs.ambrePale, couleurs.ambre, couleurs.ambreFonce],
    succes: [couleurs.vertPale, couleurs.vert, couleurs.vert],
    erreur: [couleurs.rougePale, couleurs.rouge, couleurs.rouge],
  };
  const [fond, barre, encre] = tons[type] || tons.info;
  return (
    <View style={[styles.alerte, { backgroundColor: fond, borderLeftColor: barre }, style]}>
      <Text style={[texte.petit, { color: encre }]}>{children}</Text>
    </View>
  );
}

/* ────────────────────────────── Indicateurs ───────────────────────────── */

export function Badge({ texte: libelle, ton = "bleu", etat }) {
  // `etat` accepte directement une entrée de ETATS_VERSEMENT / ETATS_ACHAT.
  const tons = {
    bleu: [couleurs.bleuClair, couleurs.bleu],
    vert: [couleurs.vertPale, couleurs.vert],
    rouge: [couleurs.rougePale, couleurs.rouge],
    ambre: [couleurs.ambrePale, couleurs.ambreFonce],
    orange: [couleurs.orangePale, couleurs.orange],
    neutre: [couleurs.bleuPale, couleurs.encre2],
  };
  const fond = etat ? etat.fond : (tons[ton] || tons.bleu)[0];
  const encre = etat ? etat.texte : (tons[ton] || tons.bleu)[1];
  return (
    <View style={[styles.badge, { backgroundColor: fond }]}>
      <Text style={{ color: encre, fontSize: 11.5, fontWeight: "800" }}>
        {etat ? etat.libelle : libelle}
      </Text>
    </View>
  );
}

export function Progression({ ratio, hauteur = 10, style }) {
  const cible = Math.max(0, Math.min(1, ratio || 0));
  const anime = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anime, {
      toValue: cible,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [cible, anime]);

  const largeur = anime.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.progression, { height: hauteur, borderRadius: hauteur / 2 }, style]}>
      <Animated.View
        style={{
          width: largeur,
          height: "100%",
          borderRadius: hauteur / 2,
          backgroundColor: cible >= 1 ? couleurs.vert : couleurs.bleu,
        }}
      />
    </View>
  );
}

// Anneau de progression construit avec deux demi-disques pivotés : pas de
// dépendance graphique supplémentaire, donc rien à installer en plus.
export function Anneau({ ratio, taille = 132, epaisseur = 11, enfant }) {
  const p = Math.max(0, Math.min(1, ratio || 0));
  const angle = p * 360;
  const droite = Math.min(angle, 180);
  const gauche = Math.max(0, angle - 180);
  const arc = p >= 1 ? couleurs.vert : couleurs.bleu;

  const base = {
    position: "absolute",
    width: taille,
    height: taille,
    borderRadius: taille / 2,
    borderWidth: epaisseur,
    borderTopColor: arc,
    borderRightColor: arc,
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  };

  return (
    <View style={{ width: taille, height: taille, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: taille,
          height: taille,
          borderRadius: taille / 2,
          borderWidth: epaisseur,
          borderColor: couleurs.bleuClair,
        }}
      />
      {/* Les demi-arcs ne sont montés qu'une fois entamés : à 0 %, un arc
          replié hors du masque laisserait dépasser un liseré. */}
      {droite > 0 ? (
        <View style={{ position: "absolute", right: 0, width: taille / 2, height: taille, overflow: "hidden" }}>
          <View style={[base, { right: 0, transform: [{ rotate: `${droite - 135}deg` }] }]} />
        </View>
      ) : null}
      {gauche > 0 ? (
        <View style={{ position: "absolute", left: 0, width: taille / 2, height: taille, overflow: "hidden" }}>
          <View style={[base, { left: 0, transform: [{ rotate: `${gauche + 45}deg` }] }]} />
        </View>
      ) : null}
      <View style={{ alignItems: "center" }}>{enfant}</View>
    </View>
  );
}

// Étape numérotée du parcours de dépôt.
export function Etape({ numero, children, faite }) {
  return (
    <View style={styles.etape}>
      <View style={[styles.etapePastille, faite && { backgroundColor: couleurs.vert }]}>
        <Text style={styles.etapeNumero}>{faite ? "✓" : numero}</Text>
      </View>
      <Text style={[texte.corps, { flex: 1, color: couleurs.encre }]}>{children}</Text>
    </View>
  );
}

/* ───────────────────────── Attente et états vides ─────────────────────── */

export function Chargement({ libelle }) {
  return (
    <View style={{ paddingVertical: 44, alignItems: "center" }}>
      <ActivityIndicator color={couleurs.bleu} size="large" />
      {libelle ? (
        <Text style={[texte.petit, { color: couleurs.encre2, marginTop: espace.md }]}>{libelle}</Text>
      ) : null}
    </View>
  );
}

// Bloc gris pulsant, affiché pendant le chargement d'une liste : l'écran a
// tout de suite sa forme définitive, il ne saute pas quand les données
// arrivent.
export function Squelette({ hauteur = 12, largeur = "100%", style }) {
  const pulsation = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsation, { toValue: 1, duration: 780, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulsation, { toValue: 0.4, duration: 780, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    boucle.start();
    return () => boucle.stop();
  }, [pulsation]);

  return (
    <Animated.View
      style={[
        { height: hauteur, width: largeur, borderRadius: 6, backgroundColor: couleurs.bord, opacity: pulsation },
        style,
      ]}
    />
  );
}

export function CarteSquelette({ lignes = 2 }) {
  return (
    <Carte>
      <Squelette hauteur={13} largeur="62%" />
      {Array.from({ length: lignes }).map((_, i) => (
        <Squelette key={i} hauteur={9} largeur={i === lignes - 1 ? "45%" : "88%"} style={{ marginTop: 10 }} />
      ))}
    </Carte>
  );
}

// Photo de produit. Les adresses renvoyées par l'API sont relatives : elles
// sont préfixées ici, une bonne fois, plutôt qu'à chaque écran.
//
// Un produit sans photo affiche le pictogramme de sa catégorie : mieux vaut un
// repère visuel qu'un cadre gris, et le catalogue reste lisible tant que
// l'équipe n'a pas fini de photographier les articles.
export function Photo({ source, taille = 44, arrondi = rayon.md, repli = "🏷️", style }) {
  const [echec, setEchec] = useState(false);
  const uri = source ? (source.startsWith("http") ? source : BASE_URL + source) : null;

  const cadre = [
    {
      width: taille,
      height: taille,
      borderRadius: arrondi,
      backgroundColor: couleurs.bleuClair,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    style,
  ];

  if (!uri || echec) {
    return (
      <View style={cadre}>
        <Text style={{ fontSize: taille * 0.42 }}>{repli}</Text>
      </View>
    );
  }

  return (
    <View style={cadre}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
        onError={() => setEchec(true)}
      />
    </View>
  );
}

export function Vide({ icone, titre, detail, action }) {
  return (
    <View style={styles.vide}>
      {icone ? <Text style={{ fontSize: 40, marginBottom: espace.md }}>{icone}</Text> : null}
      <Text style={[texte.sousTitre, { color: couleurs.encre, textAlign: "center" }]}>{titre}</Text>
      {detail ? (
        <Text style={[texte.petit, { color: couleurs.encre2, textAlign: "center", marginTop: 6, maxWidth: 280 }]}>
          {detail}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: espace.lg, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

/* ─────────────────────────────── Styles ───────────────────────────────── */

export const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },

  entete: {
    backgroundColor: couleurs.bleuFonce,
    paddingHorizontal: espace.lg,
    paddingTop: espace.md,
    paddingBottom: espace.md,
    borderBottomWidth: 3,
    borderBottomColor: couleurs.ambre,
  },
  enteteLigne: { flexDirection: "row", alignItems: "center" },
  enteteTitre: { color: couleurs.blanc, fontSize: 18, fontWeight: "800", flex: 1, letterSpacing: -0.2 },
  enteteSousTitre: { color: "#C7DDF0", fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  retour: { paddingRight: espace.md, marginLeft: -4 },
  retourTexte: { color: couleurs.blanc, fontSize: 30, fontWeight: "700", marginTop: -6 },

  defilement: { padding: espace.lg, paddingBottom: espace.xxl },
  pied: {
    padding: espace.lg,
    paddingBottom: espace.lg,
    backgroundColor: couleurs.surface,
    borderTopWidth: 1,
    borderTopColor: couleurs.bord,
  },

  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: espace.lg,
    marginBottom: espace.md,
  },
  sectionTitre: { fontSize: 15, fontWeight: "800", color: couleurs.bleuNuit, letterSpacing: -0.2 },

  bouton: {
    flexDirection: "row",
    borderRadius: rayon.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  boutonTexte: { fontWeight: "800", letterSpacing: -0.1 },
  lien: { fontSize: 14, fontWeight: "600", textAlign: "center", paddingVertical: 6 },

  libelle: { color: couleurs.encre2, fontSize: 12.5, fontWeight: "700", marginBottom: 6 },
  champEnveloppe: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: couleurs.surface,
    borderWidth: 1.5,
    borderColor: couleurs.bord,
    borderRadius: rayon.md,
    paddingHorizontal: espace.md,
  },
  champActif: { borderColor: couleurs.bleu, backgroundColor: couleurs.blanc },
  champ: { flex: 1, paddingVertical: 12, fontSize: 15.5, color: couleurs.encre },
  champSuffixe: { color: couleurs.encre2, fontSize: 13, fontWeight: "700", paddingLeft: espace.sm },
  champAide: { color: couleurs.encre3, fontSize: 12, marginTop: 5, lineHeight: 16 },
  champErreur: { color: couleurs.rouge, fontSize: 12, marginTop: 5, fontWeight: "600" },

  puce: {
    backgroundColor: couleurs.bleuClair,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: rayon.rond,
    paddingHorizontal: espace.lg,
    paddingVertical: 9,
  },
  puceTexte: { color: couleurs.bleu, fontWeight: "700", fontSize: 13 },

  segment: {
    flex: 1,
    backgroundColor: couleurs.surface,
    borderWidth: 1.5,
    borderColor: couleurs.bord,
    borderRadius: rayon.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  segmentTexte: { color: couleurs.encre, fontWeight: "800", fontSize: 14 },

  carte: {
    backgroundColor: couleurs.surface,
    borderRadius: rayon.lg,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: espace.lg,
    marginBottom: espace.md,
  },

  ligne: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bleuPale,
  },
  ligneLibelle: { color: couleurs.encre2, fontSize: 13.5, flex: 1, paddingRight: espace.md },
  ligneValeur: { color: couleurs.encre, fontSize: 14, fontWeight: "700" },

  alerte: {
    borderLeftWidth: 4,
    borderRadius: rayon.sm,
    paddingVertical: espace.md,
    paddingHorizontal: espace.lg,
    marginBottom: espace.md,
  },

  badge: {
    alignSelf: "flex-start",
    borderRadius: rayon.rond,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },

  progression: { backgroundColor: couleurs.bleuClair, overflow: "hidden" },

  etape: { flexDirection: "row", alignItems: "flex-start", marginBottom: espace.md, gap: espace.md },
  etapePastille: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: couleurs.bleu,
    alignItems: "center",
    justifyContent: "center",
  },
  etapeNumero: { color: couleurs.blanc, fontWeight: "800", fontSize: 13.5 },

  vide: { alignItems: "center", paddingVertical: espace.xxl, paddingHorizontal: espace.lg },
});
