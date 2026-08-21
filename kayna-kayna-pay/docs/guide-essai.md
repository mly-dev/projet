# Guide d'essai — de zéro à l'application sur votre téléphone

Ce guide part du principe que **rien n'est installé** sur votre ordinateur. Il
vous mène jusqu'au moment clé : un versement déclaré depuis le téléphone,
validé par votre équipe, et le portefeuille crédité en direct.

Comptez **45 minutes à 1 heure** la première fois, dont beaucoup d'attente
pendant les téléchargements. Aucun vrai dépôt mobile money n'est nécessaire.

Les commandes sont données pour **Windows** (invite de commandes `cmd`), avec la
variante Linux/macOS quand elle diffère.

---

## Table des matières

1. [Ce qu'il vous faut](#1-ce-quil-vous-faut)
2. [Installer les quatre outils](#2-installer-les-quatre-outils)
3. [Créer la base de données](#3-créer-la-base-de-données)
4. [Récupérer le projet](#4-récupérer-le-projet)
5. [Démarrer la plateforme](#5-démarrer-la-plateforme)
6. [Trouver l'adresse de votre ordinateur](#6-trouver-ladresse-de-votre-ordinateur)
7. [Lancer l'application mobile](#7-lancer-lapplication-mobile)
8. [Le scénario d'essai](#8-le-scénario-dessai)
9. [Mettre à jour le projet](#9-mettre-à-jour-le-projet)
10. [Problèmes courants](#10-problèmes-courants)
11. [Ce qui ne marchera pas encore](#11-ce-qui-ne-marchera-pas-encore)

---

## 1. Ce qu'il vous faut

- Un ordinateur **Windows** (ou Mac/Linux), avec une connexion internet.
- Un téléphone **Android**.
- **Le téléphone et l'ordinateur sur le même réseau Wi-Fi.** C'est la condition
  la plus souvent oubliée : sans cela, rien ne fonctionnera.

> ⚠️ Si votre ordinateur est branché en **Ethernet** et le téléphone en Wi-Fi,
> ils peuvent être sur deux réseaux différents. Dans le doute, connectez
> l'ordinateur au même Wi-Fi que le téléphone.

### Une règle pour tout le guide

**Tapez chaque commande sur une seule ligne.** Une commande coupée en deux avec
un `\` en fin de ligne est une convention Linux : `cmd` et PowerShell ne la
comprennent pas et répondent
`fatal: repository '\' does not exist`.

---

## 2. Installer les quatre outils

### 2.1 Node.js

Le moteur qui exécute le code du projet.

1. Allez sur **<https://nodejs.org>**
2. Téléchargez la version **LTS** (le gros bouton de gauche).
3. Installez en gardant toutes les options par défaut.

**Vérifiez** — ouvrez une **nouvelle** fenêtre `cmd` et tapez :

```
node --version
```

Vous devez voir `v20.x.x` ou `v22.x.x`. Si la commande n'est pas reconnue,
fermez et rouvrez la fenêtre `cmd` (le PATH n'est pris en compte qu'au
démarrage).

### 2.2 Git

L'outil qui récupère le code depuis GitHub.

1. Allez sur **<https://git-scm.com/download/win>**
2. Le téléchargement démarre seul. Installez en gardant les options par défaut.

**Vérifiez** :

```
git --version
```

### 2.3 PostgreSQL — la base de données

C'est l'étape la plus longue, et celle où l'on se trompe le plus. Lisez-la en
entier avant de commencer.

1. Allez sur
   **<https://www.enterprisedb.com/downloads/postgres-postgresql-downloads>**
2. Dans le tableau, prenez la ligne **17.x**, colonne **Windows x86-64**, et
   cliquez sur la flèche de téléchargement bleue.

> **Pourquoi la 17 et pas la 18 ?** La 18 est très récente et certains outils ne
> la suivent pas encore. La 17 est stable et parfaitement compatible avec le
> projet. Les versions 15 et 16 conviennent aussi.

3. Lancez l'installateur. Gardez les valeurs par défaut, **sauf deux points à
   surveiller** :

| Écran | Ce qu'il faut faire |
|---|---|
| **Password** | Choisissez un mot de passe pour l'utilisateur `postgres` et **notez-le**. Il n'est pas récupérable, et vous en aurez besoin dans deux minutes. |
| **Port** | Laissez **5432**. |
| **Stack Builder** (dernier écran) | **Décochez la case** — inutile ici. |

4. À la fin de l'installation, **ouvrez une nouvelle fenêtre `cmd`** et ajoutez
   PostgreSQL au PATH pour cette session :

```
set PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin
```

*(adaptez `17` si vous avez installé une autre version)*

**Vérifiez** :

```
psql --version
```

> **Pour rendre l'ajout permanent** (recommandé, sinon il faut retaper la ligne
> `set PATH` à chaque nouvelle fenêtre) : touche Windows → tapez
> « variables d'environnement » → *Modifier les variables d'environnement système*
> → *Variables d'environnement…* → dans **Path** (variables système) →
> *Nouveau* → collez `C:\Program Files\PostgreSQL\17\bin` → OK partout →
> **rouvrez `cmd`**.

**Sur Linux / macOS**

```
sudo apt install postgresql          # Debian / Ubuntu
brew install postgresql@17           # macOS
```

### 2.4 Expo Go — sur le téléphone

Ouvrez le **Play Store** sur votre téléphone Android, cherchez **Expo Go** et
installez-le. C'est gratuit. Il permet de faire tourner l'application sans la
publier sur un store.

---

## 3. Créer la base de données

Une seule fois, dans `cmd` :

```
psql -U postgres -c "CREATE USER kkp WITH PASSWORD 'kkp' CREATEDB;"
```

```
psql -U postgres -c "CREATE DATABASE kaynakaynapay OWNER kkp;"
```

Chaque commande demande le **mot de passe `postgres`** défini à l'installation.

> En le tapant, **rien ne s'affiche à l'écran** — pas même des étoiles. C'est
> normal : tapez-le et validez par Entrée.

Vous devez voir `CREATE ROLE` puis `CREATE DATABASE`.

**Sur Linux / macOS**, préfixez chaque ligne par `sudo -u postgres` :

```
sudo -u postgres psql -c "CREATE USER kkp WITH PASSWORD 'kkp' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE kaynakaynapay OWNER kkp;"
```

---

## 4. Récupérer le projet

Placez-vous où vous voulez ranger le projet, par exemple le Bureau :

```
cd %USERPROFILE%\Desktop
```

Puis clonez — **sur une seule ligne** :

```
git clone -b claude/kayna-kayna-pay-presentation-gp4lgf https://github.com/mly-dev/projet.git
```

> ⚠️ **N'oubliez pas l'option `-b`** : le travail est sur une branche, pas sur
> `main`. Sans elle, vous obtiendriez un dépôt sans le dossier `kayna-kayna-pay`.

Entrez dans le projet et vérifiez :

```
cd projet\kayna-kayna-pay
```

```
dir
```

Vous devez voir : `docs`, `identite`, `mobile`, `pitch`, `plateforme`, `README.md`.

**Si vous aviez déjà cloné le projet**, mettez-le simplement à jour :

```
git pull origin claude/kayna-kayna-pay-presentation-gp4lgf
```

---

## 5. Démarrer la plateforme

Toujours dans la même fenêtre :

```
cd plateforme
```

```
copy .env.example .env
```

*(Linux / macOS : `cp .env.example .env`)*

```
npm install
```

Comptez quelques minutes. Des avertissements `npm audit` peuvent s'afficher :
**c'est normal, ignorez-les**.

### Vérifiez que tout est en place

```
npm run verifier
```

Cette commande contrôle chaque prérequis et, si quelque chose manque, **affiche
la commande exacte qui répare**. Vous devez obtenir :

```
  [OK]   Node 22.x
  [OK]   Dépendances installées
  [OK]   Fichier .env présent
  [OK]   PostgreSQL joignable
  [MANQUE] Structure de la base absente
           Lancez :  npm run db:migrer
```

### Créez les tables et les données de démonstration

```
npm run db:migrer
```

```
npm run db:seed
```

Le seed affiche les comptes de démonstration — **gardez-les sous la main** :

| Rôle | Numéro | Mot de passe |
|---|---|---|
| Client | `+22791111111` | `client123` |
| Admin | `+22790000010` | `admin123` |
| Super-admin | `+22790000000` | `superadmin123` |
| Partenaire | `+22792000001` | `partenaire123` |

### Démarrez le serveur

```
npm run dev
```

Vous devez voir :

```
Kayna Kayna Pay — plateforme démarrée sur http://localhost:3000
```

**Laissez cette fenêtre ouverte et visible.** C'est là que s'afficheront les
codes SMS pendant tout l'essai.

Ouvrez <http://localhost:3000> dans votre navigateur : la page de connexion avec
le logo doit apparaître.

---

## 6. Trouver l'adresse de votre ordinateur

Pour votre téléphone, « localhost » désigne le téléphone lui-même. Il lui faut
l'adresse de votre ordinateur sur le réseau local.

Ouvrez une **deuxième fenêtre `cmd`** :

```
ipconfig
```

Cherchez la section de votre **carte Wi-Fi** et relevez
l'**Adresse IPv4** — quelque chose comme `192.168.1.10`.

| Système | Commande |
|---|---|
| Windows | `ipconfig` → « Adresse IPv4 » du Wi-Fi |
| macOS | `ipconfig getifaddr en0` |
| Linux | `hostname -I` |

> ⚠️ **Windows affiche souvent plusieurs adresses.** Prenez celle de la
> **Carte réseau sans fil Wi-Fi**, généralement en `192.168.x.x`. Ignorez les
> autres : `vEthernet (Default Switch)` en `172.x.x.x` est un réseau virtuel
> Hyper-V, et une carte `Ethernet` en `192.168.56.x` est en général un
> adaptateur VirtualBox. Ni l'un ni l'autre n'est joignable depuis le téléphone.

**Vérifiez qu'elle répond** (remplacez par la vôtre) :

```
curl http://192.168.1.10:3000/api/categories
```

Vous devez recevoir du texte commençant par `{"ok":true,...`. Si rien ne vient,
c'est le **pare-feu Windows** : autorisez Node.js, ou désactivez temporairement
le pare-feu du réseau privé le temps de l'essai.

---

## 7. Lancer l'application mobile

Dans la deuxième fenêtre `cmd` :

```
cd %USERPROFILE%\Desktop\projet\kayna-kayna-pay\mobile
```

```
copy .env.example .env
```

```
notepad .env
```

### Le chemin court

Une commande suffit, et il n'y a aucune adresse à chercher :

```
npm install
```

```
npm run essai
```

Elle repère l'adresse de votre PC sur le réseau local, **vérifie que la
plateforme y répond vraiment**, puis lance Expo avec cette adresse :

```
  Recherche de la plateforme sur le réseau local…

    ✓  192.168.1.231    Wi-Fi
    ·  172.20.32.1      vEthernet (WSL)

  ✓ Plateforme jointe. L'application visera http://192.168.1.231:3000
```

Une carte virtuelle — Docker, WSL, VirtualBox — est reconnue et écartée : c'est
elle qui, choisie par erreur, donne l'énigmatique « Connexion impossible » alors
que tout fonctionne.

Si la plateforme n'est pas démarrée, la commande le dit avant d'afficher le QR,
plutôt que de vous laisser le découvrir sur le téléphone.

> `npm run essai -- --tunnel` si le Wi-Fi isole les appareils entre eux.
> `set ADRESSE=192.168.1.50` avant la commande pour imposer une adresse.

### Le chemin manuel

Si vous préférez tout régler vous-même. Remplacez l'adresse par **la vôtre**,
puis enregistrez et fermez :

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

Puis :

```
npm install
```

```
npx expo start
```

Un **QR code** s'affiche. **Avant de le scanner, lisez la ligne juste en
dessous** :

```
› Metro waiting on exp://192.168.1.231:8081
```

L'adresse doit être **celle de votre Wi-Fi**. Si vous lisez
`exp://127.0.0.1:8081`, le QR code désigne le téléphone lui-même et le scan
échouera avec *« Could not connect to the server »*. C'est fréquent sur Windows
quand Hyper-V, VirtualBox ou WSL sont installés : Expo se trompe de carte
réseau. Corrigez ainsi — `Ctrl+C`, puis :

```
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.231
```

```
npx expo start
```

*(remplacez par votre adresse ; sous Linux/macOS, `export` au lieu de `set`)*

Sur le téléphone, ouvrez **Expo Go** → *Scan QR code* → scannez.
Sur iPhone, scannez avec l'appareil photo.

L'application se télécharge (quelques dizaines de secondes la première fois),
puis l'écran de bienvenue apparaît avec le logo.

> **« Project is incompatible with this version of Expo Go »** — Expo Go se met
> à jour tout seul et n'accepte que le SDK le plus récent. Le message indique la
> version attendue (par exemple SDK 54). Alignez le projet :
>
> ```
> npm install expo@^54.0.0
> npx expo install --fix
> npx expo start -c
> ```
>
> `npx expo install --fix` remet automatiquement chaque dépendance à la version
> attendue par ce SDK. C'est la seule bonne façon de procéder — ne fixez pas ces
> versions à la main.

---

## 8. Le scénario d'essai

Le plus intéressant se joue **à deux écrans** : le téléphone (le client) et le
navigateur (votre équipe). Gardez les deux sous les yeux.

### A. Sur le téléphone — créer un compte

1. « Créer mon compte ».
2. Numéro : `96 12 34 56` par exemple (il n'a pas besoin d'exister, aucun SMS
   ne part réellement).
3. Nom, mot de passe (6 caractères minimum), puis **cochez les CGU** — sans
   cela l'inscription est refusée, c'est voulu.
4. « Recevoir mon code par SMS ».
5. **Lisez le code dans la fenêtre de la plateforme.** Il s'affiche dans un
   encadré, en bas de la fenêtre :

   ```
     ┌──────────────────────────────────────────────────────────┐
     │     SMS de développement — aucun message réel envoyé     │
     │                    pour +22796123456                     │
     │                                                          │
     │                   CODE :  6 7 3 6 6 6                    │
     │                                                          │
     │      valable 10 minutes, utilisable une seule fois       │
     └──────────────────────────────────────────────────────────┘
   ```

   > ⚠️ Les chiffres ci-dessus sont une **illustration**. Votre code est tiré au
   > hasard à chaque demande. Ne recopiez jamais un code lu dans une
   > documentation : il sera refusé.

6. Saisissez-le.

✅ Vous arrivez sur l'accueil, connecté.

### B. Démarrer un achat

1. Cherchez « moto », ouvrez **Moto 125 cc**.
2. Essayez le **simulateur** : saisissez `2000` dans « Si je verse chaque
   jour » — il annonce le nombre de jours et la date de fin.
3. « Commencer à payer ».

✅ Le portefeuille s'ouvre à 0 F, avec le prix figé.

### C. Déclarer un versement

1. « Faire un versement », montant `2500`, opérateur **NITA**.
2. « Voir les instructions de dépôt » → référence unique `KKP-XXXXX`.
3. **Ne faites aucun vrai dépôt** — appuyez directement sur
   « J'ai effectué le dépôt ✓ ».

✅ Page d'attente avec le minuteur de 10 minutes. **Laissez le téléphone ici.**

### D. Sur le navigateur — valider

1. <http://localhost:3000>, connectez-vous : `+22790000010` / `admin123`.
2. **Un code de connexion est demandé** — les comptes d'administration exigent
   un deuxième facteur. Lisez-le dans l'encadré affiché **en bas** de la fenêtre
   de la plateforme (c'est un nouveau code, différent de celui de l'inscription).
3. Vous arrivez sur la **file de validation**.

✅ **Le versement est déjà là**, apparu tout seul, avec le nom du client, son
numéro, le produit, l'opérateur, le montant et l'heure.

4. Cliquez **Valider**, laissez le montant proposé, confirmez.

### E. Regardez le téléphone

✅ **Sans rien toucher**, l'écran bascule sur « Versement validé ! 🎉 » et le
portefeuille est crédité de 2 500 F.

C'est le cœur du produit : le client sait en quelques secondes que son argent
est bien arrivé.

### E bis. La même chose, mais ailleurs dans l'application

L'essai précédent se fait sur la page d'attente, qui guette le résultat. Le vrai
test est de vérifier que la notification arrive **où que soit le client**.

1. Déclarez un nouveau versement (`1000` F), jusqu'à « J'ai effectué le dépôt ».
2. Sur le téléphone, **quittez la page d'attente** : revenez à l'accueil.
3. Sur le navigateur, validez le versement.
4. Reposez les yeux sur le téléphone, **sans y toucher**.

✅ Attendu, en même temps :

- un **bandeau blanc** descend en haut de l'écran : « Versement validé ✓ », avec
  le montant et le total ;
- les chiffres de l'accueil **bougent tout seuls** : « déjà versés » augmente, la
  barre de progression avance ;
- la **pastille rouge** de l'onglet Notifications s'incrémente.

Appuyez sur le bandeau : il ouvre l'achat concerné. Il disparaît seul au bout de
quelques secondes, ou à l'appui sur ✕.

> **Rien n'apparaît ?** Regardez la fenêtre d'Expo. Une ligne
> `[socket] connexion impossible vers…` signale que le téléphone ne joint pas le
> serveur : c'est l'adresse dans `mobile\.env` qu'il faut corriger (section 6).
> Vérifiez aussi que la mise à jour a bien été téléchargée (section 9) — sur
> l'ancien code, aucun bandeau n'existe.

### F. Aller au bout (facultatif)

Refaites un versement du **montant restant** (visible sur le détail de l'achat).
Après validation : l'achat passe **« complété »**, le partenaire est notifié, et
un **récapitulatif valant preuve d'achat** devient disponible.

### Autres cas à essayer

| Cas | Comment | Résultat attendu |
|---|---|---|
| Rejet | Déclarez un versement, puis « Rejeter » avec un motif | Le client reçoit le motif et peut relancer |
| Anti-doublon | Deux versements sur le même achat | Refusé : « un versement est déjà en cours » |
| Montant différent | Validez avec un autre montant que déclaré | Le portefeuille est crédité du montant réel |
| Versement minimum | Essayez 50 F | Refusé : minimum 100 F |
| Espace partenaire | Navigateur privé, `+22792000001` / `partenaire123` | Tableau de bord et commandes |

---

## 9. Mettre à jour le projet

Quand une nouvelle version est publiée, une seule commande depuis le dossier
`kayna-kayna-pay` :

```
maj.cmd
```

Vous pouvez aussi double-cliquer le fichier `maj.cmd` dans l'explorateur.
Sur macOS ou Linux : `./maj.sh`.

Puis relancez les deux fenêtres — avec `-c` côté mobile, pour vider le cache :

```
cd kayna-kayna-pay\plateforme
npm run dev
```

```
cd kayna-kayna-pay\mobile
npx expo start -c
```

### Pourquoi ne pas faire simplement `git pull` ?

Parce qu'il échoue, avec ce message :

```
error: Your local changes to the following files would be overwritten by merge:
        kayna-kayna-pay/mobile/package-lock.json
Aborting
```

`package-lock.json` est un fichier que npm réécrit à chaque `npm install`, et
son contenu exact dépend de la version de npm installée sur votre machine. Dès
qu'il diffère de celui du dépôt, git refuse de télécharger quoi que ce soit
pour ne pas écraser ce qu'il prend pour votre travail.

**Le piège est silencieux** : `git pull` s'arrête, mais si vous relancez le
serveur sans lire le message, tout démarre normalement — sur l'ancien code. On
croit avoir mis à jour, et rien n'a changé.

`maj.cmd` remet ces fichiers en l'état avant de récupérer le code. Ils sont
entièrement générés par la machine : aucun travail n'est perdu.

Manuellement, cela revient à :

```
git checkout -- kayna-kayna-pay/mobile/package-lock.json
git pull origin claude/kayna-kayna-pay-presentation-gp4lgf
```

### Vérifier que la mise à jour a bien pris

Après un `git pull` réussi, la dernière ligne doit ressembler à :

```
Updating 3d47784..bb2eaed
Fast-forward
```

Si vous lisez `Aborting`, rien n'a été téléchargé.

---

## 10. Problèmes courants

### La commande de diagnostic

Au moindre doute côté plateforme, arrêtez le serveur (`Ctrl+C`) et lancez :

```
npm run verifier
```

Elle contrôle Node, les dépendances, le `.env`, PostgreSQL, les migrations et
les données — et donne la commande qui répare chaque point manquant.

### Tableau des erreurs

| Message / symptôme | Cause | Solution |
|---|---|---|
| `fatal: repository '\' does not exist` | Commande coupée en deux lignes | Retapez-la **sur une seule ligne** |
| `Your local changes ... would be overwritten` puis `Aborting` | `package-lock.json` réécrit par npm — **rien n'a été téléchargé** | Lancez `maj.cmd` (section 9) |
| Une correction annoncée ne change rien | Le `git pull` avait échoué sans qu'on le voie | Vérifiez la sortie du pull : `Fast-forward` et non `Aborting` |
| `'cp' n'est pas reconnu` | `cp` n'existe pas dans `cmd` | Utilisez `copy` |
| `'psql' n'est pas reconnu` | PostgreSQL absent du PATH | `set PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin` |
| `'node' / 'npm' n'est pas reconnu` | Fenêtre ouverte avant l'installation | Fermez et rouvrez `cmd` |
| **PostgreSQL ne répond pas** | Service arrêté | Windows → « Services » → démarrez `postgresql-x64-17` |
| **La base n'existe pas** | Étape 3 non faite | Refaites les deux commandes `psql -U postgres -c …` |
| **Identifiants refusés** | Utilisateur `kkp` absent | Refaites la commande `CREATE USER` |
| `password authentication failed` en créant la base | Mauvais mot de passe `postgres` | C'est celui choisi à l'installation de PostgreSQL |
| Le QR code ne se scanne pas | Réseaux différents | Même Wi-Fi ; sinon `npx expo start --tunnel` |
| **« Could not connect to the server »** avec `exp://127.0.0.1:8081` | Expo s'est trompé de carte réseau (Hyper-V, VirtualBox, WSL) | `set REACT_NATIVE_PACKAGER_HOSTNAME=<votre IP Wi-Fi>` puis relancez `npx expo start` |
| « Connexion impossible » dans l'app | Mauvaise IP dans `mobile\.env` | Refaites l'étape 6, vérifiez avec `curl` |
| `curl` ne répond pas sur l'IP | Pare-feu Windows | Autorisez Node.js dans le pare-feu |
| Je ne vois pas le code SMS | Mauvaise fenêtre | C'est celle de la **plateforme**, pas celle d'Expo |
| **« Code invalide ou expiré »** | Code d'exemple recopié, code de plus de 10 min, ou code déjà utilisé | Cliquez « Recommencer », refaites la connexion, et lisez la **dernière** ligne `[SMS →` de la fenêtre de la plateforme |
| « Session de connexion expirée » (admin) | Plus de 10 min entre mot de passe et code | Recommencez la connexion |
| Écran blanc dans l'app | Erreur JavaScript | Secouez le téléphone → « Reload » ; regardez la fenêtre Expo |
| Rien n'arrive dans la file admin | « J'ai effectué le dépôt » non appuyé | Le versement reste « initié » tant qu'il n'est pas déclaré |

### Tester sur un émulateur plutôt qu'un téléphone

Avec un émulateur Android, l'adresse de la machine hôte est `10.0.2.2` :
mettez `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` dans `mobile\.env`.

### Repartir de zéro sur la base

Si la base est dans un état incohérent :

```
psql -U postgres -c "DROP DATABASE kaynakaynapay;"
psql -U postgres -c "CREATE DATABASE kaynakaynapay OWNER kkp;"
npm run db:migrer && npm run db:seed
```

---

## 11. Ce qui ne marchera pas encore

Volontairement absent à ce stade — pour éviter les fausses alertes :

- **Pas de vrais SMS.** La passerelle nigérienne n'est pas contractualisée ; les
  codes s'affichent dans la fenêtre de la plateforme.
- **Pas de photos de produits.** Le catalogue est en texte. C'est le prochain
  chantier fonctionnel.
- **Pas de notifications hors application.** Elles arrivent quand l'application
  est ouverte ; Firebase Cloud Messaging n'est pas branché.
- **Le partenaire ne gère pas son catalogue.** Son espace est en consultation,
  conformément au phasage du MVP.
- **Les CGU affichées sont des projets de texte**, non validés juridiquement.

---

## Après l'essai

Notez tout ce qui vous a gêné, même les petits détails : un mot mal choisi, un
bouton trop petit, une étape peu claire. C'est exactement ce que cet essai doit
faire remonter — le code fonctionne et il est testé, ce sont les usages réels
qui restent à vérifier.

La **recette officielle du MVP** (chapitre 13 du cahier des charges) demandera,
elle, de refaire ce parcours **avec de vrais dépôts mobile money de faible
montant**, une fois la passerelle SMS et les numéros de dépôt de production en
place.
