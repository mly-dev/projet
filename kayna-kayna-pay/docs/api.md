# Kayna Kayna Pay — Référence de l'API

Livrable « API backend documentée » (cahier des charges §11). Cette référence
décrit les 33 routes de l'API telles qu'elles sont implémentées dans
`plateforme/pages/api/`.

## Conventions générales

**Base** : `http://localhost:3000` en développement. Toutes les routes sont
préfixées par `/api`.

**Format** : requêtes et réponses en JSON (`Content-Type: application/json`).
Tous les montants sont des **entiers en francs CFA** (le FCFA n'a pas de
subdivision) — jamais de décimales, jamais de chaînes.

**Enveloppe de réponse** : chaque réponse contient un booléen `ok`.

```jsonc
// Succès
{ "ok": true, "achats": [ /* … */ ] }

// Erreur — le message est rédigé pour être affiché tel quel à l'utilisateur
{ "ok": false, "erreur": "Le versement minimum est de 100 F." }
```

**Authentification** : jeton JWT dans l'en-tête, obtenu à la connexion ou à la
vérification OTP.

```
Authorization: Bearer <jeton>
```

Durée de validité : 24 h par défaut (`JWT_DUREE`). Le jeton porte l'identifiant
et le rôle ; le rôle est **revérifié en base à chaque requête**, si bien que la
suspension d'un compte prend effet immédiatement, sans attendre l'expiration.

**Codes HTTP** :

| Code | Signification |
|---|---|
| 200 | Succès (y compris les erreurs métier signalées par `ok: false`… voir ci-dessous) |
| 400 | Requête invalide ou règle métier non respectée |
| 401 | Jeton absent, invalide ou expiré |
| 403 | Rôle insuffisant, ou compte suspendu |
| 404 | Ressource introuvable |
| 405 | Méthode HTTP non autorisée sur cette route |
| 409 | Conflit (compte déjà existant) |
| 429 | Trop de tentatives (limitation de débit) |

**Rôles** : `client`, `partenaire`, `admin`, `superadmin`. Chaque route déclare
les rôles admis ; toute autre valeur reçoit un 403. Les routes du catalogue et
des contenus sont publiques (rôle « visiteur » du cahier des charges §3).

**Limitation de débit** : appliquée par adresse IP sur les routes sensibles
(anti-abus, cahier des charges §10). Dépassement → 429.

| Route | Limite |
|---|---|
| `/api/auth/connexion` | 15 tentatives / 15 min |
| `/api/auth/inscription` | 10 / heure |
| `/api/auth/verifier-otp` | 20 / heure |
| `/api/auth/reinitialiser` | 10 / heure |
| `/api/auth/mot-de-passe-oublie` | 5 / heure |

---

## 1. Authentification

### `POST /api/auth/inscription` — public

Crée un compte client (non encore vérifié) et envoie un code OTP par SMS.

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `telephone` | string | oui | 8 chiffres, préfixe `+227` optionnel ; normalisé en `+227XXXXXXXX` |
| `nom` | string | oui | 2 caractères minimum |
| `mot_de_passe` | string | oui | 6 caractères minimum |
| `cgu_acceptees` | bool | oui | doit valoir `true` |

```jsonc
// 200
{ "ok": true, "message": "Code de vérification envoyé par SMS.", "telephone": "+22791111111" }
```

Erreurs : `400` numéro invalide, nom trop court, mot de passe trop court, CGU
non acceptées ; `409` un compte **vérifié** existe déjà avec ce numéro.

> Un compte créé mais jamais vérifié peut être réinscrit : les informations sont
> écrasées et un nouveau code est envoyé. Cela évite qu'un numéro reste bloqué
> par une inscription abandonnée.

### `POST /api/auth/verifier-otp` — public

Vérifie le code reçu par SMS, marque le numéro comme vérifié et ouvre la session.

| Champ | Type | Obligatoire |
|---|---|---|
| `telephone` | string | oui |
| `code` | string | oui (6 chiffres) |

```jsonc
// 200
{
  "ok": true,
  "jeton": "eyJhbGciOiJIUzI1NiIs…",
  "utilisateur": { "id": 7, "telephone": "+22791111111", "nom": "Aïcha Démo", "role": "client" }
}
```

Erreurs : `400` code invalide ou expiré (validité 10 minutes, usage unique) ;
`404` compte introuvable.

### `POST /api/auth/connexion` — public

| Champ | Type | Obligatoire |
|---|---|---|
| `telephone` | string | oui |
| `mot_de_passe` | string | oui |

Réponse identique à `verifier-otp`.

Erreurs : `401` identifiants incorrects (message volontairement identique que le
numéro existe ou non) ; `403` compte suspendu ; `403` numéro non vérifié — la
réponse porte alors `verification_requise: true` pour que l'application propose
de reprendre l'inscription.

### `POST /api/auth/mot-de-passe-oublie` — public

Envoie un code de réinitialisation par SMS.

| Champ | Type | Obligatoire |
|---|---|---|
| `telephone` | string | oui |

```jsonc
// 200 — réponse identique que le compte existe ou non (pas de divulgation)
{ "ok": true, "message": "Si un compte existe avec ce numéro, un code a été envoyé par SMS." }
```

### `POST /api/auth/reinitialiser` — public

| Champ | Type | Obligatoire |
|---|---|---|
| `telephone` | string | oui |
| `code` | string | oui |
| `nouveau_mot_de_passe` | string | oui (6 caractères minimum) |

Réponse : jeton + utilisateur (l'utilisateur est connecté dans la foulée).

---

## 2. Profil — tout utilisateur connecté

### `GET /api/profil`

```jsonc
{ "ok": true, "utilisateur": { "id": 7, "telephone": "+22791111111", "nom": "Aïcha Démo",
                               "role": "client", "statut": "actif", "telephone_verifie": true } }
```

### `PUT /api/profil`

| Champ | Type | Obligatoire | Note |
|---|---|---|---|
| `nom` | string | non | ignoré si moins de 2 caractères |
| `ancien_mot_de_passe` | string | si changement de mot de passe | |
| `nouveau_mot_de_passe` | string | non | 6 caractères minimum |

Erreur : `400` ancien mot de passe incorrect.

### `DELETE /api/profil`

Droit de suppression du compte (cahier des charges §10). Le compte passe au
statut `supprime`, le nom et le téléphone sont anonymisés — **les écritures
financières (versements, achats) sont conservées**, comme l'exigent les
obligations comptables. L'action est tracée au journal d'audit.

---

## 3. Catalogue — public (visiteur)

### `GET /api/categories`

Catégories actives, triées par ordre d'affichage.

```jsonc
{ "ok": true, "categories": [ { "id": 1, "nom": "Téléphonie", "slug": "telephonie" } ] }
```

### `GET /api/produits`

Recherche et filtres du catalogue.

| Paramètre | Type | Effet |
|---|---|---|
| `q` | string | mot-clé dans le nom ou la description |
| `categorie` | slug | filtre par catégorie |
| `prix_min`, `prix_max` | entier | fourchette sur le **prix affiché** |
| `partenaire` | id | filtre par partenaire |
| `mis_en_avant` | `1` | uniquement les produits mis en avant |
| `limite` | entier | 50 par défaut, 100 maximum |

Seuls les produits `disponible = true`, `statut_validation = 'valide'` et
appartenant à un partenaire actif sont renvoyés.

```jsonc
{ "ok": true, "produits": [ {
  "id": 4, "nom": "Moto 125 cc", "description": "…",
  "prix_affiche": 672000, "photos": [], "mis_en_avant": true,
  "modalites_remise": "Retrait chez le partenaire",
  "categorie": "Motos & véhicules", "categorie_slug": "motos-vehicules",
  "partenaire_id": 2, "partenaire": "Moto Plus Niamey"
} ] }
```

> Le **prix partenaire n'est jamais exposé** côté client : seul le prix affiché
> (commission incluse) circule sur l'API publique.

### `GET /api/produits/{id}`

Fiche d'un produit. `404` si introuvable ou non validé.

### `GET /api/contenus/{cle}`

Contenus éditoriaux administrables. `cle` ∈ `cgu`, `confidentialite`, `faq`,
`contact` — toute autre valeur renvoie `404`.

```jsonc
{ "ok": true, "contenu": { "cle": "cgu", "titre": "Conditions générales d'utilisation (projet)",
                           "corps": "…", "maj_le": "2026-08-04T12:00:00.000Z" } }
```

---

## 4. Achats — rôle `client`

### `GET /api/achats`

Tous les achats du client connecté, du plus récemment modifié au plus ancien.

```jsonc
{ "ok": true, "achats": [ {
  "id": 12, "reference": "ACH-7K2M4X", "produit_id": 4,
  "prix_total": 672000, "montant_verse": 22500, "statut": "en_cours",
  "annulation_demandee": false, "produit_nom": "Moto 125 cc",
  "partenaire": "Moto Plus Niamey", "cree_le": "…", "maj_le": "…"
} ] }
```

### `POST /api/achats`

Démarre un achat : ouvre un portefeuille dédié au produit.

| Champ | Type | Obligatoire |
|---|---|---|
| `produit_id` | entier | oui |

**Le prix affiché est figé à cet instant** dans `achats.prix_total` et garanti
jusqu'au terme, même si le prix du catalogue change ensuite (règle de gestion
« Prix affiché », cahier des charges §6).

Erreur : `400` produit indisponible.

### `GET /api/achats/{id}`

Détail d'un achat **avec l'historique complet de ses versements** (ce qui vaut
preuve pour le client). `404` si l'achat n'appartient pas au client connecté.

```jsonc
{ "ok": true, "achat": {
  "id": 12, "reference": "ACH-7K2M4X", "prix_total": 672000, "montant_verse": 22500,
  "statut": "en_cours", "produit_nom": "Moto 125 cc", "modalites_remise": "…",
  "versements": [ {
    "id": 31, "reference": "KKP-XH8A2", "operateur": "wave",
    "montant_declare": 15000, "montant_valide": 15000, "statut": "valide",
    "motif_rejet": null, "initie_le": "…", "depot_confirme_le": "…", "statut_maj_le": "…"
  } ]
} }
```

### `POST /api/achats/{id}/annulation`

Demande d'annulation par le client (traitée ensuite par l'administration selon
les règles du chapitre 6). L'achat doit être `en_cours`.

| Champ | Type | Obligatoire |
|---|---|---|
| `motif` | string | non |

### `GET /api/achats/{id}/recapitulatif`

Récapitulatif valant preuve d'achat : produit, partenaire, montant total,
et la liste des versements **validés** avec leur date et leur opérateur.

---

## 5. Versements — rôle `client`

Le parcours suit la machine à états décrite au chapitre 5 du cahier des charges.

```
initié ──(client déclare le dépôt)──> en attente ──(admin)──> validé
   │                                       │
   │                                       ├──(admin)──> rejeté
   │                                       └──(minuteur 10 min)──> en vérification ──(admin)──> validé | rejeté
   └──(24 h sans déclaration)──> rejeté (abandon)
```

### `POST /api/versements` — étape 1 : initiation

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `achat_id` | entier | oui | achat `en_cours` du client |
| `montant` | entier | oui | ≥ versement minimum (100 F par défaut) |
| `operateur` | string | oui | `nita`, `amana` ou `wave` |

```jsonc
{
  "ok": true,
  "versement": { "id": 31, "reference": "KKP-XH8A2", "statut": "initie", /* … */ },
  "instructions": {
    "operateur": "wave",
    "numero_depot": "+227 92 00 00 03",
    "montant": 15000,
    "reference": "KKP-XH8A2",
    "frais": "Les frais de dépôt mobile money sont à votre charge."
  }
}
```

Erreurs `400` : montant sous le minimum, opérateur inconnu, achat introuvable ou
n'acceptant plus de versements, **et surtout** :

> « Un versement est déjà en cours sur cet achat. Attendez sa validation. »
>
> Règle anti-doublon (§5.2) : un seul versement actif (`initie` ou `en_attente`)
> par achat, pour que le rapprochement manuel reste sans ambiguïté. Garantie
> **en base** par un index unique partiel, pas seulement dans le code.

### `POST /api/versements/{id}/confirmer` — étape 2 : « J'ai effectué le dépôt »

Fait passer le versement en `en_attente` et le pousse **immédiatement** dans la
file de l'espace administrateur (événement socket `file:nouveau`).

```jsonc
{ "ok": true, "versement": { /* … */ }, "attente_minutes": 10 }
```

### `GET /api/versements/{id}`

État d'un versement. Sert de **repli à la page d'attente** si la connexion
socket est coupée (l'application interroge cette route toutes les 15 secondes).

---

## 6. Notifications — tout utilisateur connecté

### `GET /api/notifications`

Les 100 dernières notifications, avec le compteur de non-lues.

```jsonc
{ "ok": true, "non_lues": 2, "notifications": [ {
  "id": 88, "type": "versement_valide", "titre": "Versement validé ✓",
  "corps": "Votre versement de 15 000 F sur « Moto 125 cc » est validé. …",
  "donnees": { "achat_id": 12, "versement_id": 31, "montant": 15000, "total": 22500 },
  "lue": false, "cree_le": "…"
} ] }
```

### `POST /api/notifications`

Marque toutes les notifications de l'utilisateur comme lues.

**Types émis** :

| Type | Destinataire | Déclencheur |
|---|---|---|
| `versement_valide` | client | validation admin |
| `versement_rejete` | client | rejet admin (contient le motif) |
| `versement_verification` | client | minuteur expiré |
| `achat_complete` | client | portefeuille complété |
| `achat_en_preparation`, `achat_livre`, `achat_annule`, `achat_rembourse` | client | action admin sur l'achat |
| `annulation_demandee` | client | accusé de réception de sa demande |
| `commande_complete` | partenaire | un de ses produits est entièrement payé |
| `campagne` | clients ciblés | campagne d'incitation au versement |

---

## 7. Espace administrateur — rôles `admin` et `superadmin`

### `GET /api/admin/versements`

File de validation. Paramètre `statut` ∈ `en_attente` (défaut),
`en_verification`, `valide`, `rejete`. Trié du plus ancien dépôt déclaré au plus
récent (premier arrivé, premier traité), 200 lignes maximum.

Chaque ligne porte tout ce qu'il faut pour le rapprochement bancaire : montant
déclaré, opérateur, référence, **téléphone et nom du client**, horodatage de la
déclaration, plus le contexte de l'achat (produit, prix total, montant déjà versé).

### `POST /api/admin/versements/{id}/valider`

| Champ | Type | Obligatoire | Note |
|---|---|---|---|
| `montant_reel` | entier | non | montant **réellement reçu** ; à défaut, le montant déclaré |

```jsonc
{ "ok": true, "total": 22500, "complete": false }
```

`complete: true` signale que le portefeuille vient d'atteindre le prix total :
l'achat est passé `complete`, le client et le partenaire ont été notifiés.

Cette route enchaîne, **dans une seule transaction** : transition d'état,
journalisation, recalcul du portefeuille depuis les écritures, et bascule
éventuelle de l'achat en `complete`.

### `POST /api/admin/versements/{id}/rejeter`

| Champ | Type | Obligatoire |
|---|---|---|
| `motif` | string | **oui** — un rejet sans motif est refusé (400) |

Le motif est transmis tel quel au client dans sa notification.

### `GET /api/admin/achats`

Paramètres : `statut` (`en_cours`, `complete`, `en_preparation`, `livre`,
`annule`, `rembourse`) ou `annulations=1` pour les demandes d'annulation en
attente de traitement.

### `PUT /api/admin/achats/{id}`

| Champ | Type | Obligatoire |
|---|---|---|
| `action` | string | oui — `en_preparation`, `livre`, `annule`, `rembourse` |
| `montant_rembourse` | entier | non (action `rembourse`) — à défaut, tout le montant versé |
| `motif` | string | non |

Transitions autorisées :

| Action | Depuis |
|---|---|
| `en_preparation` | `complete` |
| `livre` | `complete`, `en_preparation` |
| `annule` | `en_cours` |
| `rembourse` | `annule` |

Le remboursement **n'écrase pas le solde** : il insère une écriture d'ajustement
négative dans `ajustements`, puis recalcule le portefeuille. La piste comptable
reste intacte.

### `GET` / `PUT /api/admin/utilisateurs`

`GET` : recherche par `q` (nom ou téléphone) et `role`, 300 lignes maximum.
Les comptes supprimés sont exclus.

`PUT` : `{ user_id, statut }` avec `statut` ∈ `actif`, `suspendu`.
**Un admin ne peut pas suspendre un autre admin** : seul un `superadmin` le peut.

### `GET` / `POST` / `PUT /api/admin/categories`

`POST { nom }` — le slug est dérivé automatiquement (accents retirés).
`PUT { id, nom?, active?, ordre? }`.

### `GET` / `POST` / `PUT /api/admin/produits`

`POST` : `{ partenaire_id, categorie_id, nom, description?, prix_partenaire,
modalites_remise?, mis_en_avant? }`.

> **Le prix affiché n'est jamais saisi à la main** : il est calculé côté serveur
> à partir du prix partenaire et du taux de commission, arrondi aux 5 F
> supérieurs. C'est la seule source de vérité pour cette règle.

`PUT` : `{ id, disponible?, mis_en_avant?, description?, statut_validation?,
modalites_remise? }`.

### `GET` / `POST /api/admin/partenaires`

`POST` : `{ enseigne, contact?, coordonnees_reglement?, telephone?, mot_de_passe? }`.
Si `telephone` et `mot_de_passe` sont fournis, un compte de rôle `partenaire`
est créé et rattaché. Conformément au §7, **il n'existe pas d'inscription libre
pour les partenaires** : ils sont créés par l'administration.

### `GET /api/admin/parametres` — `admin` · `PUT` — **`superadmin` uniquement**

Clés modifiables : `commission_pct`, `versement_minimum`, `numeros_depot`
(objet `{ nita, amana, wave }`), `delai_attente_minutes`.

`PUT { cle, valeur }`. Toute modification est tracée au journal d'audit.

### `GET /api/admin/stats`

Tableau de bord : versements à traiter, volumes et montants collectés
(jour / 7 jours / 30 jours), achats par statut, commissions générées
(somme des `prix_total − prix_partenaire` sur les achats complétés ou livrés),
et les 5 partenaires les plus actifs.

### `POST /api/admin/campagne`

| Champ | Type | Obligatoire |
|---|---|---|
| `titre` | string | oui |
| `corps` | string | oui |
| `cible` | string | non — `achats_en_cours` (défaut de l'interface) ou `tous` |

```jsonc
{ "ok": true, "destinataires": 143 }
```

### `GET /api/admin/audit` — **`superadmin` uniquement**

Les 300 dernières entrées du journal d'audit, avec le nom de l'auteur.

Actions tracées : `versement.valide`, `versement.rejete`, `achat.<action>`,
`utilisateur.statut`, `produit.cree`, `produit.modifie`, `categorie.creee`,
`categorie.modifiee`, `partenaire.cree`, `parametre.modifie`,
`campagne.envoyee`, `achat.annulation_demandee`, `compte.supprime`.

---

## 8. Espace partenaire — rôle `partenaire`

### `GET /api/partenaire/tableau-de-bord`

```jsonc
{ "ok": true,
  "partenaire": { "id": 1, "enseigne": "Sahel Électronique" },
  "stats": {
    "achats_en_cours": { "n": 3, "verse": 45000, "total": 250000 },
    "commandes_a_preparer": 1,
    "ventes_livrees": { "n": 4, "chiffre": 320000 }
  } }
```

### `GET /api/partenaire/produits`

Produits de l'enseigne, avec pour chacun le nombre d'achats en cours et de
commandes. Le partenaire voit **son** prix et le prix affiché.

### `GET /api/partenaire/commandes`

Achats `complete`, `en_preparation` ou `livre` sur ses produits — les commandes
à préparer et l'historique des ventes.

---

## 9. Temps réel (Socket.io)

Connexion au même hôte que l'API, **jeton obligatoire** à la poignée de main :

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:3000", { auth: { jeton: "<jeton>" } });
```

Un jeton absent ou invalide fait échouer la connexion. À la connexion, le
serveur inscrit automatiquement le client dans ses salons : `user:<id>` pour
tous, plus `admins` pour les rôles `admin` et `superadmin`.

| Événement | Reçu par | Charge utile |
|---|---|---|
| `notification` | l'utilisateur concerné | la notification complète (voir §6) |
| `file:nouveau` | admins | le versement déclaré, enrichi (client, produit) |
| `file:traite` | admins | `{ versement_id, statut }` après validation ou rejet |
| `file:verification` | admins | `{ versement_id }` quand le minuteur expire |

Les espaces web et l'application mobile prévoient tous deux un **repli par
interrogation périodique** si le socket est indisponible : le temps réel
améliore l'expérience, il n'est jamais indispensable au bon fonctionnement.

---

## 10. Tâche de fond

Le serveur exécute `balayerMinuteurs()` **toutes les 60 secondes**
(`server.js`) :

1. les versements `en_attente` dont le dépôt a été déclaré il y a plus de
   `delai_attente_minutes` (10 par défaut) passent `en_verification`, avec
   notification rassurante au client — **un dépôt réel n'est jamais perdu** ;
2. les versements `initie` de plus de 24 h (dépôt jamais déclaré) sont rejetés
   pour libérer l'achat de la règle anti-doublon ; le client peut relancer.

## 11. Ce que l'API ne fait pas encore

- **Photos de produits** : le champ `photos` existe (tableau JSON) mais aucune
  route d'upload n'est exposée ; le stockage objet reste à brancher.
- **Gestion du catalogue par le partenaire** : prévue au §7, volontairement hors
  MVP (« espace partenaire réduit, catalogue géré par l'admin au départ »,
  Phase 1). Les routes partenaire sont en lecture seule.
- **Enregistrement des jetons d'appareil** pour les notifications push : `lib/push.js`
  journalise au lieu d'appeler Firebase Cloud Messaging.
- **Pagination** : les listes sont plafonnées (100 à 300 lignes) sans curseur.
  À ajouter avant la montée en charge de la Phase 3.
