# Kayna Kayna Pay — Journal de développement

Trace de ce qui a été produit, des décisions prises et de ce qui reste ouvert.
Objectif : qu'une personne arrivant sur le projet comprenne **pourquoi** le code
est ainsi, sans avoir à interroger celui qui l'a écrit.

---

## Chronologie

### Août 2026 — Documents fondateurs

Point de départ : deux documents Word fournis par le porteur du projet — le
document de présentation et le cahier des charges fonctionnel et technique v1.0.

Produit :

- conversion des deux documents en Markdown (`docs/presentation.md`,
  `docs/cahier-des-charges.md`), tableaux préservés pour les acteurs, règles de
  gestion, stack technique et phasage ;
- conservation des originaux Word dans `docs/originaux/` ;
- **pitch deck de 13 diapositives** (`pitch/`, PPTX modifiable + PDF), généré à
  partir du document de présentation, aux couleurs de la marque.

Décisions de conception du deck : bleu Ecobank dominant, barre de progression
comme motif visuel récurrent (écho au « petit à petit »), maquette d'écran de
l'application en diapositive 3 pour rendre le produit tangible. Les chiffres qui
y figurent (prix de la moto, exemple 100 000 → 105 000 F) sont **illustratifs et
signalés comme tels**.

### Août 2026 — MVP (Phase 1)

Développement du produit minimum viable défini au chapitre 12 du cahier des
charges : plateforme (API + espaces web) et application mobile.

Résultat : **20 critères d'acceptation sur 20** du chapitre 13 validés par un
test automatique de bout en bout.

### Août 2026 — Documentation

Production des livrables documentaires du chapitre 11 qui manquaient :
`api.md`, `schema-donnees.md`, `exploitation.md`, `backend.md`, et le présent
journal.

### Août 2026 — Identité visuelle et durcissement

**Logo et charte** (`identite/`) : création du logo — un anneau segmenté dont
chaque segment est un versement, les bleus déjà effectués, l'ambre celui du
jour, les clairs ce qu'il reste. Déclinaisons produites par script
(`generer-logo.js`) : icône d'application, icône adaptative Android, écran de
démarrage, favicon, versions pour fond clair et fond sombre. Charte graphique
documentée (couleurs, typographie, ton, usages à éviter), logo intégré à
l'application mobile et aux deux espaces web.

**Durcissement avant production**, trois chantiers :

- **Migrations versionnées** — `db/migrations/` et un exécuteur maison
  (`scripts/migrer.js`) : application unique, transactionnelle, empreinte
  enregistrée, refus des migrations modifiées après coup, reconnaissance
  automatique des bases antérieures.
- **Double authentification des administrateurs** (§10) — mot de passe puis code
  SMS. Le jeton délivré après le mot de passe porte `etape: "2fa"` et est rejeté
  par toutes les routes protégées et par le socket : les deux preuves sont
  nécessaires.
- **Cookie de session httpOnly** pour les espaces web — le jeton quitte
  `localStorage` pour un cookie `HttpOnly` + `SameSite=Strict` (+ `Secure` en
  production), inaccessible au JavaScript de la page. Vérifié en conditions
  réelles : `document.cookie` est vide dans le navigateur.

Le test de bout en bout passe de 20 à **25 critères**, tous verts.

---

## Ce qui a été construit

### Plateforme (`plateforme/`)

Next.js + PostgreSQL + Socket.io. 33 routes d'API, 6 pages web, ~650 lignes de
logique métier dans `lib/`.

| Bloc | Contenu |
|---|---|
| Authentification | Inscription par téléphone + OTP SMS, connexion, mot de passe oublié, profil, suppression de compte |
| Catalogue | Catégories, recherche multicritère, fiches produits — accessible sans compte (rôle visiteur) |
| Achats | Démarrage avec prix figé, portefeuilles multiples, historique, récapitulatif preuve d'achat, demande d'annulation |
| Versements | Machine à états complète, instructions de dépôt, anti-doublon, validation/rejet admin, minuteur de 10 min |
| Espace admin | File de validation temps réel, gestion des achats, catalogue, partenaires, utilisateurs, paramètres, campagnes, journal d'audit |
| Espace partenaire | Tableau de bord, produits, commandes (consultation) |
| Transverse | Notifications (base + socket + push), audit, limitation de débit, contrôle d'accès par rôle |

### Application mobile (`mobile/`)

Expo / React Native en JavaScript, 16 écrans : bienvenue, inscription, OTP,
connexion, mot de passe oublié, accueil, recherche, fiche produit avec
simulateur de rythme, mes achats, détail d'achat, les trois écrans du parcours
de versement, notifications, profil, contenus légaux.

### Outillage

`npm run db:migrer` (schéma idempotent), `npm run db:seed` (jeu de démonstration
complet : paramètres, contenus légaux, 6 catégories, 3 partenaires, 8 produits,
comptes de test), `npm run smoke` (test de bout en bout des critères d'acceptation).

---

## Décisions techniques et leurs raisons

Les décisions notables, avec ce qui les a motivées. Elles sont revisitables —
mais en connaissant le raisonnement d'origine.

### Le solde d'un portefeuille est dérivé, jamais incrémenté

`achats.montant_verse` est un cache recalculé depuis les écritures après chaque
opération. Aucune ligne de code ne fait `montant_verse + x`.

**Pourquoi** : le cahier des charges (§9.2) exige qu'un solde soit toujours
recalculable et qu'aucune modification directe ne soit possible. Bénéfice
concret : un solde corrompu est réparable en relançant le calcul, et le contrôle
d'intégrité tient en une requête SQL.

### L'anti-doublon est garanti par la base, pas par le code

```sql
CREATE UNIQUE INDEX versement_actif_unique
  ON versements (achat_id) WHERE statut IN ('initie', 'en_attente');
```

**Pourquoi** : une vérification en JavaScript seule laisserait passer deux
requêtes simultanées. L'index unique partiel rend le doublon **impossible**,
quelle que soit la concurrence.

### Le prix est copié dans l'achat, pas référencé

`achats.prix_total` est une copie figée de `produits.prix_affiche` au démarrage.

**Pourquoi** : la règle « prix garanti jusqu'au terme » (§6) devient
structurelle. Si un partenaire augmente son prix, les achats en cours ne bougent
pas — la promesse commerciale est tenue par le schéma, pas par la vigilance.

### Le montant validé est distinct du montant déclaré

Deux colonnes : `montant_declare` (ce que dit le client) et `montant_valide`
(ce que l'administrateur constate).

**Pourquoi** : le §5.2 prévoit explicitement le dépôt d'un montant différent.
Écraser la déclaration ferait perdre une information utile en cas de litige ;
les deux vérités doivent coexister.

### Les paramètres métier sont en base, pas dans l'environnement

Commission, versement minimum, numéros de dépôt, durée du minuteur vivent dans
la table `parametres`, modifiables par le super-admin.

**Pourquoi** : ce sont des **règles de gestion**, pas de la configuration
technique. Plusieurs sont encore « à définir » au cahier des charges : elles
changeront après arbitrage, sans redéploiement, et chaque changement est tracé.

### Le module de paiement est isolé derrière une interface

Toute la validation manuelle vit dans `lib/versements.js` ; la passerelle SMS et
le push sont des fournisseurs interchangeables.

**Pourquoi** : le §9.3 prévoit que l'intégration directe des API opérateurs
remplace un jour le module manuel « sans refonte du reste de la plateforme ».
La frontière est posée dès maintenant, tant qu'elle est facile à tenir.

### Un test d'intégration plutôt que des tests unitaires

`scripts/smoke.js` déroule le parcours réel contre la vraie base.

**Pourquoi** : les risques de ce système sont la concurrence, les transactions
et les états — précisément ce que des tests unitaires avec base simulée ne
voient pas. Les tests unitaires deviendront utiles quand la logique de calcul se
complexifiera (frais d'annulation, arrondis).

### Le deuxième facteur repose sur deux preuves, pas une

Après le mot de passe, le serveur délivre un jeton `etape: "2fa"` valable
10 minutes, exigé en plus du code SMS.

**Pourquoi** : sans lui, quelqu'un connaissant le seul numéro d'un
administrateur pourrait tenter de deviner le code à 6 chiffres. Avec lui, il
faut avoir déjà franchi l'étape mot de passe. La fonction
`verifierJetonSession()` refuse ce jeton partout ailleurs — c'est la pièce qui
empêche le premier facteur de valoir session à lui seul.

### Un exécuteur de migrations maison plutôt qu'un outil externe

**Pourquoi** : une centaine de lignes sans dépendance, qui font exactement ce
dont le projet a besoin (application unique, transaction, empreinte, baseline
d'une base existante). Ajouter une dépendance de migration aurait apporté des
fonctions inutilisées et une surface de mise à jour supplémentaire, pour un
schéma de treize tables.

### JavaScript sans TypeScript

**Pourquoi** : choix explicite du cahier des charges (§9.1) pour l'application
mobile ; la cohérence sur l'ensemble du projet a été retenue.

### Vocabulaire du domaine en français

`versements`, `achats`, `demarrerAchat`, `montant_verse`.

**Pourquoi** : le code parle la langue du cahier des charges, ce qui évite le
glissement de sens qu'introduit une traduction (« payment » ne dit pas la même
chose que « versement » dans ce modèle).

---

## Écarts assumés par rapport au cahier des charges

Signalés pour éviter qu'ils passent pour des oublis.

| Point du cahier des charges | Ce qui est fait | Raison |
|---|---|---|
| §7 — le partenaire gère son catalogue | Espace partenaire **en lecture seule** ; catalogue géré par l'admin | Conforme au phasage : « espace partenaire réduit, catalogue géré par l'admin au départ » (Phase 1) |
| §4.2 — photos des produits | Champ `photos` présent, **pas d'upload** | Stockage objet non branché ; sans impact sur le parcours de versement, cœur du MVP |
| §9.1 — notifications push FCM | Interface prête, **journalisation** au lieu d'envoi | Nécessite un projet Firebase et des jetons d'appareil |
| §9.1 — passerelle SMS locale | Fournisseur `console` en développement | La passerelle nigérienne reste à sélectionner et contractualiser |
| §10 — double authentification admin | **Implémentée** (mot de passe + code SMS) | — |
| §4.5 — langues locales | Français uniquement | Conforme : « français au lancement, architecture prévue pour l'ajout ultérieur » |

---

## Points de vigilance

### Les CGU en base sont des projets de texte

Le seed insère des projets de conditions générales et de politique de
confidentialité, explicitement marqués « PROJET DE TEXTE — à valider par un
conseil juridique avant publication ».

**Ils ne doivent pas être publiés en l'état.** La consultation juridique
BCEAO/UEMOA (§10) est un préalable au lancement public, et les règles « à
définir » du §6 constituent la substance de ces textes.

### Règles encore à arbitrer

| Règle | Proposition du cahier des charges | État |
|---|---|---|
| Versement minimum | 100 F CFA | **Appliqué** (paramétrable) |
| Frais d'annulation | pourcentage plafonné | **Non arrêté** — remboursement intégral en attendant |
| Délai d'inactivité | 90 jours | **Non implémenté** (relances automatiques à construire) |
| Règle d'arrondi du prix affiché | à définir | **Choix pris** : arrondi aux 5 F supérieurs — à confirmer |

L'arrondi aux 5 F supérieurs est une décision technique prise faute
d'arbitrage, motivée par la pratique des prix au Niger. Elle est isolée en un
seul endroit du code (`pages/api/admin/produits.js`) et modifiable sans effet de
bord.

### Le MVP n'a pas été exécuté sur un vrai téléphone

L'application mobile a été vérifiée syntaxiquement et toutes les routes qu'elle
consomme sont couvertes par le test de bout en bout, mais **aucun émulateur
Android n'était disponible** dans l'environnement de développement. Le premier
lancement réel reste à faire (`npx expo start` avec Expo Go).

### Recette du MVP

Le chapitre 13 précise que la recette sera prononcée « lorsque l'ensemble de ces
critères sera démontré **en conditions réelles avec de vrais dépôts mobile money
de faible montant** ». Les 20 critères passent en test automatique : c'est une
condition nécessaire, **pas la recette**. Celle-ci suppose la passerelle SMS
réelle, des numéros de dépôt de production et des dépôts authentiques.

---

## État des livrables du chapitre 11

| Livrable | État |
|---|---|
| Application mobile (Android puis iOS) | ✅ Développée — publication sur les stores à faire |
| Espace web partenaire et administrateur | ✅ Développés (partenaire en consultation) |
| API backend **documentée** | ✅ Code + [`api.md`](api.md) |
| Base de données avec **schéma documenté** | ✅ `db/schema.sql` + [`schema-donnees.md`](schema-donnees.md) |
| Charte graphique appliquée | ✅ Logo créé et intégré partout, charte documentée ([`identite/`](../identite/README.md)) |
| CGU et politique de confidentialité intégrées | 🔶 Intégrées mais **projets de texte non validés** |
| Documentation d'exploitation | ✅ [`exploitation.md`](exploitation.md) |

---

## Suite immédiate

1. **Lancer l'application mobile sur un vrai téléphone** — jamais fait, tout le
   reste en dépend.
2. Arbitrer les règles « à définir » (§6) — elles bloquent la rédaction finale des CGU.
3. Engager la consultation juridique BCEAO/UEMOA.
4. Sélectionner et brancher la passerelle SMS locale — elle conditionne
   désormais aussi la connexion des administrateurs.
5. Photos de produits (upload et affichage) — le manque fonctionnel le plus visible.
6. Déployer la plateforme (hébergement, HTTPS, sauvegardes testées).
7. Signer les premiers partenaires pilotes, pitch deck à l'appui.
8. Phase 2 : pilote restreint avec de vrais dépôts de faible montant.
