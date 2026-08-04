# Kayna Kayna Pay — Schéma de la base de données

Livrable « base de données avec schéma documenté » (cahier des charges §11).
Le schéma exécutable est `plateforme/db/schema.sql` ; ce document explique ce
que chaque table représente et **pourquoi** elle est faite ainsi.

## Principes structurants

Trois décisions gouvernent tout le schéma. Elles découlent du §9.2 du cahier des
charges (« intégrité financière ») et méritent d'être comprises avant toute
modification.

**1. Les montants sont des entiers.** Le franc CFA n'a pas de subdivision : tous
les montants sont des `INTEGER` en francs. Aucun flottant n'approche jamais un
montant — pas d'arrondi surprise, pas de `0,1 + 0,2`.

**2. Un versement validé est une écriture immuable.** Une fois qu'un versement
passe `valide` ou `rejete`, sa ligne ne bouge plus. Toute correction ultérieure
passe par une **écriture d'ajustement** dans `ajustements`, signée par un
administrateur. La conséquence pratique : l'historique affiché au client est
fidèle et vaut preuve, parce qu'il est immuable par construction.

**3. Le solde est dérivé, jamais saisi.** `achats.montant_verse` est un **cache**
recalculé après chaque écriture par la formule :

```sql
montant_verse = COALESCE(SUM(versements.montant_valide WHERE statut='valide'), 0)
              + COALESCE(SUM(ajustements.montant), 0)
```

Aucun code n'écrit `montant_verse = montant_verse + x`. La fonction
`recalculerPortefeuille()` (`lib/versements.js`) est le seul chemin d'écriture,
et elle repart toujours des écritures. Un solde corrompu est donc réparable :
il suffit de relancer le calcul. Le test de bout en bout vérifie cette égalité.

---

## Vue d'ensemble

```
users ──┬──< achats >──── produits >──── categories
        │      │              │
        │      │              └──── partenaires ────> users (compte partenaire)
        │      │
        │      ├──< versements ──< versement_transitions
        │      └──< ajustements
        │
        ├──< notifications
        └──< audit_journal

otp_codes (rattaché au téléphone, pas à l'utilisateur)
parametres, contenus (tables de configuration, clé/valeur)
```

---

## Tables

### `users` — comptes, tous rôles confondus

Un seul modèle d'utilisateur pour les quatre rôles du §3 : le contrôle d'accès
se fait par la colonne `role`, pas par des tables séparées. Cela garde une
authentification unique pour l'API multi-clients.

| Colonne | Type | Note |
|---|---|---|
| `id` | serial | |
| `telephone` | varchar(20) **unique** | identifiant principal, normalisé `+227XXXXXXXX` — cohérent avec l'usage mobile money |
| `nom` | text | |
| `mot_de_passe_hash` | text | bcrypt (jamais le mot de passe en clair) |
| `role` | text | `client` (défaut), `partenaire`, `admin`, `superadmin` |
| `telephone_verifie` | bool | passe à vrai après l'OTP ; la connexion l'exige |
| `statut` | text | `actif`, `suspendu`, `supprime` |
| `cgu_acceptees_le` | timestamptz | **trace horodatée du consentement** — exigée par le §4.1 |
| `cree_le` | timestamptz | |

Le téléphone étant unique, la suppression de compte ne peut pas simplement vider
la colonne : elle y écrit `supprime-<id>-<aléa>` pour libérer le numéro tout en
préservant l'intégrité référentielle des achats passés.

### `otp_codes` — codes de vérification

Rattachés au **téléphone** et non à l'utilisateur : un code doit pouvoir être
envoyé avant même que le compte soit vérifié.

| Colonne | Type | Note |
|---|---|---|
| `telephone` | varchar(20) | |
| `code` | varchar(6) | |
| `usage` | text | `inscription` ou `reinitialisation` — un code d'inscription ne peut pas servir à réinitialiser un mot de passe |
| `expire_le` | timestamptz | 10 minutes après l'émission |
| `utilise` | bool | **usage unique** : consommé à la vérification |

Index sur `(telephone, usage, utilise)` — la vérification cherche toujours ainsi.

### `partenaires` — enseignes vendeuses

| Colonne | Type | Note |
|---|---|---|
| `user_id` | int → `users` | **nullable** : une enseigne peut exister au catalogue avant d'avoir un compte de connexion |
| `enseigne` | text | |
| `contact` | text | adresse, téléphone de contact |
| `coordonnees_reglement` | text | comment le partenaire est payé après livraison |
| `statut` | text | `actif`, `suspendu` — un partenaire suspendu disparaît du catalogue public |

### `categories`

`nom`, `slug` (unique, sert dans les URL et filtres), `active`, `ordre`
(tri d'affichage). Liste entièrement administrable, comme prévu au §4.2.

### `produits`

| Colonne | Type | Note |
|---|---|---|
| `partenaire_id`, `categorie_id` | int | |
| `nom`, `description` | text | |
| `prix_partenaire` | int **> 0** | ce que touche le vendeur |
| `prix_affiche` | int **≥ prix_partenaire** | prix client, commission incluse |
| `photos` | jsonb | tableau d'URL — champ prêt, upload non implémenté |
| `disponible` | bool | rupture de stock, retrait temporaire |
| `mis_en_avant` | bool | page d'accueil de l'application |
| `modalites_remise` | text | retrait, livraison, activation — affiché sur la fiche |
| `statut_validation` | text | `en_attente`, `valide`, `refuse` — **support de la validation admin avant publication** (§7) |

La contrainte `prix_affiche >= prix_partenaire` est une sécurité de dernier
recours : elle rend impossible, même par erreur de code ou saisie directe en
base, un produit vendu à perte pour la plateforme.

Index sur `categorie_id` et `partenaire_id` (filtres du catalogue).

### `achats` — un portefeuille par produit acheté

C'est le cœur métier : un achat **est** le portefeuille dédié dont parle le
cahier des charges. Un client peut en avoir plusieurs simultanément (§4.3).

| Colonne | Type | Note |
|---|---|---|
| `reference` | varchar(12) unique | `ACH-XXXXXX`, communicable au téléphone |
| `client_id`, `produit_id` | int | |
| `prix_total` | int > 0 | **copie figée** du prix affiché au démarrage — la garantie de prix du §6 est structurelle, pas déclarative |
| `montant_verse` | int | cache dérivé (voir principe 3) |
| `statut` | text | `en_cours`, `complete`, `en_preparation`, `livre`, `annule`, `rembourse` |
| `annulation_demandee` | bool | drapeau de demande client, traitée par l'admin |
| `annulation_motif` | text | |
| `complete_le` | timestamptz | horodatage de l'atteinte du montant total |

Copier le prix plutôt que lire `produits.prix_affiche` à la volée est délibéré :
si le partenaire augmente son prix demain, les achats en cours ne bougent pas.
La promesse commerciale est tenue par le schéma.

Index sur `client_id` (mes achats) et `statut` (files admin).

### `versements` — les écritures

| Colonne | Type | Note |
|---|---|---|
| `reference` | varchar(12) unique | `KKP-XXXXX`, alphabet **sans caractères ambigus** (ni `0`/`O`, ni `1`/`I`/`L`) — il est dicté au téléphone et recopié dans un motif de transfert |
| `achat_id`, `client_id` | int | |
| `operateur` | text | `nita`, `amana`, `wave` |
| `montant_declare` | int > 0 | ce que le client dit avoir déposé |
| `montant_valide` | int | ce que l'admin a **réellement constaté** — les deux peuvent différer (§5.2) |
| `statut` | text | `initie`, `en_attente`, `valide`, `rejete`, `en_verification` |
| `motif_rejet` | text | transmis au client |
| `valide_par` | int → `users` | quel administrateur a validé |
| `initie_le`, `depot_confirme_le`, `statut_maj_le` | timestamptz | `depot_confirme_le` déclenche le minuteur de 10 min |

Distinguer `montant_declare` de `montant_valide` est ce qui permet de traiter le
cas courant du dépôt d'un montant différent sans jamais falsifier la déclaration
d'origine : les deux vérités coexistent.

**Index anti-doublon** — la règle du §5.2 est garantie par la base :

```sql
CREATE UNIQUE INDEX versement_actif_unique
  ON versements (achat_id) WHERE statut IN ('initie', 'en_attente');
```

Un index unique **partiel** : au plus un versement actif par achat, quels que
soient les versements terminés. Deux requêtes simultanées ne peuvent pas créer
un doublon — la contrainte tient au niveau de la base, pas seulement du code.

### `versement_transitions` — journal de la machine à états

Une ligne par changement d'état : `de`, `vers`, `par_user_id` (nul = système,
par exemple l'expiration du minuteur), `note`, `le`.

Cette table rend l'histoire de chaque versement rejouable : qui a fait quoi,
quand, et pourquoi. En cas de litige avec un client, c'est la pièce à consulter.

### `ajustements` — corrections tracées

| Colonne | Type | Note |
|---|---|---|
| `achat_id` | int | |
| `montant` | int **signé** | négatif pour un remboursement |
| `motif` | text | obligatoire |
| `admin_id` | int | qui a passé l'écriture |

Le seul moyen légitime de modifier un solde sans toucher aux versements. Un
remboursement de 20 000 F est une ligne `−20000`, pas une soustraction sur
`montant_verse`.

### `notifications`

`user_id`, `type`, `titre`, `corps`, `donnees` (jsonb — identifiants pour la
navigation dans l'application), `lue`, `cree_le`. Index sur `(user_id, lue)`
pour le compteur de non-lues.

Les notifications sont **persistées avant** d'être poussées par socket : si le
client est hors ligne, il les retrouve au prochain lancement.

### `parametres` — configuration clé/valeur

`cle` (PK), `valeur` (jsonb). Clés utilisées :

| Clé | Type | Défaut | Rôle |
|---|---|---|---|
| `commission_pct` | nombre | `5` | commission plateforme |
| `versement_minimum` | nombre | `100` | fidélité à la promesse « petit à petit » |
| `delai_attente_minutes` | nombre | `10` | minuteur de la page d'attente |
| `numeros_depot` | objet | `{nita, amana, wave}` | numéros mobile money de la plateforme |

En base plutôt qu'en variables d'environnement : ces valeurs sont des **règles
de gestion** qui changent sans redéploiement, modifiables par le super-admin, et
chaque modification est tracée au journal d'audit.

### `contenus` — textes éditoriaux

`cle` (`cgu`, `confidentialite`, `faq`, `contact`), `titre`, `corps`, `maj_le`.
Les CGU sont modifiables sans publier une nouvelle version de l'application —
important quand les règles « à définir » seront arbitrées.

### `audit_journal`

`user_id` (nul = système), `action`, `cible_type`, `cible_id`, `details` (jsonb),
`cree_le`. Index sur `(action, cree_le)`.

Couvre les opérations sensibles exigées au §10 : validations, rejets,
remboursements, suspensions de comptes, modifications de paramètres et de
catalogue, campagnes, suppressions de compte.

---

## Invariants à préserver

Toute évolution du schéma doit maintenir ces propriétés. Elles sont vérifiées
par le test de bout en bout (`npm run smoke`).

1. **`achats.montant_verse` = somme des versements validés + ajustements.**
   Vérifiable à tout instant :

   ```sql
   SELECT a.id, a.montant_verse,
          COALESCE((SELECT SUM(montant_valide) FROM versements
                    WHERE achat_id = a.id AND statut = 'valide'), 0)
        + COALESCE((SELECT SUM(montant) FROM ajustements WHERE achat_id = a.id), 0) AS recalcule
   FROM achats a
   WHERE a.montant_verse <> ( /* la même expression */ );
   -- doit ne renvoyer aucune ligne
   ```

2. **Au plus un versement actif par achat** (index `versement_actif_unique`).
3. **Aucune transition d'état illégale** : les passages autorisés sont définis
   dans `TRANSITIONS` (`lib/versements.js`) et chaque transition est écrite
   dans `versement_transitions`.
4. **Un versement terminé (`valide`/`rejete`) n'est jamais modifié.**
5. **`prix_total` d'un achat ne change jamais** après création.

---

## Transactions et verrous

Les opérations financières s'exécutent dans une transaction (`tx()` de
`lib/db.js`) avec un verrou de ligne :

- `initierVersement` verrouille l'achat (`SELECT … FOR UPDATE`) avant de
  vérifier l'absence de versement actif, puis d'insérer ;
- `transitionner` verrouille le versement avant de vérifier la légalité de la
  transition — deux administrateurs qui valident le même versement au même
  instant ne peuvent pas le créditer deux fois ;
- `validerVersement` enchaîne transition, recalcul et bascule éventuelle de
  l'achat en `complete` **dans la même transaction** : soit tout réussit, soit
  rien n'est écrit.

## Migrations

`npm run db:migrer` applique `db/schema.sql`, écrit intégralement en
`CREATE … IF NOT EXISTS` : la commande est **idempotente** et sans effet sur une
base déjà à jour.

Le MVP n'a pas d'outil de migration incrémentale (pas de versionnage de schéma).
Avant la Phase 2, prévoir un outil de migration versionnée
(`node-pg-migrate` ou équivalent) : une fois des données réelles en production,
modifier une colonne ne pourra plus se faire par simple relecture du fichier.

## Sauvegardes

Voir `docs/exploitation.md`, section « Sauvegardes ». Le cahier des charges
prévoit des sauvegardes automatiques quotidiennes chiffrées (§9.1 et §10).
