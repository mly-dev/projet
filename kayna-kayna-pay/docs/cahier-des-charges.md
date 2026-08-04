# Kayna Kayna Pay — Cahier des charges fonctionnel et technique

> **KAYNA KAYNA PAY** — « Petit à petit, paye »
>
> Version 1.0 — Document de travail
>
> Niamey, Niger — Août 2026

## 1. Objet du document

Le présent cahier des charges décrit les exigences fonctionnelles et techniques de la plateforme Kayna Kayna Pay, première solution d'achat par paiement progressif au Niger. Il fait suite au document de présentation du projet et sert de référence pour la conception, le développement, les tests et la recette de la solution. Il s'adresse à l'équipe projet, aux développeurs et à tout partenaire technique impliqué dans la réalisation.

Le périmètre couvert comprend trois composantes : l'application mobile destinée aux clients, l'espace web destiné aux vendeurs partenaires, et l'espace web d'administration destiné à l'équipe Kayna Kayna Pay.

## 2. Rappel synthétique du projet

Kayna Kayna Pay permet à un client d'acheter un produit ou un service en effectuant des versements progressifs par mobile money (NITA, Amana, Wave), à son rythme, jusqu'à atteindre le prix total. Le produit est remis au client une fois le montant complété. Les prix affichés correspondent au prix du vendeur majoré d'une commission de 5 % constituant le revenu de la plateforme. Les frais de dépôt mobile money sont à la charge du client.

Les paiements ne passent pas par les API des opérateurs de mobile money : la plateforme intègre son propre système de versement avec validation manuelle par un administrateur. Ce choix, motivé par le coût et la complexité des API opérateurs, structure fortement le parcours de versement décrit au chapitre 5.

## 3. Acteurs et rôles

| Acteur | Rôle et droits |
|---|---|
| **Visiteur** | Consulte le catalogue et les fiches produits sans compte. Doit créer un compte pour démarrer un achat. |
| **Client** | Crée un compte, démarre des achats, effectue des versements, suit ses portefeuilles d'achat, reçoit des notifications, consulte son historique. |
| **Partenaire** | Vendeur ou institution disposant d'un espace dédié : ajoute et gère ses produits/services, suit les achats en cours et les commandes finalisées le concernant. |
| **Administrateur** | Équipe Kayna Kayna Pay : valide ou rejette les versements, gère les comptes clients et partenaires, modère le catalogue, supervise l'activité, consulte les tableaux de bord. |
| **Super-admin** | Gère les comptes administrateurs, les paramètres globaux de la plateforme (taux de commission, numéros de dépôt, contenus légaux). |

## 4. Exigences fonctionnelles — Application mobile (client)

### 4.1 Inscription et authentification

- Inscription par numéro de téléphone (identifiant principal, cohérent avec l'usage mobile money), nom complet et mot de passe ; vérification du numéro par code OTP envoyé par SMS.
- Connexion par numéro et mot de passe ; récupération de mot de passe par OTP.
- Acceptation obligatoire des conditions générales d'utilisation et de la politique de confidentialité à l'inscription (case à cocher, avec liens vers les textes).
- Profil : consultation et modification des informations personnelles, changement de mot de passe, déconnexion, suppression de compte.

### 4.2 Catalogue et recherche

- Page d'accueil : produits mis en avant, catégories, nouveautés, accès rapide aux achats en cours du client.
- Navigation par catégories (téléphonie, informatique, motos et véhicules, maison et cuisine, billets et transport, assurances, etc. — liste administrable).
- Recherche par mot-clé avec filtres : catégorie, fourchette de prix, partenaire.
- Fiche produit : photos, nom, description, prix affiché (prix partenaire + 5 %), nom du partenaire, et simulateur de rythme (« à 500 F par jour, vous terminez en X jours »).
- Bouton « Commencer à payer » déclenchant la création d'un achat en cours (portefeuille dédié au produit).

### 4.3 Achats en cours (portefeuilles)

- Un client peut avoir plusieurs achats en cours simultanément ; chaque achat dispose de son propre portefeuille cumulant les versements validés.
- Vue par achat : produit, montant total, montant versé, reste à payer, barre de progression, historique des versements (date, montant, référence, statut).
- Statuts d'un achat : en cours, complété (montant atteint), en préparation de livraison, livré/activé, annulé, remboursé.
- Demande d'annulation d'un achat en cours par le client, traitée selon les règles de gestion du chapitre 6.

### 4.4 Notifications

- Notifications en temps réel (socket) et notifications push : validation ou rejet d'un versement, achat complété, rappels d'encouragement au versement (« même 100 F aujourd'hui, c'est un pas de plus »), informations sur la livraison.
- Centre de notifications dans l'application avec historique ; possibilité de régler la fréquence des rappels.

### 4.5 Divers

- Pages consultables : conditions générales d'utilisation, politique de confidentialité, aide/FAQ, contact (téléphone, WhatsApp).
- Langue de l'interface : français au lancement ; architecture prévue pour l'ajout ultérieur de langues locales (zarma, haoussa).

## 5. Parcours de versement (cœur du système)

Le versement est l'opération critique de la plateforme. Le parcours ci-dessous est conçu pour être simple pour le client tout en garantissant la traçabilité de chaque franc versé, dans un contexte de validation manuelle.

### 5.1 Déroulé nominal

1. **Initiation** : depuis un achat en cours, le client appuie sur « Faire un versement » et saisit le montant qu'il souhaite verser.
2. **Instructions** : le client choisit son opérateur (NITA, Amana ou Wave). L'application affiche alors les instructions : le numéro de dépôt de la plateforme pour cet opérateur, le montant à déposer, et une référence unique de versement générée par le système (ex. KKP-4F7B2). Les frais de dépôt sont à la charge du client, ce qui est clairement indiqué.
3. **Dépôt** : le client effectue le dépôt depuis son application mobile money, en indiquant si possible la référence dans le motif du transfert, puis revient dans l'application et appuie sur « J'ai effectué le dépôt ».
4. **Attente** : l'application affiche une page d'attente avec un minuteur de 10 minutes. Le versement passe au statut « en attente de validation » et apparaît immédiatement dans la file de l'espace administrateur.
5. **Validation** : l'administrateur vérifie la réception du dépôt sur le compte mobile money de la plateforme (montant, numéro émetteur, référence) puis valide ou rejette le versement depuis son espace.
6. **Confirmation** : dès la validation, le client est notifié en temps réel (toast dans l'application + notification push), le portefeuille de l'achat est incrémenté et la barre de progression mise à jour. En cas de rejet, le client est notifié avec le motif et les instructions pour contacter le support.

### 5.2 Cas particuliers du parcours

- **Expiration du minuteur sans validation** : le versement passe au statut « en cours de vérification » et quitte la page d'attente, avec un message rassurant : le client n'a pas besoin de rester sur la page, il sera notifié dès la validation. Un dépôt réel ne doit jamais être perdu du fait de l'expiration du minuteur.
- **Dépôt reçu avec un montant différent du montant déclaré** : l'administrateur peut valider le versement pour le montant réellement reçu ; le client est notifié du montant crédité.
- **Dépôt reçu sans référence** : rapprochement manuel par l'administrateur via le numéro émetteur et le montant ; la référence est une aide, pas une condition bloquante.
- **Aucun dépôt trouvé** : statut « rejeté » avec motif ; le client peut relancer un nouveau versement ou contacter le support depuis l'application.
- **Anti-doublon** : un client ne peut avoir qu'un seul versement « en attente » à la fois et par achat, afin de simplifier le rapprochement.

### 5.3 Finalisation d'un achat

Lorsque le portefeuille atteint le montant total, l'achat passe au statut « complété » : le client est félicité par notification, le partenaire est notifié de la commande, et l'administrateur coordonne la remise du produit ou l'activation du service. Le client reçoit un récapitulatif complet valant preuve d'achat (produit, montant total, liste des versements).

## 6. Règles de gestion

| Règle | Description |
|---|---|
| **Prix affiché** | Prix partenaire + 5 % de commission plateforme, arrondi selon règle à définir. Le prix est figé au démarrage de l'achat et garanti jusqu'à son terme. |
| **Frais mobile money** | À la charge du client, affiché clairement avant chaque versement. |
| **Versement minimum** | Montant minimum par versement à définir (proposition : 100 F CFA), pour rester fidèle à la promesse « petit à petit ». |
| **Annulation par le client** | Le client peut demander l'annulation d'un achat en cours. Remboursement du montant versé, déduction faite de frais de gestion à définir (proposition : pourcentage plafonné), sous un délai annoncé. Règle à figer dans les CGU. |
| **Inactivité prolongée** | Après une durée sans versement à définir (proposition : 90 jours), relances automatiques puis prise de contact ; à terme, application de la procédure d'annulation. |
| **Produit indisponible** | Si le produit devient indisponible avant complétion : proposition d'un produit équivalent, report du solde sur un autre achat, ou remboursement intégral sans frais. Choix laissé au client. |
| **Défaillance partenaire** | Les fonds versés restent sous le contrôle de la plateforme jusqu'à la livraison ; en cas de défaillance du partenaire, le client est remboursé intégralement ou réorienté. Le partenaire n'est payé qu'à la livraison confirmée. |
| **Livraison** | Modalités de remise (retrait chez le partenaire, livraison, activation du service) définies par produit et affichées sur la fiche. |

Les valeurs marquées « à définir » devront être arrêtées avant la rédaction finale des conditions générales d'utilisation, dont elles constituent la substance.

## 7. Exigences fonctionnelles — Espace partenaire (web)

- Création de compte partenaire sur invitation/validation de l'administration (pas d'inscription libre : les partenaires sont vérifiés).
- Gestion du catalogue : ajout, modification, désactivation de produits et services (photos, description, prix partenaire, stock/disponibilité, modalités de remise). Chaque ajout ou modification de prix est soumis à validation admin avant publication.
- Tableau de bord : achats en cours sur ses produits (nombre, progression agrégée), commandes complétées à préparer, historique des ventes.
- Notifications : commande complétée, achat démarré sur un de ses produits.
- Profil partenaire : informations de l'enseigne, coordonnées, coordonnées de règlement.

## 8. Exigences fonctionnelles — Espace administrateur (web)

- **Validation des versements.** File de validation des versements en temps réel : liste des versements en attente avec montant déclaré, opérateur, référence, numéro du client, horodatage ; actions valider (avec montant réel) ou rejeter (avec motif). C'est l'écran de travail principal de l'équipe au quotidien.
- **Gestion des achats.** Vue de tous les achats avec filtres par statut ; traitement des achats complétés (coordination livraison), des demandes d'annulation et des remboursements.
- **Gestion des utilisateurs et du catalogue.** Recherche, consultation, suspension de comptes ; validation des comptes et des produits partenaires ; gestion des catégories.
- **Tableau de bord et statistiques.** Volumes de versements par jour/semaine/mois, montants collectés, achats complétés, commissions générées, partenaires les plus actifs, taux d'abandon.
- **Communication et paramètres.** Envoi de notifications ciblées ou globales (campagnes d'incitation au versement), gestion des contenus (FAQ, CGU, politique de confidentialité), paramètres (numéros de dépôt par opérateur, taux de commission, montants minimums).
- **Journal d'audit.** Toute action de validation, rejet, modification sensible est tracée (qui, quoi, quand) dans un journal consultable par le super-admin.

## 9. Architecture technique

### 9.1 Stack retenue

| Composant | Technologie |
|---|---|
| **Application mobile** | React Native (JavaScript, sans TypeScript), Android en priorité, iOS ensuite. Distribution via Google Play Store. |
| **Backend et API** | Next.js (API routes) servant l'API mobile ainsi que les espaces web partenaire et administrateur. |
| **Base de données** | Base relationnelle (proposition : PostgreSQL) — les versements et portefeuilles exigent des transactions et une intégrité forte. |
| **Temps réel** | Socket (proposition : Socket.io) pour la notification instantanée des validations côté client et l'alimentation en direct de la file admin. |
| **Notifications push** | Firebase Cloud Messaging (rappels et notifications hors application). |
| **SMS / OTP** | Passerelle SMS locale à sélectionner pour l'envoi des codes de vérification. |
| **Stockage médias** | Stockage objet (photos produits) avec redimensionnement pour limiter la consommation data des clients. |
| **Hébergement** | Hébergement cloud à définir selon budget ; sauvegardes automatiques quotidiennes de la base. |

### 9.2 Principes de conception

- **Intégrité financière** : chaque versement validé est une écriture comptable immuable ; le solde d'un portefeuille est toujours recalculable à partir de l'historique des versements. Aucune modification directe de solde n'est possible, y compris pour un administrateur (toute correction passe par une écriture d'ajustement tracée).
- **Machine à états du versement** : créé dès l'initiation, il évolue selon des transitions strictes (initié → en attente → validé / rejeté / en vérification) horodatées et journalisées.
- **API unique multi-clients** : l'API est conçue dès le départ pour servir plusieurs clients (mobile, web partenaire, web admin) avec une authentification par jetons et des droits par rôle.
- **Sobriété réseau** : l'application doit rester utilisable sur des connexions lentes et des téléphones d'entrée de gamme : écrans légers, images optimisées, consultation du catalogue et des portefeuilles possible avec mise en cache.

### 9.3 Évolutivité

Le système de versement manuel est conçu comme un module de paiement isolé derrière une interface unique. Le jour où l'intégration directe des API opérateurs (NITA, Amana, Wave) deviendra pertinente, elle remplacera le module manuel sans refonte du reste de la plateforme. De même, l'architecture doit permettre l'ajout de nouveaux pays, opérateurs et langues dans la perspective panafricaine du projet.

## 10. Sécurité et conformité

- Mots de passe hachés (bcrypt ou équivalent), communications chiffrées (HTTPS/TLS sur toutes les liaisons), jetons de session à durée limitée.
- Contrôle d'accès strict par rôle sur chaque route de l'API ; l'espace admin est inaccessible depuis l'application mobile et protégé par authentification renforcée (proposition : double facteur pour les administrateurs).
- Journal d'audit de toutes les opérations sensibles (validations, rejets, remboursements, modifications de paramètres).
- Limitation des tentatives de connexion et des demandes d'OTP (anti-abus) ; validation systématique des entrées côté serveur.
- Données personnelles : collecte minimale, politique de confidentialité conforme, droit de suppression du compte ; sauvegardes chiffrées.
- Conformité réglementaire : consultation juridique sur le statut de l'activité au regard de la réglementation BCEAO/UEMOA relative aux services de paiement et à la collecte de fonds, avant le lancement public. Les CGU et la politique de confidentialité seront rédigées en conséquence.

## 11. Livrables

- Application mobile Kayna Kayna Pay (Android, puis iOS) publiée sur les stores.
- Espace web partenaire et espace web administrateur.
- API backend documentée et base de données avec schéma documenté.
- Charte graphique appliquée (bleu Ecobank et blanc, logo, slogan).
- Conditions générales d'utilisation et politique de confidentialité intégrées.
- Documentation d'exploitation : procédure de validation des versements, gestion des litiges, sauvegardes.

## 12. Phasage indicatif

| Phase | Contenu |
|---|---|
| **Phase 0** | Cadrage : validation du présent cahier des charges, arbitrage des règles « à définir », consultation juridique, maquettes (UI/UX), identité visuelle finalisée. |
| **Phase 1 — MVP** | Développement du produit minimum viable : inscription/connexion, catalogue et recherche, démarrage d'achat, parcours de versement complet avec validation admin, notifications temps réel et push, espace admin (validation, gestion basique), CGU intégrées. Espace partenaire réduit (catalogue géré par l'admin au départ). |
| **Phase 2 — Pilote** | Lancement restreint avec un petit groupe de partenaires vérifiés et de clients pilotes ; observation des parcours réels, ajustements, rodage de la procédure de validation manuelle. |
| **Phase 3 — Lancement** | Ouverture publique, campagne de communication (terrain + digital), montée en charge des partenaires, espace partenaire complet en autonomie. |
| **Phase 4 — Croissance** | Langues locales, iOS, statistiques avancées, automatisation progressive des paiements (API opérateurs si pertinent), préparation de l'expansion régionale. |

## 13. Critères d'acceptation du MVP

- Un client peut créer un compte vérifié par OTP, trouver un produit, démarrer un achat et voir son portefeuille à zéro.
- Un client peut déclarer un versement, suivre la page d'attente, et voir son portefeuille crédité en temps réel après validation admin, avec notification.
- Un versement dont le minuteur expire n'est jamais perdu : il passe « en vérification » et peut être validé ensuite.
- Un administrateur voit chaque versement en attente apparaître en temps réel et peut le valider (montant réel) ou le rejeter (motif) en moins de trois actions.
- Lorsqu'un portefeuille atteint le montant total, l'achat passe « complété », le client et le partenaire sont notifiés, et un récapitulatif est disponible.
- Le solde de tout portefeuille correspond exactement à la somme de ses versements validés, vérifiable dans l'historique.
- Aucune route de l'API n'est accessible sans le rôle approprié ; les CGU sont acceptées à l'inscription.

La recette du MVP sera prononcée lorsque l'ensemble de ces critères sera démontré en conditions réelles avec de vrais dépôts mobile money de faible montant.
