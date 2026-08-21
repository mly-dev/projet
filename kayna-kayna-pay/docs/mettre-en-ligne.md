# Mettre Kayna Kayna Pay en ligne

*Comment on distribue normalement une application à des testeurs — et pourquoi
le tunnel n'était pas la bonne méthode.*

---

## 1. Ce que font les vrais développeurs

Distribuer une application à des testeurs, c'est deux choses distinctes, et
elles n'ont rien à voir l'une avec l'autre.

**L'application** — le programme installé sur le téléphone. Elle se construit
une fois, se dépose quelque part, et se distribue par un lien.

**Le serveur** — la plateforme qui détient le catalogue, les comptes et les
versements. Il tourne en permanence, quelque part, à une adresse qui ne change
jamais.

Voici la seule chose importante de ce document :

```
      CE QUE NOUS FAISIONS                    LA NORME

   ┌──────────────────────┐            ┌──────────────────────┐
   │  Téléphone de l'ami  │            │  Téléphone de l'ami  │
   └──────────┬───────────┘            └──────────┬───────────┘
              │                                   │
              │  adresse qui change               │  adresse fixe, pour toujours
              │  à chaque redémarrage             │
              ▼                                   ▼
   ┌──────────────────────┐            ┌──────────────────────┐
   │   tunnel Cloudflare  │            │   kkp.up.railway.app │
   └──────────┬───────────┘            │                      │
              │                        │   allumé 24 h / 24   │
              ▼                        │   sauvegardé          │
   ┌──────────────────────┐            │   HTTPS d'origine     │
   │   VOTRE PC           │            └──────────────────────┘
   │   allumé, réveillé,  │
   │   Wi-Fi debout       │
   └──────────────────────┘
```

Votre application mobile était déjà distribuée correctement : le lien EAS que
vous avez envoyé à vos amis, c'est exactement la méthode normale. **Rien à
changer de ce côté.**

C'est le serveur qui n'était pas à sa place. Un ordinateur personnel derrière un
tunnel, c'est trois pièces qui doivent tenir en même temps — la plateforme
allumée, le tunnel ouvert, le PC réveillé — et il suffit qu'une lâche pour que
tout le monde soit dehors. La nuit du 20 août, c'est le PC qui s'est endormi à
17 h 54. Personne ne pouvait le deviner, ni vous, ni vos amis.

Un hébergeur, c'est la même chose que votre PC, mais **c'est son métier** de ne
jamais s'éteindre.

### Les trois conséquences

| | Avec le tunnel | En ligne |
|---|---|---|
| Adresse | change à chaque redémarrage | fixe, pour toujours |
| Vos amis | doivent la ressaisir à chaque fois | **ne configurent rien** |
| Votre PC | doit rester allumé | vous pouvez l'éteindre |
| Une panne | invisible, il faut lire un journal | une page d'état vous la montre |
| Mise à jour | ils réinstallent l'APK | `git push`, c'est tout |

La ligne qui compte est la deuxième. Une fois en ligne, **l'écran « Configurer
l'adresse du serveur » ne sert plus** : l'adresse est inscrite dans
l'application, définitivement. Cet écran reste, comme filet, mais personne n'a
plus à y toucher.

---

## 2. Ce qui a été préparé pour ça

Une plateforme qui passe d'un PC de bureau à Internet ne change pas de code,
mais change de monde : n'importe qui peut désormais frapper à la porte. Six
choses ont été ajoutées.

**Une image Docker** (`plateforme/Dockerfile`). Elle décrit la plateforme et
tout ce dont elle a besoin : version de Node, dépendances, commande de
démarrage. C'est ce qui remplace « installez ceci, puis cela » — une suite
d'instructions qui donne un résultat différent sur chaque machine. Elle
fonctionne à l'identique chez n'importe quel hébergeur, ce qui vous évite d'être
prisonnier de celui d'aujourd'hui.

**Un démarrage qui refuse une configuration dangereuse**
(`plateforme/lib/config.js`). Le secret qui signe les jetons de session figure
dans le dépôt sous sa valeur d'exemple. Qui l'a peut se fabriquer un jeton
d'administrateur — la base n'y peut rien, la signature est valide. En
production, le serveur **ne démarre pas** tant qu'il n'a pas le sien :

```
  ✗ Démarrage refusé — configuration incomplète

   • JWT_SECRET est encore la valeur d'exemple.
     Elle figure dans le dépôt, donc elle n'est un secret pour personne.
     Tirez-en un au hasard :   npm run preparer
```

Un serveur qui refuse de démarrer se remarque tout de suite. Un serveur ouvert à
tous ne se remarque qu'après.

**Des mots de passe de démonstration tirés au hasard.** `admin123` était sans
conséquence sur un PC que personne ne pouvait joindre. Sur Internet, ce sont des
comptes — dont un super-administrateur — dont les identifiants sont écrits en
clair dans un dépôt Git public et dans la documentation. En production, le seed
les tire au hasard et les affiche une seule fois :

```
  Comptes créés :

    superadmin  +22790000000  EqnEfFSAyCz_   Super Admin
    admin       +22790000010  uTDR9H7NHERe   Admin Démo

  ┌────────────────────────────────────────────────────────────────┐
  │  Notez ces mots de passe MAINTENANT : ils ne sont pas          │
  │  conservés et cet affichage ne reviendra pas.                  │
  └────────────────────────────────────────────────────────────────┘
```

**Une sonde de santé** (`/api/sante`). L'hébergeur l'interroge avant de basculer
le trafic sur une nouvelle version. Elle interroge la base : une sonde qui se
contenterait de répondre « ok » déclarerait saine une plateforme dont la base est
injoignable, et la panne n'apparaîtrait qu'au premier client.

**Un arrêt propre.** Quand l'hébergeur remplace l'ancienne version par la
nouvelle, il envoie un signal d'arrêt. Sans écoute, le processus est tué net et
les requêtes en cours sont coupées — un client peut voir échouer un versement
qui vient pourtant d'être écrit. Le serveur cesse d'accepter, laisse finir ce
qui est en vol, puis sort.

**Une limitation anti-abus qui voit la bonne adresse.** Derrière un hébergeur,
toutes les connexions arrivent de son proxy. Sans correction, ou bien le monde
entier partage un seul compteur, ou bien — en lisant naïvement l'en-tête
transmis — chaque appelant s'en invente un neuf, et la limite ne limite plus
rien.

---

## 3. Répétition générale, sans rien payer *(facultatif)*

> **Cette étape peut être sautée.** Railway construit l'image sur ses propres
> serveurs : Docker n'a pas besoin d'exister sur votre machine pour que le
> déploiement fonctionne. Si l'installation de Docker Desktop résiste, passez
> directement au chapitre 4 — vous ne perdez qu'un filet de sécurité, pas une
> pièce nécessaire.

Son intérêt : monter chez vous exactement ce que montera l'hébergeur, pour
découvrir ici les erreurs de configuration plutôt qu'en ligne. Rien n'est
facturé, rien n'est exposé.

Il faut **Docker Desktop** ([docker.com](https://www.docker.com/products/docker-desktop/)),
qui exige lui-même WSL 2 et la virtualisation activée dans le BIOS.

```
cd plateforme
docker compose up --build
```

### Si vous voyez « failed to connect to the docker API »

```
unable to get image 'plateforme-plateforme': failed to connect to the docker API
at npipe:////./pipe/dockerDesktopLinuxEngine … Le fichier spécifié est introuvable.
```

Ce tuyau n'existe que pendant que Docker Desktop tourne. Le message ne parle donc
pas du projet, mais de Docker. Pour savoir lequel des deux cas s'applique :

```
docker version
```

| Ce que vous lisez | Ce que c'est | Le geste |
|---|---|---|
| `Client:` puis `Server:` avec des versions | tout va bien | relancez `docker compose up --build` |
| `Client:` seul, puis une erreur | Docker Desktop est **installé mais arrêté** | lancez-le depuis le menu Démarrer, attendez que l'icône baleine cesse de s'animer, réessayez |
| `docker n'est pas reconnu` | il n'est **pas installé** | `winget install Docker.DockerDesktop`, puis **redémarrez le PC** |

Le premier démarrage prend plusieurs minutes : Docker Desktop monte une machine
Linux en arrière-plan. Tant que la baleine s'anime, il n'est pas prêt.

Si `wsl --install` est réclamé, ou si le démarrage échoue sur la virtualisation,
c'est un réglage BIOS (*Intel VT-x* / *AMD-V*) — et c'est le moment de se
rappeler que ce chapitre est facultatif.

La première fois, peuplez la base dans une autre fenêtre :

```
docker compose exec plateforme node scripts/seed.js
```

Ouvrez `http://localhost:3000`. C'est la plateforme en mode production :
pages précompilées, cookies « Secure », migrations appliquées au démarrage.
Pour tout effacer : `docker compose down -v`.

Si ça marche ici, ça marchera en ligne. C'est tout l'intérêt d'une image.

---

## 4. Mettre en ligne, pas à pas

### 4.1 — Tirer le secret

Sur votre machine :

```
cd plateforme
npm run preparer
```

La commande affiche un secret tiré au sort et la liste des variables à définir.
**Gardez cette fenêtre ouverte**, vous allez recopier ces valeurs. Rien n'est
enregistré sur le disque : un secret rangé dans un fichier finit par être
versionné.

### 4.2 — Créer le projet

1. Allez sur [railway.app](https://railway.app), **Login with GitHub**.
2. **New Project** → **Deploy from GitHub repo** → choisissez `mly-dev/projet`.
3. Railway va d'abord se tromper de dossier — le dépôt en contient plusieurs.
   Ouvrez **Settings** du service et réglez :

   | Réglage | Valeur |
   |---|---|
   | Root Directory | `kayna-kayna-pay/plateforme` |
   | Branch | votre branche de travail |

   Le `Dockerfile` et le `railway.json` s'y trouvent : Railway les reconnaît
   seul, il n'y a pas de commande de démarrage à écrire.

### 4.3 — Ajouter la base

**+ New** → **Database** → **Add PostgreSQL**.

Elle apparaît à côté du service. Railway définit `DATABASE_URL` tout seul —
**n'y touchez pas**, et surtout ne la recopiez pas à la main : elle change quand
la base est déplacée, et le service la relit à chaque redémarrage.

### 4.4 — Le volume des photos

**Settings** du service → **Volumes** → **Add Volume**, point de montage :

```
/data
```

Sans lui, le dossier des photos est recréé vide à chaque déploiement : toutes
les photos de produits disparaîtraient à la première mise à jour, sans erreur ni
trace. Le serveur vous en avertit au démarrage si vous l'oubliez.

### 4.5 — Les variables

**Variables** → **Raw Editor**, collez ceci en remplaçant le secret par celui de
l'étape 4.1 :

```
JWT_SECRET=<celui affiché par npm run preparer>
NODE_ENV=production
MEDIAS_DIR=/data/medias
TRUST_PROXY=1
SMS_FOURNISSEUR=console
```

`DATABASE_URL` et `PORT` sont fournis par Railway : ne les ajoutez pas.

### 4.6 — Ouvrir l'adresse

**Settings** → **Networking** → **Generate Domain**. Vous obtenez quelque chose
comme :

```
https://kkp-production-a1b2.up.railway.app
```

**Cette adresse est définitive.** C'est elle qu'on inscrit dans l'application, et
elle ne changera plus.

Vérifiez tout de suite la sonde, dans votre navigateur :

```
https://votre-adresse.up.railway.app/api/sante
```

Attendu : `{"ok":true,"base":"jointe","duree_ms":11,...}`

### 4.7 — Peupler le catalogue

Une seule fois, dans l'onglet du service :

```
railway run node scripts/seed.js
```

*(ou le bouton de console de Railway, si vous préférez ne rien installer)*

**Notez les mots de passe affichés.** Ils ne sont pas conservés : seul un
condensé est enregistré en base, ils ne peuvent pas être relus ensuite.

---

## 5. Construire l'application sur l'adresse fixe

Un seul fichier à modifier — `mobile/eas.json`, profil `production` :

```json
"production": {
  "android": { "buildType": "app-bundle" },
  "autoIncrement": true,
  "env": {
    "EXPO_PUBLIC_API_URL": "https://votre-adresse.up.railway.app"
  }
}
```

Pour un APK que vos amis installent à la main, gardez `"buildType": "apk"` dans
le profil `essai` et mettez-y la même adresse.

Contrôlez, puis construisez :

```
cd mobile
npm run verifier:eas
eas build --platform android --profile essai
```

L'adresse est en `https://` : le trafic en clair n'est plus autorisé dans
l'APK, et c'est très bien — c'est le réglage d'une vraie application.

---

## 6. Donner le lien

À la fin de la construction, EAS affiche un lien du genre :

```
https://expo.dev/accounts/adamouzakari/projects/kayna-kayna-pay/builds/1bafb6de-…
```

Envoyez-le. Vos amis l'ouvrent **sur leur téléphone**, appuient sur *Install*,
autorisent l'installation depuis cette source, et c'est fini.

**Ils n'ont plus rien à configurer.** Pas d'adresse à coller, pas de Wi-Fi
partagé, pas de fenêtre à laisser ouverte chez vous. Votre PC peut être éteint.

Reste une seule chose à relayer : les codes d'inscription. Aucune passerelle SMS
n'est contractualisée, donc le code s'affiche dans les journaux de Railway
(onglet **Deployments** → **View Logs**), encadré. Il vaut dix minutes et ne sert
qu'une fois. C'est le dernier point qui vous attache à un écran — voir le
chapitre 8.

---

## 7. La vie quotidienne, ensuite

**Déployer une correction :**

```
git push
```

C'est tout. Railway reconstruit, applique les migrations en attente, vérifie la
sonde, et bascule le trafic seulement si elle répond. Vos amis n'ont rien à
réinstaller tant que vous ne touchez pas à l'application mobile.

**Voir ce qui se passe :** onglet **Deployments** → **View Logs**. C'est là que
s'affichent les codes d'inscription et les erreurs.

**Sauvegarder la base :** Railway le fait, mais vérifiez-le dans les réglages du
service PostgreSQL. Une plateforme qui détient l'argent des gens ne se sauvegarde
pas « quand on y pensera ».

**Surveiller la dépense :** le tableau de bord affiche la consommation en cours.
Posez une limite dès le premier jour — un service qui redémarre en boucle
consomme.

---

## 8. Ce qui reste avant de vrais clients

Ce déploiement convient à des essais entre proches. Trois choses le séparent
d'un pilote avec de vrais clients, et elles ne sont pas des détails.

**La passerelle SMS.** Tant que les codes s'affichent dans un journal que vous
relayez à la main, personne ne peut s'inscrire sans vous. C'est le premier
verrou à faire sauter, et le seul qui demande un contrat — avec un opérateur
nigérien ou un agrégateur.

**Un nom de domaine à vous.** `kkp-production-a1b2.up.railway.app` fonctionne
parfaitement mais n'inspire rien. Un `kaynakaynapay.ne` coûte peu et se branche
dans **Settings → Networking → Custom Domain** ; le certificat HTTPS est
automatique.

**Le cadre juridique.** Les CGU et la politique de confidentialité sont des
**projets de texte**, marqués comme tels dans le seed. Détenir les fonds de
clients entre le premier versement et la livraison relève de la réglementation
BCEAO/UEMOA. Voir *L'essentiel*, partie 6.

---

## 9. Si vous voulez changer d'hébergeur

Rien ne vous y attache. L'image Docker est la même partout ; seule la manière de
la lancer diffère.

| | Volume pour les photos | Sommeil | Coût |
|---|---|---|---|
| **Railway** | inclus | non | ~5 $/mois |
| **Fly.io** | inclus | optionnel | offre gratuite, puis ~5 $ |
| **Render** | offre payante seulement | oui en gratuit (~50 s au réveil) | 0 ou 7 $/mois |
| **VPS** (Hetzner, Contabo) | le disque du serveur | non | ~5 €/mois, entretien à votre charge |

Sur l'offre gratuite de Render, retenez les deux pièges : **pas de volume** — les
photos disparaissent à chaque déploiement — et **la base gratuite expire au bout
de 30 jours**.

---

## 10. En cas de panne

| Ce que vous voyez | Cause | Geste |
|---|---|---|
| Le déploiement échoue sur `Démarrage refusé` | une variable manque | lisez le journal : il nomme laquelle |
| `self signed certificate` | la base refuse son certificat | ajoutez `DATABASE_SSL=no-verify` |
| `/api/sante` répond 503 | la base est injoignable | vérifiez que le service PostgreSQL tourne |
| Les photos disparaissent après un déploiement | pas de volume monté sur `/data` | étape 4.4 |
| L'application dit « Le tunnel n'est plus actif » | elle vise encore l'ancienne adresse | l'ami a une vieille adresse enregistrée : *Configurer l'adresse du serveur* → **Réinitialiser** |
| Tout le monde est bloqué par la limite anti-abus | `TRUST_PROXY` absent | ajoutez `TRUST_PROXY=1` |

Pour lire un journal de tunnel — si vous en rouvrez un un jour — voir
*construire-application.md*, section « Lire le journal du tunnel ».
