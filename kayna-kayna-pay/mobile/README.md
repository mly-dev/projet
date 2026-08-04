# Kayna Kayna Pay — Application mobile (Expo / React Native)

Application cliente en JavaScript (sans TypeScript), construite avec Expo
pour un développement et une distribution rapides (Android d'abord, iOS
ensuite — le workflow EAS d'Expo publie sur le Play Store).

## Lancer l'application

Prérequis : Node 18+, l'application **Expo Go** sur votre téléphone
(Play Store), et la plateforme démarrée (`../plateforme`, port 3000).

```bash
npm install
cp .env.example .env    # puis indiquez-y l'adresse IP locale de votre machine
npx expo start
```

> **`localhost` ne marche pas depuis un téléphone** : il faut l'adresse IP
> locale de la machine qui fait tourner la plateforme, téléphone et machine
> étant sur le même réseau Wi-Fi. `.env.example` explique comment la trouver
> sur chaque système.

**➜ Pour un essai guidé de bout en bout, suivez
[`docs/guide-essai.md`](../docs/guide-essai.md)** : le parcours complet, du
compte créé au versement validé en temps réel, avec les problèmes courants.

Scannez le QR code avec Expo Go. Compte client de démonstration :
`+22791111111` / `client123` — ou créez un compte : le code OTP s'affiche
dans les journaux du serveur (passerelle SMS « console » en développement).

Si les versions d'Expo installées divergent, `npx expo install --fix`
aligne les dépendances natives sur le SDK.

## Parcours couverts

- **Inscription** par téléphone + OTP, acceptation obligatoire des CGU,
  connexion, mot de passe oublié par OTP.
- **Accueil** : recherche, achats en cours avec barres de progression,
  catégories, produits mis en avant.
- **Fiche produit** avec simulateur de rythme (« à 500 F par jour, vous
  terminez en X jours ») et « Commencer à payer ».
- **Versement** en trois écrans : montant (dès 100 F, suggestions rapides),
  instructions de dépôt (opérateur NITA/Amana/Wave, numéro de la plateforme,
  référence unique KKP-XXXXX, frais à la charge du client), page d'attente
  avec minuteur de 10 minutes et résultat en temps réel (socket). Si le
  minuteur expire : message rassurant « en vérification, jamais perdu ».
- **Mes achats** et détail : progression, historique des versements avec
  statuts, récapitulatif après complétion, demande d'annulation.
- **Notifications** en temps réel + centre de notifications.
- **Profil** : changement de mot de passe, CGU, confidentialité, FAQ,
  contact, déconnexion, suppression de compte.

## Structure

```
App.js                    Navigation (pile auth / onglets principaux)
src/theme.js              Charte : bleu Ecobank, blanc, accent ambre
src/api/client.js         Client HTTP (jeton en AsyncStorage)
src/api/socket.js         Temps réel Socket.io (notifications instantanées)
src/contexte/Auth.js      Session (connexion, déconnexion, suppression)
src/composants/Base.js    Écran, Bouton, Champ, Progression, Badge, Carte
src/ecrans/               Un fichier par écran (16 écrans)
```

## Prochaines étapes techniques

- Notifications push hors application (FCM via `expo-notifications`).
- Photos produits (stockage objet côté plateforme) et cache images.
- Langues locales (zarma, haoussa) — textes déjà centralisés par écran.
- Build de production : `eas build --platform android`.
