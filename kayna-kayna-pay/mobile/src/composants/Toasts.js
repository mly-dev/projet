import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { View, Text, Pressable, Animated, Easing, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { couleurs, texte, espace, rayon, ombre } from "../theme";

// Bandeaux éphémères affichés par-dessus l'application entière.
//
// Ils servent à deux choses : rendre visible ce qui arrive en temps réel
// (validation d'un versement, achat complété) où que soit le client dans
// l'application, et remplacer les fenêtres d'alerte bloquantes pour tout ce
// qui est un simple retour d'information.
//
// Règle de partage avec Alert : une alerte système ne sert qu'aux décisions
// irréversibles qui demandent un choix (annuler un achat, supprimer un
// compte). Tout le reste passe par un toast, qui n'interrompt pas.

const ContexteToasts = createContext(() => {});

const TONS = {
  succes: { fond: couleurs.vert, icone: "✓" },
  erreur: { fond: couleurs.rouge, icone: "!" },
  attention: { fond: couleurs.ambreFonce, icone: "!" },
  info: { fond: couleurs.bleu, icone: "i" },
};

// Les messages d'erreur méritent d'être lus jusqu'au bout.
const DUREES = { erreur: 7000, attention: 6000, succes: 4500, info: 5000 };

let compteur = 0;

export function FournisseurToasts({ children }) {
  const [liste, setListe] = useState([]);

  const retirer = useCallback((id) => {
    setListe((l) => l.filter((t) => t.id !== id));
  }, []);

  // ton, titre, corps, options { icone, onPress, duree }
  const toast = useCallback((ton, titre, corps, options = {}) => {
    const id = ++compteur;
    setListe((l) => {
      const suivant = [...l, { id, ton, titre, corps, ...options }];
      // Trois au maximum : au-delà, l'écran est masqué par ses propres messages.
      return suivant.slice(-3);
    });
    return id;
  }, []);

  return (
    <ContexteToasts.Provider value={toast}>
      {children}
      <Pile liste={liste} onRetirer={retirer} />
    </ContexteToasts.Provider>
  );
}

export function useToast() {
  return useContext(ContexteToasts);
}

function Pile({ liste, onRetirer }) {
  const insets = useSafeAreaInsets();
  if (!liste.length) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.pile, { top: insets.top + espace.sm }]}
    >
      {liste.map((t) => (
        <Toast key={t.id} {...t} onRetirer={() => onRetirer(t.id)} />
      ))}
    </View>
  );
}

function Toast({ ton, titre, corps, icone, onPress, duree, onRetirer }) {
  const style = TONS[ton] || TONS.info;
  const anime = useRef(new Animated.Value(0)).current;
  const parti = useRef(false);

  const sortir = useCallback(() => {
    if (parti.current) return;
    parti.current = true;
    Animated.timing(anime, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(onRetirer);
  }, [anime, onRetirer]);

  useEffect(() => {
    Animated.spring(anime, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();
    const minuterie = setTimeout(sortir, duree || DUREES[ton] || 5000);
    return () => clearTimeout(minuterie);
  }, [anime, sortir, duree, ton]);

  const translation = anime.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] });

  return (
    <Animated.View
      style={[
        styles.toast,
        ombre.flottant,
        { opacity: anime, transform: [{ translateY: translation }] },
      ]}
    >
      <Pressable
        onPress={() => {
          if (onPress) onPress();
          sortir();
        }}
        style={styles.corps}
        accessibilityRole={onPress ? "button" : "alert"}
      >
        <View style={[styles.pastille, { backgroundColor: style.fond }]}>
          <Text style={styles.pastilleTexte}>{icone || style.icone}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.titre} numberOfLines={1}>{titre}</Text>
          {corps ? (
            <Text style={styles.message} numberOfLines={3}>{corps}</Text>
          ) : null}
          {onPress ? <Text style={styles.action}>Appuyez pour ouvrir</Text> : null}
        </View>

        <Pressable
          onPress={sortir}
          hitSlop={12}
          accessibilityLabel="Fermer"
          style={styles.fermer}
        >
          <Text style={styles.fermerTexte}>✕</Text>
        </Pressable>
      </Pressable>

      <View style={[styles.filet, { backgroundColor: style.fond }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pile: {
    position: "absolute",
    left: espace.md,
    right: espace.md,
    zIndex: 9999,
    elevation: 24,
    gap: espace.sm,
  },
  toast: {
    backgroundColor: couleurs.surface,
    borderRadius: rayon.md,
    borderWidth: 1,
    borderColor: couleurs.bord,
    overflow: "hidden",
  },
  corps: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espace.md,
    paddingVertical: espace.md,
    paddingHorizontal: espace.md,
  },
  pastille: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  pastilleTexte: { color: couleurs.blanc, fontWeight: "900", fontSize: 14 },
  titre: { ...texte.corpsFort, color: couleurs.encre },
  message: { ...texte.petit, color: couleurs.encre2, marginTop: 2, lineHeight: 18 },
  action: { ...texte.legende, color: couleurs.bleu, fontWeight: "700", marginTop: 5 },
  fermer: { paddingLeft: espace.sm, paddingTop: 1 },
  fermerTexte: { color: couleurs.encre3, fontSize: 14, fontWeight: "700" },
  filet: { height: 3, width: "100%" },
});
