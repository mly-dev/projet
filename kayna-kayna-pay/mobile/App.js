import React from "react";
import { View, Text, ActivityIndicator, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FournisseurAuth, useAuth } from "./src/contexte/Auth";
import { FournisseurNotifications, useNotifications } from "./src/contexte/Notifications";
import { couleurs } from "./src/theme";

import Bienvenue from "./src/ecrans/Bienvenue";
import Inscription from "./src/ecrans/Inscription";
import VerificationOtp from "./src/ecrans/VerificationOtp";
import Connexion from "./src/ecrans/Connexion";
import MotDePasseOublie from "./src/ecrans/MotDePasseOublie";
import Accueil from "./src/ecrans/Accueil";
import Recherche from "./src/ecrans/Recherche";
import FicheProduit from "./src/ecrans/FicheProduit";
import MesAchats from "./src/ecrans/MesAchats";
import DetailAchat from "./src/ecrans/DetailAchat";
import VersementMontant from "./src/ecrans/VersementMontant";
import VersementInstructions from "./src/ecrans/VersementInstructions";
import VersementAttente from "./src/ecrans/VersementAttente";
import Notifications from "./src/ecrans/Notifications";
import Profil from "./src/ecrans/Profil";
import Contenu from "./src/ecrans/Contenu";

const Pile = createNativeStackNavigator();
const Onglets = createBottomTabNavigator();

const ICONES = { Accueil: "🏠", MesAchats: "💼", Notifications: "🔔", Profil: "👤" };

// Pastille de l'onglet Notifications : le nombre de messages non lus.
function IconeOnglet({ nom, focused }) {
  const { nonLues } = useNotifications();
  const compte = nom === "Notifications" ? nonLues : 0;

  return (
    <View style={{ width: 34, alignItems: "center" }}>
      <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.5 }}>{ICONES[nom]}</Text>
      {compte > 0 ? (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: 0,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: couleurs.rouge,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: couleurs.surface,
          }}
        >
          <Text style={{ color: couleurs.blanc, fontSize: 9.5, fontWeight: "900" }}>
            {compte > 9 ? "9+" : compte}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function OngletsPrincipaux() {
  return (
    <FournisseurNotifications>
      <BarreOnglets />
    </FournisseurNotifications>
  );
}

function BarreOnglets() {
  return (
    <Onglets.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: couleurs.bleu,
        tabBarInactiveTintColor: couleurs.encre3,
        // Seules les couleurs sont imposées : la hauteur et les marges de la
        // barre restent celles de la navigation, qui tient compte de la zone
        // de sécurité propre à chaque téléphone.
        tabBarStyle: {
          backgroundColor: couleurs.surface,
          borderTopColor: couleurs.bord,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ focused }) => <IconeOnglet nom={route.name} focused={focused} />,
      })}
    >
      <Onglets.Screen name="Accueil" component={Accueil} options={{ title: "Accueil" }} />
      <Onglets.Screen name="MesAchats" component={MesAchats} options={{ title: "Mes achats" }} />
      <Onglets.Screen name="Notifications" component={Notifications} options={{ title: "Notifications" }} />
      <Onglets.Screen name="Profil" component={Profil} options={{ title: "Profil" }} />
    </Onglets.Navigator>
  );
}

// Écran d'amorçage : évite l'éclair blanc pendant la lecture de la session
// enregistrée sur le téléphone.
function Amorcage() {
  return (
    <View style={{ flex: 1, backgroundColor: couleurs.bleuNuit, alignItems: "center", justifyContent: "center" }}>
      <Image
        source={require("./assets/logo-marque-blanc.png")}
        style={{ width: 96, height: 96, marginBottom: 26 }}
        resizeMode="contain"
      />
      <ActivityIndicator color={couleurs.ambre} />
    </View>
  );
}

// Le thème de React Navigation est complété, jamais remplacé : il porte aussi
// une table de polices (`fonts`) que la barre d'onglets lit au rendu.
const THEME_NAVIGATION = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: couleurs.bleu,
    background: couleurs.fond,
    card: couleurs.surface,
    text: couleurs.encre,
    border: couleurs.bord,
    notification: couleurs.rouge,
  },
};

function Navigation() {
  const { chargement, utilisateur } = useAuth();
  if (chargement) return <Amorcage />;

  return (
    <NavigationContainer theme={THEME_NAVIGATION}>
      <Pile.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        {utilisateur ? (
          <>
            <Pile.Screen name="Principal" component={OngletsPrincipaux} />
            <Pile.Screen name="Recherche" component={Recherche} />
            <Pile.Screen name="FicheProduit" component={FicheProduit} />
            <Pile.Screen name="DetailAchat" component={DetailAchat} />
            <Pile.Screen name="VersementMontant" component={VersementMontant} />
            <Pile.Screen name="VersementInstructions" component={VersementInstructions} />
            <Pile.Screen name="VersementAttente" component={VersementAttente} />
            <Pile.Screen name="Contenu" component={Contenu} />
          </>
        ) : (
          <>
            <Pile.Screen name="Bienvenue" component={Bienvenue} />
            <Pile.Screen name="Inscription" component={Inscription} />
            <Pile.Screen name="VerificationOtp" component={VerificationOtp} />
            <Pile.Screen name="Connexion" component={Connexion} />
            <Pile.Screen name="MotDePasseOublie" component={MotDePasseOublie} />
            <Pile.Screen name="Contenu" component={Contenu} />
          </>
        )}
      </Pile.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FournisseurAuth>
        <StatusBar style="light" />
        <Navigation />
      </FournisseurAuth>
    </SafeAreaProvider>
  );
}
