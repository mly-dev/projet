# Kayna Kayna Pay — Architecture du backend

Documentation technique du serveur : comment le code est organisé, pourquoi il
l'est ainsi, et comment intervenir dessus sans casser les garanties financières.

Compléments : [`api.md`](api.md) pour le contrat des routes,
[`schema-donnees.md`](schema-donnees.md) pour la base,
[`exploitation.md`](exploitation.md) pour l'exploitation quotidienne.

---

## 1. Vue d'ensemble

| Composant | Choix | Pourquoi |
|---|---|---|
| Serveur | **Next.js** (API routes + pages) | un seul processus sert l'API mobile **et** les deux espaces web (cahier des charges §9.1) |
| Base | **PostgreSQL** | transactions et intégrité forte — indispensables pour des portefeuilles |
| Temps réel | **Socket.io** | validation notifiée instantanément, file admin vivante |
| Langage | **JavaScript** (sans TypeScript) | cohérent avec le choix fait pour l'application mobile |
| Auth | **JWT** + bcrypt | API sans état, un même jeton pour les trois clients |

Environ 650 lignes de logique métier dans `lib/`, plus 36 routes fines. La règle
implicite : **les routes ne contiennent pas de métier**, elles valident les
entrées, appellent un module, et formatent la réponse.

---

## 2. Le serveur — `server.js`

Next.js ne suffit pas seul : il faut un serveur HTTP maison pour y greffer
Socket.io et la tâche de fond. `server.js` fait exactement trois choses.

**1. Il sert Next.js** (API routes + pages web) via `handle(req, res)`.

**2. Il monte Socket.io**, avec authentification obligatoire à la poignée de
main. C'est un point de sécurité facile à manquer : sans ce `io.use(...)`,
n'importe qui écouterait les notifications de n'importe qui.

```js
io.use((socket, suivant) => {
  // Jeton explicite (mobile) ou cookie httpOnly joint par le navigateur (web)
  const token =
    (socket.handshake.auth && socket.handshake.auth.jeton) ||
    jetonDuCookieBrut(socket.handshake.headers.cookie);
  if (!token) return suivant(new Error("Jeton requis."));
  socket.donnees = verifierJetonSession(token);  // rejette aussi un jeton d'étape 2fa
  suivant();
});

io.on("connection", (socket) => {
  const { uid, role } = socket.donnees;
  socket.join(`user:${uid}`);                                   // ses notifications
  if (role === "admin" || role === "superadmin") socket.join("admins"); // la file
});
```

L'instance est exposée en `global._io` pour que `lib/notifications.js` puisse
émettre sans dépendre du serveur — c'est un raccourci assumé (voir §9).

**3. Il lance le balayage des minuteurs** toutes les 60 secondes :

```js
setInterval(() => {
  balayerMinuteurs().catch((e) => console.error("Balayage minuteurs :", e.message));
}, 60 * 1000);
```

> ⚠️ Ce `setInterval` vit **dans le processus**. Avec plusieurs instances, le
> balayage s'exécuterait en parallèle sur chacune. Les transitions étant
> verrouillées et validées en base, il n'en résulterait pas de double crédit,
> mais c'est du travail inutile — à déplacer vers une tâche planifiée unique
> avant la Phase 3.

---

## 3. Organisation du code

```
plateforme/
├── server.js              Next.js + Socket.io + tâche de fond
├── db/migrations/         Migrations versionnées, appliquées une seule fois
├── public/                Favicon et logo des espaces web
├── lib/                   ── LOGIQUE MÉTIER (le cœur) ──
│   ├── db.js              Pool, query(), tx(), paramètres
│   ├── auth.js            JWT, bcrypt, garde de rôle, normalisation téléphone
│   ├── otp.js             Génération/vérification des codes
│   ├── sms/               Passerelle SMS (fournisseur interchangeable)
│   ├── versements.js      ★ Machine à états, validation, portefeuilles
│   ├── achats.js          Démarrage d'achat, consultation, annulation
│   ├── notifications.js   Base + socket + push, en une fonction
│   ├── push.js            Notifications hors application (stub FCM)
│   ├── audit.js           Journal des actions sensibles
│   └── ratelimit.js       Anti-abus
├── pages/api/             ── ROUTES (fines) ──
│   ├── auth/, achats/, versements/, produits, categories, contenus/, profil, notifications
│   ├── admin/             Routes réservées admin/superadmin
│   └── partenaire/        Routes réservées partenaire
├── pages/admin|partenaire Espaces web (React)
├── composants/, client/, styles/   Front des espaces web
└── scripts/               migrer, seed, smoke
```

**Le sens des dépendances est strict** : `pages/api/*` → `lib/*` → `db`.
Un module de `lib/` n'importe jamais une route ; une route n'écrit jamais de SQL
métier directement. Si vous vous surprenez à écrire un `UPDATE achats` dans une
route, c'est que le code doit aller dans `lib/`.

---

## 4. Les modules

### `lib/db.js` — accès à la base

```js
query(text, params)   // requête simple, paramétrée
tx(async (client) => { … })  // transaction : COMMIT si résolu, ROLLBACK si rejeté
getParametre(cle, defaut)    // lecture d'un paramètre (table parametres)
setParametre(cle, valeur)
```

`tx()` prend en charge `BEGIN`/`COMMIT`/`ROLLBACK` et la libération du client :
toute opération financière doit passer par là. **Attention** — à l'intérieur de
`tx()`, utilisez le `client` reçu, jamais `query()` : celui-ci prendrait une
autre connexion, donc hors de la transaction.

```js
// ✅
await tx(async (client) => {
  await client.query("UPDATE achats SET … WHERE id = $1", [id]);
});

// ❌ échappe à la transaction et à son rollback
await tx(async (client) => {
  await query("UPDATE achats SET … WHERE id = $1", [id]);
});
```

**Injection SQL** : toutes les requêtes sont paramétrées (`$1`, `$2`…). Les
quelques endroits qui construisent une clause `WHERE` dynamique (recherche
catalogue, filtres admin) poussent les valeurs dans un tableau `params` et
n'interpolent **que des noms de colonnes fixes**, jamais des entrées utilisateur.

### `lib/auth.js` — identité et contrôle d'accès

```js
utilisateurRequis(req, res, roles = [])  // → user | null (répond 401/403 lui-même)
signerJeton(user) / verifierJetonSession(token)
signerJetonTemporaire(user)              // étape intermédiaire du deuxième facteur
exigeDoubleFacteur(role)                 // vrai pour admin et superadmin
poserCookieSession(res, jeton) / effacerCookieSession(res)
jetonDeLaRequete(req) / jetonDuCookieBrut(enteteCookie)
hacherMotDePasse(mdp) / comparerMotDePasse(mdp, hash)   // bcrypt, coût 10
normaliserTelephone(tel)  // "90 00 00 00" → "+22790000000" | null
```

`utilisateurRequis` est la garde utilisée par **toutes** les routes protégées.
Elle fait plus que décoder le jeton : elle prend le jeton **de l'en-tête
`Authorization` (mobile) ou du cookie httpOnly (web)**, puis **relit
l'utilisateur en base** et vérifie son statut. Conséquence voulue — suspendre un
compte le coupe immédiatement, sans attendre l'expiration du jeton.

**Deux natures de jeton, à ne jamais confondre :**

| | Contenu | Durée | Ouvre une session ? |
|---|---|---|---|
| Jeton de session | `{ uid, role }` | 24 h | oui |
| Jeton temporaire | `{ uid, role, etape: "2fa" }` | 10 min | **non** |

`verifierJetonSession()` **rejette tout jeton portant `etape`**. C'est la pièce
critique du deuxième facteur : sans elle, le jeton délivré après le seul mot de
passe vaudrait session et le second facteur ne servirait à rien. Elle est
utilisée par `utilisateurRequis` **et** par la poignée de main Socket.io — les
deux seules portes d'entrée.

**Le cookie de session** (`poserCookieSession`) porte `HttpOnly` (invisible au
JavaScript de la page, donc hors de portée d'une faille XSS), `SameSite=Strict`
(protection CSRF, sans jeton anti-CSRF à gérer) et `Secure` en production. Les
espaces web n'ont ainsi **aucun identifiant de session en `localStorage`** :
seul le profil d'affichage (nom, rôle) y est conservé.

Le motif d'appel est toujours le même, et la sortie anticipée est essentielle :

```js
const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
if (!user) return;   // la réponse 401/403 est déjà partie
```

`normaliserTelephone` centralise le format : sans elle, `90000000`,
`+22790000000` et `90 00 00 00` créeraient trois comptes distincts.

### `lib/versements.js` — le cœur du système

Le module le plus sensible : **toute modification ici touche à de l'argent.**

**La machine à états est déclarative :**

```js
const TRANSITIONS = {
  initie:          ["en_attente", "rejete"],
  en_attente:      ["valide", "rejete", "en_verification"],
  en_verification: ["valide", "rejete"],
  valide:          [],   // terminal
  rejete:          [],   // terminal
};
```

Les états terminaux ont une liste vide : **un versement validé ne peut plus
changer**, la garantie d'immuabilité est appliquée par cette table, pas par la
discipline du développeur.

`transitionner(client, id, vers, parUserId, note, majSupplementaires)` est le
seul chemin de changement d'état. Elle verrouille la ligne (`FOR UPDATE`),
refuse une transition non déclarée, applique la mise à jour et **écrit une ligne
de journal** dans `versement_transitions`. Deux administrateurs qui valident le
même versement simultanément : le second attend le verrou, puis échoue avec
« Transition interdite : valide → valide ».

`recalculerPortefeuille(client, achatId)` recalcule le solde **depuis les
écritures** et l'écrit dans `achats.montant_verse`. Jamais d'incrément.

```js
// La seule définition du solde, et elle est dérivée
COALESCE(SUM(versements.montant_valide WHERE statut='valide'), 0)
+ COALESCE(SUM(ajustements.montant), 0)
```

`validerVersement(admin, id, montantReel)` enchaîne, **dans une seule
transaction** : transition → recalcul → bascule éventuelle de l'achat en
`complete`. Puis, **hors transaction**, l'audit et les notifications (client,
et partenaire si l'achat est complété). Cet ordre est délibéré : un échec
d'envoi de notification ne doit pas annuler un versement déjà validé.

`balayerMinuteurs()` — la tâche de fond décrite au §2. Elle applique deux règles
du cahier des charges : expiration du minuteur → `en_verification` (avec message
rassurant), et abandon après 24 h → `rejete` pour libérer l'anti-doublon.

**Les références** (`KKP-XXXXX`) utilisent un alphabet sans caractères
ambigus — ni `0`/`O`, ni `1`/`I`/`L` — parce qu'elles sont dictées au téléphone
et recopiées à la main dans un motif de transfert.

### `lib/achats.js`

`demarrerAchat` **copie** `produits.prix_affiche` dans `achats.prix_total` :
c'est ce qui rend la garantie de prix structurelle. `detailAchat` renvoie l'achat
avec l'historique de ses versements (la preuve pour le client) ; `recapitulatif`
produit la preuve d'achat après complétion ; `demanderAnnulation` pose un
drapeau traité ensuite côté admin.

### `lib/notifications.js`

Une notification = trois gestes en un appel, dans cet ordre :

```js
await notifier(userId, type, titre, corps, donnees);
// 1. INSERT en base      → l'utilisateur la retrouvera même hors ligne
// 2. socket user:<id>    → affichage instantané s'il est connecté
// 3. push (FCM)          → hors application
```

Persister **avant** d'émettre est important : un client hors ligne au moment de
la validation doit retrouver l'information au lancement suivant.

`emettreAdmins(evenement, donnees)` alimente la file de validation en direct.

### `lib/sms/` et `lib/push.js` — points d'extension

La passerelle SMS est un **fournisseur interchangeable** choisi par la variable
`SMS_FOURNISSEUR` :

```js
const fournisseurs = { console: console_ };
function passerelle() { return fournisseurs[process.env.SMS_FOURNISSEUR] || console_; }
```

En développement, `console` écrit le code OTP dans les journaux — pratique pour
tester une inscription sans SMS réel. Brancher la passerelle nigérienne se
résume à : créer `lib/sms/<nom>.js` exportant `envoyer(telephone, message)`,
l'ajouter au registre, changer la variable d'environnement. **Aucun appelant
n'est modifié.**

`lib/push.js` suit la même logique côté Firebase Cloud Messaging : la fonction
`envoyerPush` journalise aujourd'hui et devra appeler FCM demain, sans que
`notifier()` change.

### `lib/audit.js` et `lib/ratelimit.js`

`auditer(userId, action, cibleType, cibleId, details)` — une ligne par action
sensible. Convention de nommage : `<objet>.<action>` (`versement.valide`,
`parametre.modifie`).

`garde(req, res, nom, max, fenetreMs)` — limitation par IP, en mémoire. Renvoie
`false` **et répond 429** ; l'appelant sort immédiatement :

```js
if (!garde(req, res, "connexion", 15, 15 * 60 * 1000)) return;
```

> En mémoire = **par instance**. Avec plusieurs instances, la limite effective
> est multipliée d'autant. À remplacer par un compteur partagé (Redis) en même
> temps que la mise à l'échelle.

---

## 5. Le parcours de versement, de bout en bout

C'est le chemin critique. Le suivre une fois donne la logique de tout le reste.

```
CLIENT (mobile)                 SERVEUR                          ADMIN (web)
     │
     │ POST /api/versements
     ├──────────────────────────>  initierVersement()
     │                             ├ verrou sur l'achat (FOR UPDATE)
     │                             ├ vérifie : montant ≥ minimum, achat en_cours
     │                             ├ vérifie : aucun versement actif (anti-doublon)
     │                             └ INSERT versement (initie) + transition
     │ <── instructions ───────────┤   (numéro de dépôt, montant, référence KKP-XXXXX)
     │
     │ … dépôt réel dans l'application mobile money …
     │
     │ POST /versements/{id}/confirmer
     ├──────────────────────────>  confirmerDepot()
     │                             ├ transition initie → en_attente
     │                             └ emettreAdmins("file:nouveau") ──────────>  ligne
     │ <── attente_minutes: 10 ────┤                                            en file
     │                                                                              │
     │  [page d'attente : minuteur 10 min, socket + repli toutes les 15 s]          │
     │                                                                    vérifie le dépôt
     │                                                                    dans l'app opérateur
     │                             validerVersement()  <───────────────────────────┤
     │                             ┌ TRANSACTION ─────────────────┐   POST …/valider
     │                             │ transition → valide          │   { montant_reel }
     │                             │ recalcul du portefeuille     │
     │                             │ achat → complete si atteint  │
     │                             └──────────────────────────────┘
     │                             ├ auditer()
     │ <── socket "notification" ──┤ notifier(client)
     │     portefeuille crédité    └ notifier(partenaire) si complété
```

**Si le minuteur expire** sans décision : `balayerMinuteurs()` bascule le
versement en `en_verification` et notifie le client — « inutile de rester sur la
page, vous serez notifié ; un dépôt réel n'est jamais perdu ». L'admin peut
toujours le valider ensuite. C'est le critère d'acceptation le plus important du
chapitre 13, et il est couvert par le test automatique.

---

## 6. Sécurité

Ce que le code applique aujourd'hui (cahier des charges §10) :

| Exigence | Implémentation |
|---|---|
| Mots de passe hachés | bcrypt coût 10, jamais de clair en base ni en journal |
| Jetons à durée limitée | JWT, 24 h par défaut (`JWT_DUREE`) |
| Contrôle d'accès par rôle **sur chaque route** | `utilisateurRequis(req, res, [rôles])`, rôle **relu en base** |
| Espace admin inaccessible depuis le mobile | routes `/api/admin/*` fermées aux rôles `client`/`partenaire` ; l'application refuse aussi la connexion d'un non-client |
| **Double authentification des administrateurs** | mot de passe puis code SMS ; le jeton intermédiaire n'ouvre aucune session |
| **Session web hors de portée du JavaScript** | cookie `HttpOnly` + `SameSite=Strict` (+ `Secure` en production) |
| Journal d'audit | `auditer()` sur validations, rejets, remboursements, suspensions, paramètres |
| Anti-abus connexion et OTP | `garde()` sur les cinq routes d'authentification |
| Validation systématique côté serveur | chaque route vérifie types et règles — le client n'est jamais cru sur parole |
| Minimisation des données | téléphone, nom, historique ; suppression de compte avec anonymisation |

Détails moins visibles mais volontaires :

- **Pas de divulgation** sur `mot-de-passe-oublie` ni sur la connexion : la
  réponse est identique que le compte existe ou non ;
- **OTP à usage unique** et cloisonné par usage (`inscription` ≠ `reinitialisation`) ;
- **Le prix partenaire ne sort jamais** par l'API publique ;
- **Le montant crédité n'est jamais celui déclaré par le client**, mais celui
  saisi par l'administrateur après constatation ;
- **Socket authentifié** à la poignée de main, salons cloisonnés par utilisateur.

**Restant à faire avant la production** (voir aussi `exploitation.md` §7) :
`JWT_SECRET` fort, HTTPS partout, limitation de débit partagée entre instances.

---

## 7. Conventions de code

- **Français** pour les noms de domaine (`versements`, `demarrerAchat`,
  `montant_verse`) — le vocabulaire du code est celui du cahier des charges, ce
  qui évite un glissement métier à la traduction.
- **`snake_case`** en base et dans le JSON de l'API ; **`camelCase`** pour les
  variables JavaScript locales.
- **Messages d'erreur destinés à l'utilisateur final** : ils sont affichés tels
  quels dans l'application. « Le versement minimum est de 100 F. », pas
  « ValidationError: amount < min ».
- **Montants toujours entiers**, en francs CFA.
- **Commentaires** : uniquement pour les contraintes que le code ne montre pas
  (une règle du cahier des charges, une raison de sécurité). Pas de paraphrase.

---

## 8. Recettes courantes

### Ajouter une route protégée

```js
import { utilisateurRequis } from "../../lib/auth";

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["client"]);
  if (!user) return;                       // 401/403 déjà envoyés
  if (req.method !== "POST") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  try {
    const resultat = await monModuleMetier(user, req.body);   // le métier vit dans lib/
    res.json({ ok: true, ...resultat });
  } catch (e) {
    res.status(400).json({ ok: false, erreur: e.message });    // message lisible par l'utilisateur
  }
}
```

### Ajouter une opération qui touche à l'argent

1. L'écrire dans `lib/`, jamais dans la route.
2. L'envelopper dans `tx()` et verrouiller les lignes concernées (`FOR UPDATE`).
3. Ne **jamais** écrire `montant_verse` directement : passer par un versement ou
   un ajustement, puis `recalculerPortefeuille()`.
4. Tracer par `auditer()` si l'action est sensible.
5. Ajouter un critère au script `scripts/smoke.js`.

### Ajouter un état de versement

Modifier `TRANSITIONS` **et** la contrainte `CHECK` de la colonne `statut`, cette
dernière par une **nouvelle migration**. Les deux doivent rester d'accord : la
contrainte est le filet de sécurité si le code se trompe.

### Faire évoluer le schéma

```bash
# 1. créer db/migrations/00N_description.sql
# 2. vérifier ce qui est en attente
npm run db:migrer -- --etat
# 3. appliquer
npm run db:migrer
```

Chaque migration s'exécute une seule fois, dans une transaction, et son
empreinte est enregistrée. **Ne jamais modifier une migration déjà appliquée** :
l'exécuteur le détecte et refuse de continuer, parce que la base et le dépôt ne
diraient plus la même chose. Créez-en une nouvelle.

Une base antérieure à l'introduction des migrations est reconnue automatiquement
et `001_schema_initial.sql` y est marqué appliqué sans être rejoué.

### Brancher la vraie passerelle SMS

Créer `lib/sms/<nom>.js` exportant `envoyer(telephone, message)`, l'enregistrer
dans `lib/sms/index.js`, définir `SMS_FOURNISSEUR=<nom>`. Rien d'autre à toucher.

---

## 9. Dette technique assumée

Listée ici pour être traitée en connaissance de cause, pas découverte plus tard.

| Point | Impact | Quand le traiter |
|---|---|---|
| `global._io` pour l'accès au socket | couplage discret entre `lib` et le serveur ; gênant pour tester `notifier()` isolément | à l'introduction de tests unitaires |
| Limitation de débit en mémoire | limite multipliée par le nombre d'instances | avant la mise à l'échelle (Phase 3) |
| `setInterval` dans le processus | balayage dupliqué en multi-instances (sans double crédit) | même échéance |
| Pas de pagination | listes plafonnées (100–300 lignes) | quand les volumes grimperont |
| Pas de tests unitaires | seul le test de bout en bout couvre le système | en continu |

---

## 10. Tests

Le MVP est couvert par un **test de bout en bout** (`npm run smoke`, serveur
démarré) qui déroule le parcours réel contre la vraie base et vérifie un à un
les critères d'acceptation du chapitre 13 : inscription OTP, démarrage d'achat,
anti-doublon, apparition temps réel dans la file admin, validation au montant
réel, minuteur expiré puis validation tardive, rejet motivé, complétion avec
notification du client et du partenaire, récapitulatif, **égalité du solde et
des écritures**, et contrôle d'accès par rôle.

S'y ajoutent les critères de sécurité : le deuxième facteur administrateur (le
mot de passe seul ne délivre pas de session, le jeton intermédiaire est rejeté
par les routes protégées, un code erroné est refusé) et le cookie de session web
(`HttpOnly`, `SameSite=Strict`, aucun jeton dans le corps de la réponse).

État actuel : **25 critères validés, 0 en échec.**

C'est volontairement un test d'intégration plutôt qu'une batterie de tests
unitaires : sur un système dont les risques sont la concurrence, les
transactions et les états, tester le tout assemblé attrape les vraies pannes.
Les tests unitaires deviendront utiles quand la logique de calcul se complexifiera
(frais d'annulation, arrondis, échéanciers).
