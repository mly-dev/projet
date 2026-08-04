import React from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FournisseurAuth, useAuth } from "./src/contexte/Auth";
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

function OngletsPrincipaux() {
  return (
    <Onglets.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: couleurs.bleu,
        tabBarInactiveTintColor: couleurs.gris,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{ICONES[route.name]}</Text>
        ),
      })}
    >
      <Onglets.Screen name="Accueil" component={Accueil} options={{ title: "Accueil" }} />
      <Onglets.Screen name="MesAchats" component={MesAchats} options={{ title: "Mes achats" }} />
      <Onglets.Screen name="Notifications" component={Notifications} options={{ title: "Notifications" }} />
      <Onglets.Screen name="Profil" component={Profil} options={{ title: "Profil" }} />
    </Onglets.Navigator>
  );
}

function Navigation() {
  const { chargement, utilisateur } = useAuth();
  if (chargement) return null;

  return (
    <NavigationContainer>
      <Pile.Navigator screenOptions={{ headerShown: false }}>
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
