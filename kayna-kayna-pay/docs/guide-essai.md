# Guide d'essai — tester Kayna Kayna Pay sur un vrai téléphone

Ce guide vous fait dérouler **le parcours complet** : créer un compte, choisir un
produit, faire un versement depuis le téléphone, le valider depuis l'espace
administrateur, et voir le portefeuille se créditer en temps réel.

Comptez **20 à 30 minutes** la première fois. Aucun vrai dépôt mobile money
n'est nécessaire : à ce stade, on simule.

---

## Ce qu'il vous faut

- Un ordinateur avec **git**, **Node 18 ou plus** et **PostgreSQL** installés.
- Un téléphone **Android** avec l'application **Expo Go** (gratuite, Play Store).
- **Le téléphone et l'ordinateur sur le même réseau Wi-Fi.** C'est la condition
  la plus souvent oubliée : sans cela, rien ne fonctionnera.

> Si votre ordinateur est branché en Ethernet et le téléphone en Wi-Fi, ils ne
> sont pas forcément sur le même réseau. Dans le doute, mettez l'ordinateur en
> Wi-Fi sur le même réseau que le téléphone.

---

## Étape 0 — Récupérer le projet

Le projet vit sur le dépôt **`mly-dev/projet`**, dans la branche
**`claude/kayna-kayna-pay-presentation-gp4lgf`**.

```bash
git clone -b claude/kayna-kayna-pay-presentation-gp4lgf \
  https://github.com/mly-dev/projet.git

cd projet/kayna-kayna-pay
```

> ⚠️ **N'oubliez pas l'option `-b`** : le travail est sur une branche, pas sur
> `main`. Un clone sans cette option vous donnerait un dépôt sans le dossier
> `kayna-kayna-pay/`.

Si le dépôt est privé, git vous demandera vos identifiants GitHub (ou utilisez
la version SSH : `git clone -b claude/kayna-kayna-pay-presentation-gp4lgf
git@github.com:mly-dev/projet.git`).

**Vérifiez que vous avez bien tout** :

```bash
ls
# docs  identite  mobile  pitch  plateforme  README.md
```

Si vous avez déjà cloné le dépôt auparavant, mettez-le simplement à jour :

```bash
git fetch origin claude/kayna-kayna-pay-presentation-gp4lgf
git checkout claude/kayna-kayna-pay-presentation-gp4lgf
git pull origin claude/kayna-kayna-pay-presentation-gp4lgf
```

---

## Étape 1 — Démarrer la plateforme

Dans un premier terminal, **depuis le dossier `kayna-kayna-pay`** :

```bash
cd plateforme

# Base de données (une seule fois)
sudo -u postgres psql -c "CREATE USER kkp WITH PASSWORD 'kkp' CREATEDB;" \
                      -c "CREATE DATABASE kaynakaynapay OWNER kkp;"

cp .env.example .env
npm install
npm run db:migrer
npm run db:seed
npm run dev
```

Vous devez voir :

```
Kayna Kayna Pay — plateforme démarrée sur http://localhost:3000
```

**Laissez ce terminal ouvert et visible** : c'est là que s'afficheront les codes
SMS pendant tout l'essai (voir plus bas).

Vérifiez dans un navigateur que <http://localhost:3000> affiche la page de
connexion avec le logo.

---

## Étape 2 — Trouver l'adresse IP de votre ordinateur

Pour votre téléphone, « localhost » désigne le téléphone lui-même. Il lui faut
l'adresse de votre ordinateur sur le réseau local.

| Système | Commande | Ce que vous cherchez |
|---|---|---|
| **Windows** | `ipconfig` | « Adresse IPv4 » de votre carte Wi-Fi |
| **macOS** | `ipconfig getifaddr en0` | l'adresse affichée |
| **Linux** | `hostname -I` | la première adresse |

Vous obtiendrez quelque chose comme `192.168.1.10` ou `10.0.0.23`.

**Vérifiez que ça répond**, toujours depuis l'ordinateur :

```bash
curl http://192.168.1.10:3000/api/categories
```

Vous devez recevoir du JSON avec les catégories. Si vous n'obtenez rien, c'est
votre pare-feu qui bloque le port 3000 — autorisez-le avant de continuer.

---

## Étape 3 — Lancer l'application

Dans un **deuxième terminal** (le premier continue de faire tourner la
plateforme), toujours depuis le dossier `kayna-kayna-pay` :

```bash
cd mobile
npm install

# Indiquez l'adresse trouvée à l'étape 2
cp .env.example .env
# puis ouvrez .env et remplacez l'adresse par la vôtre

npx expo start
```

Un **QR code** s'affiche dans le terminal.

- **Android** : ouvrez Expo Go → « Scan QR code » → scannez.
- **iPhone** : scannez avec l'appareil photo (Expo Go doit être installé).

L'application se télécharge sur le téléphone (quelques dizaines de secondes la
première fois), puis l'écran de bienvenue s'affiche, logo compris.

> **Si les versions se plaignent** au premier lancement :
> `npx expo install --fix` puis relancez `npx expo start`.

---

## Étape 4 — Où lire les codes SMS

La passerelle SMS réelle n'est pas encore branchée : **tous les codes
s'affichent dans le terminal de la plateforme** (celui de l'étape 1), sous cette
forme :

```
[SMS → +22796123456] Kayna Kayna Pay : votre code de vérification est 481923.
```

Gardez ce terminal sous les yeux : vous en aurez besoin trois fois — à
l'inscription du client, et à chaque connexion administrateur.

---

## Étape 5 — Le scénario complet

Le plus intéressant se joue à deux écrans : **le téléphone** (le client) et **un
navigateur** (votre équipe). Ouvrez les deux côte à côte.

### A. Sur le téléphone — créer un compte

1. « Créer mon compte ».
2. Numéro : mettez un **vrai format nigérien**, par exemple `96 12 34 56`
   (le numéro n'a pas besoin d'exister, aucun SMS ne part réellement).
3. Nom, mot de passe (6 caractères minimum), puis **cochez les CGU** — sans
   cela l'inscription est refusée, c'est voulu.
4. « Recevoir mon code par SMS ».
5. **Lisez le code dans le terminal de la plateforme**, saisissez-le.

✅ Vous arrivez sur l'accueil, connecté.

> Vous pouvez aussi vous connecter directement avec le compte de démonstration
> `91 11 11 11` (`+22791111111`) / `client123`, qui a déjà des achats en cours.

### B. Sur le téléphone — démarrer un achat

1. Parcourez l'accueil, ouvrez une catégorie ou cherchez « moto ».
2. Ouvrez **Moto 125 cc**.
3. Sur la fiche, **essayez le simulateur** : saisissez `2000` dans « Si je verse
   chaque jour » — il vous annonce le nombre de jours et la date de fin.
4. « Commencer à payer ».

✅ Votre portefeuille s'ouvre à 0 F, avec le prix figé.

### C. Sur le téléphone — déclarer un versement

1. « Faire un versement ».
2. Montant : `2500` (ou touchez une suggestion).
3. Choisissez un opérateur, par exemple **NITA**.
4. « Voir les instructions de dépôt ».

✅ L'écran affiche le numéro de dépôt, le montant et **une référence unique**
du type `KKP-4F7B2`.

5. **Ne faites aucun vrai dépôt** — appuyez directement sur
   « J'ai effectué le dépôt ✓ ».

✅ Vous arrivez sur la page d'attente, avec le minuteur de 10 minutes.
**Laissez le téléphone sur cet écran.**

### D. Sur le navigateur — valider en tant qu'administrateur

1. Ouvrez <http://localhost:3000>.
2. Connectez-vous : `+22790000010` / `admin123`.
3. **Un code de connexion vous est demandé** — les comptes d'administration
   exigent un deuxième facteur. Lisez-le dans le terminal de la plateforme.
4. Vous arrivez sur la **file de validation**.

✅ **Le versement que vous venez de déclarer est déjà là**, apparu tout seul,
sans rafraîchir la page. Vous voyez le nom du client, son numéro, le produit,
l'opérateur, le montant et l'heure.

5. Cliquez **Valider**. Une fenêtre demande le montant réellement reçu :
   laissez `2500` et validez.

### E. Regardez le téléphone

✅ **Sans rien toucher**, l'écran d'attente bascule sur « Versement validé ! 🎉 »
et le portefeuille est crédité de 2 500 F.

C'est le cœur du produit : le client sait, en quelques secondes, que son argent
est bien arrivé.

### F. Aller jusqu'au bout (facultatif mais parlant)

Recommencez un versement en saisissant cette fois **le montant restant** (visible
sur le détail de l'achat). Après validation par l'admin :

- l'achat passe **« complété »** avec un message de félicitations ;
- le partenaire est notifié ;
- un **récapitulatif valant preuve d'achat** devient disponible.

---

## Ce que vous pouvez tester d'autre

| Cas | Comment | Résultat attendu |
|---|---|---|
| **Rejet d'un versement** | Déclarez un versement, puis « Rejeter » côté admin avec un motif | Le client reçoit le motif, peut relancer |
| **Anti-doublon** | Essayez deux versements sur le même achat | Refusé : « Un versement est déjà en cours » |
| **Montant différent** | Validez côté admin avec un montant autre que déclaré | Le portefeuille est crédité du montant réel |
| **Versement minimum** | Essayez 50 F | Refusé : minimum 100 F |
| **Notifications** | Onglet 🔔 du téléphone | Tout l'historique s'y trouve |
| **Espace partenaire** | Navigateur privé, `+22792000001` / `partenaire123` | Tableau de bord, achats en cours, commandes |
| **Demande d'annulation** | Détail d'un achat → « Demander l'annulation » | Apparaît côté admin, filtre « Demandes d'annulation » |

---

## Problèmes courants

| Symptôme | Cause | Solution |
|---|---|---|
| « Connexion impossible. Vérifiez votre réseau » | L'adresse dans `.env` est fausse, ou téléphone et ordinateur ne sont pas sur le même Wi-Fi | Refaites l'étape 2, vérifiez avec `curl` |
| Le QR code ne se scanne pas | Expo Go pas installé, ou réseaux différents | Installez Expo Go ; essayez `npx expo start --tunnel` (plus lent mais traverse les réseaux) |
| `curl` ne répond pas sur l'IP | Pare-feu | Autorisez le port 3000 en entrée |
| Erreurs de versions au lancement | Dépendances désalignées avec le SDK | `npx expo install --fix` |
| Je ne vois pas le code SMS | Mauvais terminal | C'est celui de la plateforme (étape 1), pas celui d'Expo |
| « Session de connexion expirée » côté admin | Plus de 10 min entre mot de passe et code | Recommencez la connexion |
| L'application affiche un écran blanc | Erreur JavaScript | Secouez le téléphone → « Reload » ; regardez le terminal Expo |
| Rien n'apparaît dans la file admin | Vous n'avez pas appuyé sur « J'ai effectué le dépôt » | Le versement reste « initié » tant que le dépôt n'est pas déclaré |

### Tester sur un émulateur plutôt qu'un téléphone

Avec un émulateur Android, l'adresse de la machine hôte est `10.0.2.2` :
mettez `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` dans `mobile/.env`.

---

## Ce qui ne marchera pas encore — c'est normal

Pour éviter les fausses alertes, voici ce qui est **volontairement absent** à ce
stade :

- **Pas de vrais SMS** — la passerelle nigérienne n'est pas contractualisée.
  Les codes s'affichent dans le terminal.
- **Pas de photos de produits** — le catalogue est en texte. C'est le prochain
  chantier fonctionnel.
- **Pas de notifications hors application** — les notifications arrivent quand
  l'application est ouverte ; Firebase Cloud Messaging n'est pas branché.
- **Le partenaire ne gère pas son catalogue** — son espace est en consultation,
  conformément au phasage du MVP.
- **Les CGU affichées sont des projets de texte**, non validés juridiquement.

---

## Après l'essai

Notez tout ce qui vous a gêné, même les petits détails : un mot mal choisi, un
bouton trop petit, une étape peu claire. C'est précisément ce que cet essai doit
faire remonter — le code fonctionne, ce sont les usages réels qui restent à
vérifier.

La **recette officielle du MVP** (chapitre 13 du cahier des charges) demandera,
elle, de refaire ce parcours **avec de vrais dépôts mobile money de faible
montant**, une fois la passerelle SMS et les numéros de dépôt de production en
place.
