# Construire l'application installable (APK)

Ce guide produit un **fichier `.apk`** que l'on installe sur un téléphone
Android comme n'importe quelle application : une icône sur l'écran d'accueil,
plus besoin d'Expo Go, plus de QR code.

---

## Ce qu'un APK ne change pas

Avant tout, le point que l'on découvre trop tard.

> **L'application a toujours besoin du serveur.** Elle ne contient ni le
> catalogue, ni les comptes, ni les versements — tout cela vit sur la
> plateforme. L'APK ne fait que remplacer Expo Go.

Et surtout :

> **L'adresse du serveur est inscrite dans l'APK au moment de la
> construction.** Une application installée ne peut plus en changer. Un APK
> construit contre `http://192.168.1.10:3000` ne fonctionnera que sur ce
> réseau Wi-Fi, avec la plateforme allumée sur ce PC.

Pour distribuer l'application à de vrais clients, il faut d'abord **déployer la
plateforme sur un serveur accessible depuis Internet, en `https://`**, puis
construire l'APK contre cette adresse. Tant que ce n'est pas fait, un APK ne
sert qu'à l'essai, sur votre réseau.

### L'adresse reste modifiable dans l'application

L'adresse inscrite à la construction n'est qu'un **point de départ**. Les box
attribuent les adresses dynamiquement : le jour où l'ordinateur en change,
un APK figé serait définitivement muet, et il faudrait le reconstruire pour un
chiffre qui a bougé.

L'application permet donc de la corriger, sans rien réinstaller :

- **avant connexion** : « Configurer l'adresse du serveur », sous les boutons
  de l'écran d'accueil — indispensable, puisque sans serveur joignable on ne
  peut pas se connecter pour aller la changer ;
- **après connexion** : onglet Profil → Réglages → « Adresse du serveur ».

L'écran accepte une simple adresse IP (`192.168.1.10`) : le `http://` et le
port 3000 sont ajoutés seuls. Le bouton **« Tester cette adresse »** interroge
la plateforme avant d'enregistrer, et répond soit *« Plateforme jointe,
6 catégories au catalogue »*, soit la raison exacte de l'échec.

---

## Le piège qui fait échouer le premier APK

Depuis Android 9, une application refuse les adresses en `http://` — seul
`https://` est autorisé. Expo Go y échappe, parce que c'est *lui* qui porte
l'autorisation.

Conséquence : une application qui fonctionne parfaitement dans Expo Go affiche
**« Connexion impossible »** dès qu'on en fait un APK, sans autre explication.

Le projet règle cela tout seul, dans `mobile/app.config.js` : le trafic en
clair est autorisé **si et seulement si** l'adresse du serveur commence par
`http://`. Un APK d'essai fonctionne donc ; un APK de production contre un
serveur `https://` n'emporte aucune permission superflue.

Vous verrez cet avertissement pendant la construction, c'est normal :

```
⚠  Trafic en clair autorisé — le serveur est en http:// (http://192.168.1.10:3000).
```

---

## Chemin A — construction dans le nuage (recommandé)

Aucun outil lourd à installer. Les serveurs d'Expo compilent, vous
téléchargez l'APK. Compter **15 à 25 minutes** la première fois.

Il faut un compte Expo (gratuit) : <https://expo.dev/signup>.

### 1. Installer l'outil et se connecter

```
npm install -g eas-cli
eas login
```

### 2. Renseigner l'adresse de votre serveur

Trouvez l'adresse IP du PC avec `ipconfig` — celle de la carte Wi-Fi, pas une
adresse `172.x` ni `192.168.56.x`.

Ouvrez `mobile/eas.json` et remplacez l'adresse du profil `essai` :

```json
"essai": {
  "android": { "buildType": "apk" },
  "distribution": "internal",
  "env": {
    "EXPO_PUBLIC_API_URL": "http://192.168.1.231:3000"
  }
}
```

> C'est **la seule ligne à changer**. Une erreur ici et l'APK ne joindra
> jamais le serveur.

Contrôlez le fichier avant de lancer la construction — cela évite de découvrir
une faute après quinze minutes d'attente :

```
npm run verifier:eas
```

```
  [OK]   essai        apk         http://192.168.1.231:3000
  [OK]   production   app-bundle  https://…
  eas.json est valide.
```

### 3. Le projet EAS

À la toute première construction, EAS propose de créer le projet sur votre
compte — répondez **oui**. Il affiche ensuite un identifiant :

```
✔ Created @votre-compte/kayna-kayna-pay
  projectId: b9868c6f-db04-4ef8-80e5-09cf9c3d2ca9
```

Cet identifiant est **déjà inscrit** dans `app.config.js`, celui du compte qui a
créé le projet. Si vous construisez sous un **autre compte Expo**, remplacez-le
avant de lancer la construction :

```
set EAS_PROJECT_ID=votre-identifiant
```

> Pourquoi manuellement ? Parce que la configuration est dynamique
> (`app.config.js`, et non `app.json`) : eas-cli sait la lire, pas y écrire. Il
> s'arrête sinon sur *« Cannot automatically write to dynamic config »*. C'est
> le prix du réglage automatique du trafic en clair, décrit plus haut.

### 4. Construire

```
cd C:\Users\PC\projet\kayna-kayna-pay\mobile
eas build --platform android --profile essai
```

À la première exécution, EAS propose de créer une **clé de signature** :
répondez oui, il la garde pour vous. Toutes les mises à jour futures devront
être signées avec la même clé.

Un lien s'affiche, puis un lien de téléchargement à la fin, avec un QR code.

> **À la question « Install and run the Android build on an emulator? »,
> répondez NON** si vous voulez essayer sur un vrai téléphone. Cette étape
> installe l'APK dans un émulateur Android — inutile ici, et elle échoue
> souvent sur `INSTALL_FAILED_INSUFFICIENT_STORAGE` : c'est le disque virtuel
> de l'émulateur qui est plein, pas un problème de l'application. La
> construction, elle, est déjà terminée et l'APK téléchargeable.

### 5. Installer sur le téléphone

Android refuse par défaut les applications qui ne viennent pas du Play Store.
Ouvrez le `.apk` : un message propose d'autoriser l'installation depuis cette
source — acceptez, puis relancez l'installation.

---

## Chemin B — construction entièrement locale

Aucun service Expo, aucun compte, rien qui sorte de votre machine. En
contrepartie : **environ 10 Go d'outils** à installer, et une première
compilation de 20 à 40 minutes.

### 1. Installer les outils

| Outil | Où | Note |
|---|---|---|
| **JDK 17** | [adoptium.net](https://adoptium.net) | La version 17, pas la 21 |
| **Android Studio** | [developer.android.com/studio](https://developer.android.com/studio) | Pour le SDK Android qu'il installe |

Dans Android Studio : **More Actions → SDK Manager**, cochez *Android SDK
Platform 35* et *Android SDK Build-Tools*, installez.

Puis, dans `cmd` :

```
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
```

Fermez et rouvrez la fenêtre de commandes.

### 2. Produire le projet natif

```
cd C:\Users\PC\projet\kayna-kayna-pay\mobile
set EXPO_PUBLIC_API_URL=http://192.168.1.231:3000
npx expo prebuild --platform android
```

Cela crée un dossier `android/`. Il est **régénéré à chaque fois** et n'est pas
versionné : ne le modifiez pas à la main, vos changements seraient écrasés.
Tout se règle dans `app.config.js`.

### 3. Compiler

```
cd android
gradlew assembleRelease
```

L'APK apparaît ici :

```
mobile\android\app\build\outputs\apk\release\app-release.apk
```

> Cet APK est signé avec une clé de débogage. Suffisant pour installer et
> essayer, **refusé par le Play Store**. Pour publier, il faut une clé de
> signature — le chemin A s'en charge tout seul.

### 4. Installer par câble USB

Activez les **options pour les développeurs** sur le téléphone (Paramètres →
À propos → appuyez sept fois sur « Numéro de build »), puis le **débogage
USB**. Branchez, et :

```
adb install -r app\build\outputs\apk\release\app-release.apk
```

Ou copiez simplement le `.apk` sur le téléphone et ouvrez-le.

---

## Quel chemin choisir

| | Chemin A — nuage | Chemin B — local |
|---|---|---|
| À installer | 1 outil | ~10 Go |
| Première construction | 15-25 min | 20-40 min |
| Compte Expo | oui | non |
| Internet pendant la construction | oui | non |
| Clé de signature | gérée pour vous | à faire soi-même |
| Publiable sur le Play Store | oui | pas en l'état |

Pour un premier essai, **prenez le chemin A**. Le chemin B se justifie si vous
voulez ne dépendre d'aucun service extérieur.

---

## Vérifier que l'APK parle bien au serveur

1. La plateforme tourne sur le PC (`npm run dev`)
2. Le téléphone est sur le **même Wi-Fi**
3. Ouvrez l'application, connectez-vous : `91111111` / `client123`

Si la connexion échoue, l'ordre de contrôle :

| Vérification | Comment |
|---|---|
| L'adresse est la bonne | Ouvrez `http://VOTRE-IP:3000` dans le navigateur **du téléphone** — le catalogue doit s'afficher en JSON |
| Le pare-feu ne bloque pas | Windows demande d'autoriser Node.js au premier lancement : répondez « Autoriser » pour les réseaux privés |
| L'IP n'a pas changé | Les box attribuent les adresses dynamiquement — refaites `ipconfig` |

> Si l'IP change souvent, réservez-la dans l'interface de votre box
> (« bail DHCP statique »), sinon il faudra reconstruire l'APK à chaque
> changement.

---

## Publier sur le Play Store

Hors du champ de ce guide, mais l'ordre est le suivant :

1. **Déployer la plateforme** sur un serveur public en `https://` — sans cela,
   l'application ne fonctionnera chez personne
2. Construire avec le profil `production` (`eas build --profile production`),
   qui produit un `.aab` et refuse le trafic en clair
3. Compte développeur Google Play — 25 $ une fois
4. Politique de confidentialité en ligne, fiche du magasin, captures d'écran
5. Test interne, puis production

Les points 1 et 4 dépendent de décisions qui ne sont pas techniques : voir
*L'essentiel*, partie 6.
