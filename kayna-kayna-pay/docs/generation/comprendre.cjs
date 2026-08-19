// Kayna Kayna Pay — Comprendre Kayna Kayna Pay.
// Le document de fond : ce que fait le produit, comment il est construit,
// pourquoi il est construit ainsi. Destiné à quelqu'un qui reprend le projet
// ou qui doit l'expliquer à d'autres.
const fs = require("fs");
const path = require("path");
const { Document, Packer } = require("docx");
const M = require("./mise-en-page.cjs");
const { C, P, Pm, H1, H2, H3, Puce, Etape, Cmd, Encadre, Tab, Espace, Couverture, Sommaire, sections } = M;

const LOGO = process.argv[3] || path.join(__dirname, "logo-couv.png");

const corps = [
  // ══════════════════════ SOMMAIRE ══════════════════════
  ...Sommaire([
    ["1", "Le projet en une phrase", "Ce que Kayna Kayna Pay fait, et pour qui"],
    ["2", "Le vocabulaire", "Les six mots qui reviennent partout"],
    ["3", "L'architecture", "Trois morceaux, une seule base de données"],
    ["4", "Le parcours du client", "De l'inscription à la remise du produit"],
    ["5", "Le versement, pièce par pièce", "La machine à états qui protège l'argent"],
    ["6", "Les trois règles d'or de l'argent", "Ce qui ne se négocie jamais"],
    ["7", "La base de données", "Les tables et ce qu'elles garantissent"],
    ["8", "La sécurité", "Mots de passe, jetons, double facteur, rôles"],
    ["9", "Comment on sait que ça marche", "Le test de bout en bout"],
    ["10", "Les pièges à connaître", "Les erreurs déjà commises, et leur correctif"],
    ["11", "Ce qui reste à faire", "La feuille de route après le MVP"],
    ["12", "Résumé en une page", "À relire avant une démonstration"],
  ]),

  // ══════════════════════ 1 ══════════════════════
  H1("1.  Le projet en une phrase"),
  Pm([
    { t: "Kayna Kayna Pay permet à quelqu'un d'" },
    { t: "acheter un bien en le payant petit à petit", b: true },
    { t: ", par mobile money, et de le recevoir une fois le montant complété." },
  ]),
  P(
    "Ce n'est pas du crédit : personne n'avance d'argent, personne ne s'endette. C'est l'inverse — on épargne d'abord, on reçoit ensuite. Le nom vient du zarma : « kayna kayna », petit à petit."
  ),
  Espace(120),
  Tab(
    ["Ce que ce n'est pas", "Ce que c'est"],
    [
      ["Du crédit à la consommation", "Une épargne affectée à un achat précis"],
      ["Un paiement en plusieurs fois après livraison", "Un paiement en plusieurs fois avant livraison"],
      ["Un portefeuille électronique", "Un compteur par achat, qui ne sert qu'à cet achat"],
      ["Un opérateur mobile money", "Un service qui s'appuie sur NITA, Amana et Wave"],
    ],
    [4680, 4680]
  ),
  Espace(220),
  Encadre("retenir", "Le modèle économique", [
    P(
      "Le partenaire fixe son prix. La plateforme ajoute 5 % de commission et affiche le total au client. Le client ne voit qu'un prix, celui qu'il paiera — rien ne s'ajoute à la fin.",
      { after: 60 }
    ),
    Pm(
      [
        { t: "Exemple : une moto à 640 000 F chez le vendeur est affichée " },
        { t: "672 000 F", b: true },
        { t: ". À la livraison, le vendeur touche ses 640 000 F, la plateforme garde 32 000 F." },
      ],
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 2 ══════════════════════
  H1("2.  Le vocabulaire"),
  P(
    "Six mots reviennent dans le code, dans les écrans et dans les conversations. Les confondre est la première source de malentendu ; ils sont donc employés partout avec le même sens."
  ),
  Espace(80),
  Tab(
    ["Mot", "Ce que ça désigne", "Ce que ça ne désigne pas"],
    [
      [
        { t: "Achat", b: true },
        "L'engagement d'un client sur un produit : le prix est figé à son ouverture.",
        "Une commande déjà payée.",
      ],
      [
        { t: "Portefeuille", b: true },
        "Le compteur d'un achat : la somme des versements validés pour cet achat.",
        "Un porte-monnaie électronique réutilisable.",
      ],
      [
        { t: "Versement", b: true },
        "Une tentative de dépôt : un montant, un opérateur, une référence unique.",
        "De l'argent reçu — tant qu'il n'est pas validé, rien n'est acquis.",
      ],
      [
        { t: "Écriture", b: true },
        "La ligne comptable créée quand un versement est validé.",
        "Un enregistrement modifiable.",
      ],
      [
        { t: "Référence", b: true },
        "Le code court que le client recopie dans le motif du transfert.",
        "Un numéro de compte.",
      ],
      [
        { t: "Partenaire", b: true },
        "Le vendeur dont les produits figurent au catalogue.",
        "Un actionnaire ou un apporteur d'argent.",
      ],
    ],
    [1500, 4200, 3660]
  ),
  Espace(200),
  Encadre("astuce", "Pourquoi la distinction versement / écriture compte", [
    P(
      "Un versement peut être rejeté ; une écriture, jamais. Le solde d'un portefeuille se recalcule toujours à partir des écritures, jamais à partir des versements. C'est cette séparation qui empêche un dépôt douteux de gonfler un compteur.",
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 3 ══════════════════════
  H1("3.  L'architecture"),
  P("Le projet tient en trois morceaux, et un seul détient la vérité."),
  Espace(80),
  Tab(
    ["Morceau", "Technologie", "Rôle"],
    [
      [
        { t: "L'application mobile", b: true },
        "Expo / React Native (JavaScript)",
        "Ce que le client a dans la main. Elle n'a aucune règle métier : elle affiche ce que le serveur lui dit.",
      ],
      [
        { t: "Les espaces web", b: true },
        "Next.js (pages)",
        "L'espace d'administration et l'espace partenaire, dans un navigateur.",
      ],
      [
        { t: "Le serveur", b: true },
        "Next.js (routes API) + Socket.io + PostgreSQL",
        "La seule autorité. Toutes les règles d'argent y sont, et nulle part ailleurs.",
      ],
    ],
    [2200, 2900, 4260]
  ),
  Espace(220),
  Encadre("retenir", "La règle qui structure tout le reste", [
    Pm(
      [
        { t: "Aucune règle métier ne vit dans l'application mobile." },
        { t: " Si demain quelqu'un modifie l'application pour s'attribuer 100 000 F, le serveur refusera : c'est lui qui calcule, valide et journalise. L'application n'est qu'une fenêtre." },
      ],
      { after: 0 }
    ),
  ]),
  Espace(160),
  H2("3.1  Le dossier, fichier par fichier"),
  P("Les emplacements à connaître avant de toucher quoi que ce soit :"),
  Espace(60),
  Tab(
    ["Chemin", "Ce qu'on y trouve"],
    [
      [{ t: "plateforme/lib/versements.js", m: true }, { t: "Le cœur. Machine à états, validation, recalcul du portefeuille. À lire en premier.", b: true }],
      [{ t: "plateforme/lib/auth.js", m: true }, "Jetons, mots de passe, cookies de session, double facteur."],
      [{ t: "plateforme/lib/db.js", m: true }, "Connexion PostgreSQL, transactions, paramètres de la plateforme."],
      [{ t: "plateforme/pages/api/", m: true }, "Une route = un fichier. Le nom du fichier est l'adresse."],
      [{ t: "plateforme/db/migrations/", m: true }, "Le schéma, en migrations numérotées et empreintées."],
      [{ t: "plateforme/scripts/smoke.js", m: true }, "Le test de bout en bout : 25 critères d'acceptation."],
      [{ t: "mobile/src/ecrans/", m: true }, "Un écran = un fichier."],
      [{ t: "mobile/src/composants/Base.js", m: true }, "La bibliothèque de composants de l'application."],
      [{ t: "mobile/src/theme.js", m: true }, "Couleurs, tailles, espacements : la source unique du design."],
    ],
    [3400, 5960]
  ),

  // ══════════════════════ 4 ══════════════════════
  H1("4.  Le parcours du client"),
  P(
    "Sept étapes, de l'inscription à la remise. Chacune correspond à un écran de l'application et à une route du serveur."
  ),
  Espace(80),
  Etape(1, [
    { t: "Inscription.", b: true },
    { t: " Numéro de téléphone, nom, mot de passe, acceptation des conditions. Un code à six chiffres arrive par SMS et vérifie le numéro. Sans cette vérification, aucun compte n'est actif." },
  ]),
  Etape(2, [
    { t: "Choix d'un produit.", b: true },
    { t: " Le catalogue affiche des prix commission comprise. La fiche produit propose un simulateur : « à tant par jour, vous terminez dans tant de temps »." },
  ]),
  Etape(3, [
    { t: "Ouverture de l'achat.", b: true },
    { t: " Le prix est figé à cet instant. Si la commission change ensuite, cet achat n'est pas touché." },
  ]),
  Etape(4, [
    { t: "Versement.", b: true },
    { t: " Le client choisit un montant (dès 100 F) et un opérateur. Le serveur lui renvoie un numéro de dépôt et une référence unique." },
  ]),
  Etape(5, [
    { t: "Dépôt réel.", b: true },
    { t: " Le client envoie l'argent par mobile money en indiquant la référence dans le motif, puis déclare le dépôt dans l'application." },
  ]),
  Etape(6, [
    { t: "Validation.", b: true },
    { t: " Un administrateur vérifie la réception sur le compte de la plateforme et valide au montant réellement reçu. Le portefeuille est crédité, le client est notifié en temps réel." },
  ]),
  Etape(7, [
    { t: "Remise.", b: true },
    { t: " Quand le portefeuille atteint le prix total, l'achat passe « complété ». La remise s'organise avec le partenaire, qui est réglé à la livraison confirmée." },
  ]),
  Espace(180),
  Encadre("attention", "Le point de friction principal", [
    P(
      "Entre l'étape 5 et l'étape 6, l'argent est parti du téléphone du client mais n'est pas encore inscrit à son portefeuille. C'est la minute où il doute. Tout est fait pour réduire cette angoisse : référence bien visible, minuteur de dix minutes, notification instantanée, et surtout la garantie qu'un dépôt réel n'est jamais perdu — au pire il passe « en vérification ».",
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 5 ══════════════════════
  H1("5.  Le versement, pièce par pièce"),
  P(
    "Le versement est la seule chose qui crée de l'argent dans le système. Il est donc traité comme une machine à états : cinq états, des transitions autorisées explicitement, et rien d'autre."
  ),
  Espace(100),
  Tab(
    ["État", "Ce qu'il signifie", "Peut aller vers"],
    [
      [
        { t: "initie", m: true, b: true },
        "Le client a demandé un versement. Aucune somme n'a bougé.",
        { t: "en_attente", m: true },
      ],
      [
        { t: "en_attente", m: true, b: true },
        "Le client déclare avoir déposé. L'équipe doit vérifier.",
        { t: "valide · rejete · en_verification", m: true },
      ],
      [
        { t: "en_verification", m: true, b: true },
        "Le minuteur de dix minutes a expiré sans décision.",
        { t: "valide · rejete", m: true },
      ],
      [
        { t: "valide", m: true, b: true },
        "Le dépôt est confirmé. Une écriture est créée.",
        { t: "— (définitif)", i: true },
      ],
      [
        { t: "rejete", m: true, b: true },
        "Le dépôt n'a pas été retrouvé. Un motif est obligatoire.",
        { t: "— (définitif)", i: true },
      ],
    ],
    [1900, 4400, 3060]
  ),
  Espace(220),
  H2("5.1  Ce qui se passe à la validation"),
  P(
    "La validation est une seule transaction de base de données. Soit tout réussit, soit rien ne change — il n'existe aucun état intermédiaire où l'argent serait à moitié inscrit :"
  ),
  Puce("le versement passe à « validé », avec le montant réellement reçu ;"),
  Puce("une écriture est ajoutée au portefeuille de l'achat ;"),
  Puce("le solde est recalculé à partir de toutes les écritures ;"),
  Puce("si le solde atteint le prix total, l'achat passe « complété » ;"),
  Puce("le client et, le cas échéant, le partenaire sont notifiés ;"),
  Puce("la transition est journalisée avec son auteur et l'heure."),
  Espace(180),
  Encadre("astuce", "Pourquoi le montant validé peut différer du montant déclaré", [
    P(
      "Le client déclare 1 000 F mais dépose 950 F : l'administrateur valide 950 F. Le portefeuille reflète l'argent réellement reçu, pas l'intention. C'est le seul écart toléré, et il est visible dans l'historique du client.",
      { after: 0 }
    ),
  ]),
  Espace(160),
  H2("5.2  Un seul versement ouvert à la fois"),
  Pm([
    { t: "Un achat ne peut pas avoir deux versements en cours. La règle n'est pas écrite dans le code applicatif mais " },
    { t: "dans la base de données", b: true },
    { t: ", sous forme d'index unique partiel :" },
  ]),
  Cmd("CREATE UNIQUE INDEX versement_actif_unique\n  ON versements (achat_id)\n  WHERE statut IN ('initie', 'en_attente');"),
  P(
    "Deux requêtes simultanées ne peuvent donc pas créer deux versements : la seconde est refusée par PostgreSQL lui-même. Une règle écrite seulement dans le code se contourne ; une contrainte de base, non."
  ),

  // ══════════════════════ 6 ══════════════════════
  H1("6.  Les trois règles d'or de l'argent"),
  P(
    "Trois principes gouvernent tout le code qui touche à l'argent. Ils ne se discutent pas et se vérifient à chaque relecture."
  ),
  Espace(120),
  Encadre("retenir", "Règle 1 — Ce qui est validé est définitif", [
    P(
      "Un versement validé ne peut être ni modifié, ni supprimé, par personne — pas même par le super-administrateur. Une erreur se corrige par une écriture de correction, jamais par une réécriture. L'historique reste vrai.",
      { after: 0 }
    ),
  ]),
  Espace(120),
  Encadre("retenir", "Règle 2 — Le solde se recalcule, il ne s'incrémente pas", [
    P(
      "Le portefeuille n'est jamais mis à jour par addition. Il est recalculé à partir de la somme des écritures validées. Un incrément raté laisserait un solde faux pour toujours ; un recalcul, non.",
      { after: 0 }
    ),
  ]),
  Espace(120),
  Encadre("retenir", "Règle 3 — Les interdits vivent dans la base", [
    P(
      "Unicité du versement actif, unicité des références, cohérence des montants : ce sont des contraintes PostgreSQL. Le code applicatif les rappelle pour donner un message clair, mais c'est la base qui refuse.",
      { after: 0 }
    ),
  ]),
  Espace(200),
  Encadre("attention", "Le test qui vérifie les trois règles à la fois", [
    Pm(
      [
        { t: "Le test de bout en bout compare, en fin de parcours, le solde du portefeuille à la somme des écritures validées. S'ils diffèrent d'un seul franc, le test échoue. C'est le filet de sécurité le plus important du projet." },
      ],
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 7 ══════════════════════
  H1("7.  La base de données"),
  P(
    "PostgreSQL, une douzaine de tables. Voici celles qu'il faut connaître pour comprendre le reste."
  ),
  Espace(80),
  Tab(
    ["Table", "Ce qu'elle contient", "Ce qu'elle garantit"],
    [
      [{ t: "users", m: true, b: true }, "Clients, administrateurs, partenaires — avec leur rôle.", "Un numéro de téléphone = un compte."],
      [{ t: "produits", m: true, b: true }, "Le catalogue : prix partenaire et prix affiché.", "Le prix affiché est figé à l'ouverture d'un achat."],
      [{ t: "achats", m: true, b: true }, "L'engagement d'un client sur un produit.", "Le prix total ne bouge plus."],
      [{ t: "versements", m: true, b: true }, "Les tentatives de dépôt et leur état.", "Un seul versement ouvert par achat ; référence unique."],
      [{ t: "ecritures", m: true, b: true }, "Les lignes comptables des versements validés.", "Jamais modifiées, jamais supprimées."],
      [{ t: "journal_versements", m: true, b: true }, "Chaque transition d'état, avec auteur et horodatage.", "On peut toujours reconstituer qui a fait quoi."],
      [{ t: "audit", m: true, b: true }, "Les actions sensibles hors versements.", "Traçabilité des changements de paramètres."],
      [{ t: "parametres", m: true, b: true }, "Commission, versement minimum, numéros de dépôt.", "Modifiable sans redéploiement."],
    ],
    [2100, 3900, 3360]
  ),
  Espace(200),
  H2("7.1  Les migrations"),
  P(
    "Le schéma n'est jamais modifié à la main. Chaque changement est un fichier numéroté dans db/migrations/, appliqué par un script qui garde l'empreinte SHA-256 de chaque migration déjà passée. Modifier une migration déjà appliquée est donc détecté, pas silencieusement ignoré."
  ),
  Cmd("npm run db:migrer     # applique les migrations manquantes\nnpm run verifier      # contrôle Node, dépendances, .env, base, schéma"),

  // ══════════════════════ 8 ══════════════════════
  H1("8.  La sécurité"),
  P("Cinq mécanismes, chacun répondant à une menace précise."),
  Espace(80),
  Tab(
    ["Mécanisme", "Contre quoi il protège"],
    [
      [
        { t: "Mots de passe hachés (bcrypt)", b: true },
        "Une fuite de la base ne livre aucun mot de passe en clair.",
      ],
      [
        { t: "Jetons signés (JWT)", b: true },
        "Un jeton fabriqué ou modifié est rejeté : la signature ne correspond plus.",
      ],
      [
        { t: "Double facteur des administrateurs", b: true },
        "Un mot de passe d'administrateur volé ne suffit pas : un code SMS est exigé, et le jeton intermédiaire n'ouvre aucune session.",
      ],
      [
        { t: "Cookie httpOnly + SameSite=Strict", b: true },
        "Le jeton des espaces web n'est pas lisible en JavaScript et ne part pas sur un site tiers.",
      ],
      [
        { t: "Contrôle de rôle sur chaque route", b: true },
        "Un client ne peut pas appeler une route d'administration, même en connaissant son adresse.",
      ],
    ],
    [3400, 5960]
  ),
  Espace(200),
  Encadre("attention", "Le détail qui fait la différence sur le double facteur", [
    Pm(
      [
        { t: "Après le mot de passe, le serveur renvoie un jeton portant la marque " },
        { t: "etape: \"2fa\"", m: true },
        { t: ". La fonction qui autorise les routes refuse tout jeton portant cette marque. Deux preuves sont donc réellement nécessaires : sans cela, le premier jeton aurait suffi à tout ouvrir." },
      ],
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 9 ══════════════════════
  H1("9.  Comment on sait que ça marche"),
  Pm([
    { t: "Une seule commande, " },
    { t: "npm run smoke", m: true, b: true },
    { t: ", rejoue le parcours complet contre un serveur réel et une base réelle, et vérifie 25 critères." },
  ]),
  Espace(80),
  Tab(
    ["Famille", "Exemples de critères vérifiés"],
    [
      ["Inscription et connexion", "Les conditions d'utilisation sont obligatoires ; le numéro est vérifié par SMS."],
      ["Double facteur", "Le mot de passe seul n'ouvre aucune session ; le jeton intermédiaire non plus ; un mauvais code est refusé."],
      ["Versements", "Instructions complètes ; un seul versement actif ; validation au montant réel ; rejet motivé obligatoire."],
      ["Temps réel", "L'administrateur voit le versement arriver ; le client est notifié de la décision."],
      ["Minuteur", "Un versement expiré passe « en vérification » et reste validable."],
      ["Comptabilité", "Le solde égale exactement la somme des écritures validées."],
      ["Habilitations", "Aucune route n'est accessible sans le rôle approprié."],
      ["Traçabilité", "Chaque transition d'état est journalisée."],
    ],
    [2600, 6760]
  ),
  Espace(200),
  Encadre("astuce", "Ce que ce test ne remplace pas", [
    P(
      "Il vérifie les règles, pas l'expérience. Le rendu des écrans, la lisibilité d'un message d'erreur ou la clarté d'une référence de dépôt se contrôlent à l'œil, sur un vrai téléphone.",
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 10 ══════════════════════
  H1("10.  Les pièges à connaître"),
  P(
    "Ces erreurs ont réellement été commises pendant la construction du projet. Elles sont listées ici pour ne pas être refaites."
  ),
  Espace(80),
  Tab(
    ["Le piège", "Ce qui se passe", "Le correctif"],
    [
      [
        { t: "Incrémenter le solde", b: true },
        "Un incrément raté laisse un portefeuille faux pour toujours.",
        "Recalculer depuis les écritures, à chaque fois.",
      ],
      [
        { t: "Faire confiance au montant déclaré", b: true },
        "Le client déclare 5 000 F et dépose 500 F.",
        "L'administrateur valide au montant réellement reçu.",
      ],
      [
        { t: "Écrire la commission en dur", b: true },
        "Le catalogue et l'API finissent par afficher deux prix différents.",
        "Une seule source : le paramètre en base.",
      ],
      [
        { t: "Remplacer le thème de navigation", b: true },
        "L'application plante au démarrage : la barre d'onglets perd sa table de polices.",
        "Compléter le thème par défaut, ne jamais le remplacer.",
      ],
      [
        { t: "Perdre le numéro de dépôt à la reprise", b: true },
        "Un client qui revient sur un versement initié ne sait plus où envoyer l'argent.",
        "La consultation d'un versement renvoie aussi ses instructions.",
      ],
      [
        { t: "Un message d'erreur vide", b: true },
        "« Migration interrompue — » ne dit rien de ce qui manque.",
        "Diagnostiquer le code d'erreur et donner la commande de réparation.",
      ],
    ],
    [2700, 3600, 3060]
  ),

  // ══════════════════════ 11 ══════════════════════
  H1("11.  Ce qui reste à faire"),
  P(
    "Le MVP couvre le parcours complet. Voici ce qui viendra ensuite, par ordre d'importance."
  ),
  Espace(80),
  Tab(
    ["Chantier", "Pourquoi", "Ordre de grandeur"],
    [
      [
        { t: "Passerelle SMS réelle", b: true },
        "Les codes s'affichent aujourd'hui dans les journaux du serveur : suffisant en développement, impossible en production.",
        "Quelques jours",
      ],
      [
        { t: "Rapprochement automatique", b: true },
        "La validation est manuelle. Un relevé opérateur permettrait de pré-valider les dépôts qui correspondent.",
        "Quelques semaines",
      ],
      [
        { t: "Gestion autonome du catalogue", b: true },
        "Les partenaires consultent leurs produits mais ne les modifient pas encore.",
        "Quelques semaines",
      ],
      [
        { t: "Notifications push", b: true },
        "Aujourd'hui le temps réel ne fonctionne que si l'application est ouverte.",
        "Quelques jours",
      ],
      [
        { t: "Stockage partagé des limites", b: true },
        "L'anti-abus est en mémoire : il ne tient pas sur plusieurs serveurs.",
        "Une journée",
      ],
    ],
    [2600, 4560, 2200]
  ),

  // ══════════════════════ 12 ══════════════════════
  H1("12.  Résumé en une page"),
  P("À relire avant une démonstration ou une reprise du projet."),
  Espace(120),
  Encadre("info", "Le produit", [
    P("Épargner petit à petit par mobile money pour recevoir un bien. Ni crédit, ni dette. Commission de 5 % déjà comprise dans le prix affiché.", { after: 0 }),
  ]),
  Espace(120),
  Encadre("info", "L'architecture", [
    P("Une application mobile Expo, deux espaces web Next.js, un serveur Next.js + Socket.io, une base PostgreSQL. Toutes les règles d'argent sont sur le serveur.", { after: 0 }),
  ]),
  Espace(120),
  Encadre("info", "Le cœur", [
    P("Le versement : cinq états, des transitions explicites, une validation en une seule transaction, un journal de chaque changement.", { after: 0 }),
  ]),
  Espace(120),
  Encadre("info", "Les garde-fous", [
    P("Ce qui est validé est définitif. Le solde se recalcule depuis les écritures. Les interdits sont des contraintes de base de données.", { after: 0 }),
  ]),
  Espace(120),
  Encadre("info", "La preuve", [
    Pm(
      [
        { t: "npm run smoke", m: true, b: true },
        { t: " : 25 critères d'acceptation rejoués contre un serveur et une base réels." },
      ],
      { after: 0 }
    ),
  ]),
  Espace(260),
  Pm(
    [{ t: "« Kayan si djineh koy yan gandji » — faire petit n'empêche pas d'avancer.", i: true, c: C.gris }],
    { size: 19, align: "center" }
  ),
];

const doc = new Document({
  creator: "Kayna Kayna Pay",
  title: "Comprendre Kayna Kayna Pay",
  description: "Ce que fait Kayna Kayna Pay, comment c'est construit et pourquoi.",
  styles: { default: { document: { run: { font: M.TEXTE, size: M.T.corps } } } },
  numbering: { config: [] },
  sections: sections({
    titreDoc: "Comprendre Kayna Kayna Pay",
    couverture: Couverture({
      logo: LOGO,
      titre: "Comprendre Kayna Kayna Pay",
      sousTitre: "Le produit, son fonctionnement et ses garde-fous",
      description:
        "Ce document explique ce que fait Kayna Kayna Pay, comment la plateforme est construite et pourquoi elle est construite ainsi. Il s'adresse à qui doit reprendre le projet, l'expliquer, ou décider de son avenir.",
      meta: [
        ["Public", "Équipe technique, direction, partenaires"],
        ["Version", "1.0 — août 2026"],
        ["Complément", "Guide d'utilisation · L'essentiel"],
      ],
    }),
    corps,
  }),
});

Packer.toBuffer(doc).then((buf) => {
  const sortie = process.argv[2] || "Comprendre_Kayna_Kayna_Pay.docx";
  fs.writeFileSync(sortie, buf);
  console.log("écrit :", sortie);
});
