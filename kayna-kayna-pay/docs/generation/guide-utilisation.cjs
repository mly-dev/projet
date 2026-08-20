// Kayna Kayna Pay — Guide d'utilisation.
// Comment se servir du produit au quotidien, pour les trois publics.
const fs = require("fs");
const path = require("path");
const { Document, Packer } = require("docx");
const M = require("./mise-en-page.cjs");
const { C, P, Pm, H1, H2, H3, Puce, Etape, Cmd, Encadre, Tab, Espace, Couverture, Sommaire, sections } = M;

const LOGO = process.argv[3] || path.join(__dirname, "logo-couv.png");

const corps = [
  // ══════════════════════ SOMMAIRE ══════════════════════
  ...Sommaire([
    ["1", "À qui s'adresse ce guide", "Trois publics, trois parties"],
    ["2", "Le client — l'application mobile", "Créer un compte, acheter, verser, suivre"],
    ["3", "L'équipe — l'espace d'administration", "Valider les versements, gérer achats et catalogue"],
    ["4", "Le partenaire — l'espace vendeur", "Suivre ses produits et ses commandes"],
    ["5", "Questions fréquentes", "Ce que demandent les clients, et quoi répondre"],
    ["6", "Qui fait quoi", "Tableau récapitulatif des rôles"],
  ]),

  // ══════════════════════ 1. PUBLICS ══════════════════════
  H1("1.  À qui s'adresse ce guide"),
  P(
    "Kayna Kayna Pay met en relation trois publics. Chacun voit une interface différente et n'a accès qu'à ce qui le concerne. Ce guide traite les trois séparément : allez directement à la partie qui vous concerne."
  ),
  Espace(60),
  Tab(
    ["Vous êtes…", "Vous utilisez…", "Lisez la partie"],
    [
      [{ t: "Un client", b: true }, "L'application mobile, sur votre téléphone", { t: "2", b: true, c: C.bleu }],
      [{ t: "L'équipe Kayna Kayna Pay", b: true }, "L'espace d'administration, dans un navigateur", { t: "3", b: true, c: C.bleu }],
      [{ t: "Un vendeur partenaire", b: true }, "L'espace partenaire, dans un navigateur", { t: "4", b: true, c: C.bleu }],
    ],
    [2500, 4700, 2160]
  ),
  Espace(220),
  Encadre("info", "Le principe, en une phrase", [
    P(
      "Le client verse petit à petit sur le compte de la plateforme. L'argent y reste jusqu'à la livraison. Une fois le montant total atteint, le produit est remis et le vendeur est payé.",
      { after: 60 }
    ),
    P(
      "C'est ce qui protège tout le monde : le client est sûr de recevoir, le vendeur est sûr d'être payé.",
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 2. CLIENT ══════════════════════
  H1("2.  Le client — l'application mobile"),
  P(
    "L'application se télécharge sur le téléphone. Tout s'y fait : choisir un produit, verser, suivre son avancement, recevoir son achat."
  ),

  H2("2.1  Créer son compte"),
  Etape(1, "Ouvrir l'application, appuyer sur « Créer mon compte »."),
  Etape(2, [
    { t: "Saisir son " },
    { t: "numéro de téléphone", b: true },
    { t: " — c'est l'identifiant du compte, celui-là même qui servira au mobile money. Puis son nom complet et un mot de passe d'au moins 6 caractères." },
  ]),
  Etape(3, [
    { t: "Cocher l'acceptation des " },
    { t: "conditions générales d'utilisation", b: true },
    { t: " et de la politique de confidentialité. Les deux textes sont consultables d'un appui. Sans cette case, l'inscription est refusée." },
  ]),
  Etape(4, "Un code à 6 chiffres arrive par SMS. Le saisir dans l'application."),
  Etape(5, "Le compte est actif. Le client arrive sur l'accueil.", { after: 40 }),
  Espace(80),
  Encadre("astuce", "Si le code n'arrive pas", [
    P(
      "Vérifier que le numéro saisi est le bon. Le code vaut 10 minutes et ne sert qu'une fois : passé ce délai, il faut recommencer l'inscription pour en recevoir un nouveau.",
      { after: 0 }
    ),
  ]),

  H2("2.2  Trouver un produit"),
  P("Trois chemins mènent au catalogue depuis l'accueil :"),
  Puce([{ t: "La barre de recherche", b: true }, { t: " — par mot-clé : « moto », « téléphone », « réfrigérateur »." }]),
  Puce([{ t: "Les catégories", b: true }, { t: " — téléphonie, informatique, motos et véhicules, maison et cuisine, billets et transport, assurances." }]),
  Puce([{ t: "Les produits mis en avant", b: true }, { t: " — une sélection présentée sur l'accueil." }]),
  Espace(60),
  P(
    "La fiche d'un produit affiche ses photos, sa description, le nom du vendeur, les modalités de remise et le prix. Ce prix est celui que paiera le client, commission comprise : il n'y a aucun frais caché."
  ),

  H3("Le simulateur de rythme"),
  P(
    "Sur chaque fiche, le client saisit ce qu'il pense pouvoir verser par jour, et l'application lui répond immédiatement : « à 2 000 F par jour, vous terminez en 336 jours ». Cela l'aide à choisir un produit à sa portée avant de s'engager."
  ),

  H2("2.3  Démarrer un achat"),
  P(
    "Un appui sur « Commencer à payer » ouvre un portefeuille dédié à ce produit, à 0 F. Rien n'est prélevé à cet instant : c'est simplement un objectif qui s'ouvre."
  ),
  Espace(60),
  Encadre("retenir", "Deux garanties dès l'ouverture", [
    Puce([{ t: "Le prix est figé.", b: true }, { t: " Même si le vendeur augmente son prix demain, l'achat en cours conserve le prix du jour de son ouverture, jusqu'à son terme." }], { after: 40 }),
    Puce([{ t: "Aucun engagement.", b: true }, { t: " Ni montant ni fréquence imposés. Le client verse quand il veut, ce qu'il veut, dès 100 F." }], { after: 0 }),
  ]),
  Espace(140),
  P(
    "Un client peut mener plusieurs achats en parallèle. Chacun a son propre portefeuille : l'argent d'un achat n'est jamais mélangé à celui d'un autre."
  ),

  H2("2.4  Faire un versement"),
  P("C'est l'opération la plus fréquente. Elle se déroule en trois écrans."),

  H3("Écran 1 — le montant"),
  P(
    "Le client saisit ce qu'il veut verser, ou touche un montant suggéré (100 F, 500 F, 1 000 F, 2 500 F, 5 000 F, 10 000 F). Puis il choisit son opérateur : NITA, Amana ou Wave."
  ),

  H3("Écran 2 — les instructions de dépôt"),
  P("L'application affiche alors trois informations, à utiliser dans son application mobile money :"),
  Espace(40),
  Tab(
    ["Information", "À quoi elle sert"],
    [
      [{ t: "Le numéro de dépôt", b: true }, "Le compte de Kayna Kayna Pay chez l'opérateur choisi. C'est le destinataire du transfert."],
      [{ t: "Le montant", b: true }, "La somme à envoyer, telle que déclarée."],
      [{ t: "La référence", b: true }, "Un code du type KKP-4F7B2, à recopier dans le motif du transfert. Elle permet de retrouver le dépôt rapidement."],
    ],
    [2500, 6860]
  ),
  Espace(180),
  Encadre("attention", "La référence aide, elle n'est pas obligatoire", [
    P(
      "Si le client oublie de la saisir, le versement sera quand même retrouvé grâce à son numéro et au montant. Un versement n'est jamais rejeté au seul motif que la référence manque.",
      { after: 60 }
    ),
    P("Les frais de dépôt mobile money restent à la charge du client, comme pour tout transfert.", { after: 0 }),
  ]),
  Espace(140),
  P("Le client fait alors son dépôt réel depuis son application mobile money, puis revient et appuie sur « J'ai effectué le dépôt »."),

  H3("Écran 3 — l'attente"),
  P(
    "Un minuteur de 10 minutes s'affiche pendant que l'équipe vérifie la réception. Dès la validation, l'écran bascule tout seul : « Versement validé », et le portefeuille est crédité."
  ),
  Espace(60),
  Encadre("retenir", "Si le minuteur expire", [
    P(
      "Rien n'est perdu. Le versement passe simplement « en vérification » et le client reçoit un message le lui disant. Il peut fermer l'application : il sera notifié dès que l'équipe aura validé, même une heure plus tard.",
      { after: 0 }
    ),
  ]),

  H2("2.5  Suivre ses achats"),
  P(
    "L'onglet « Mes achats » liste tous les achats avec leur barre de progression. En ouvrant l'un d'eux, le client voit le montant versé, ce qu'il reste à payer, et l'historique complet de ses versements — date, montant, opérateur, statut."
  ),
  Espace(60),
  P("Chaque versement porte l'un de ces états :"),
  Espace(40),
  Tab(
    ["État", "Ce que ça veut dire"],
    [
      [{ t: "En attente", b: true, c: C.ambreTexte }, "Le dépôt est déclaré, l'équipe le vérifie."],
      [{ t: "En vérification", b: true, c: C.ambreTexte }, "La vérification prend plus de temps que prévu. Le versement n'est pas perdu."],
      [{ t: "Validé", b: true, c: C.vert }, "L'argent est crédité au portefeuille."],
      [{ t: "Rejeté", b: true, c: C.rouge }, "Le dépôt n'a pas été retrouvé. Le motif est affiché ; le client peut relancer."],
    ],
    [2200, 7160]
  ),
  Espace(200),
  P(
    "Quand le montant total est atteint, l'achat passe « complété ». Le client est félicité, le vendeur est prévenu, et l'équipe organise la remise. Un récapitulatif complet reste consultable : il vaut preuve d'achat."
  ),

  H2("2.6  Annuler un achat"),
  P(
    "Depuis le détail d'un achat en cours, le client peut demander une annulation. La demande est traitée par l'équipe, qui le recontacte. Le montant déjà versé lui est remboursé selon les règles des conditions générales."
  ),

  H2("2.7  Notifications, profil et aide"),
  P(
    "Dès qu'un versement est validé ou rejeté, un bandeau descend en haut de l'écran, quel que soit l'endroit où se trouve le client dans l'application. Il indique le montant et le total atteint, disparaît seul au bout de quelques secondes, et ouvre l'achat concerné si on appuie dessus. Les chiffres affichés se mettent à jour au même instant.",
    { after: 60 }
  ),
  Encadre("attention", "Ce que le client ne reçoit pas encore", [
    P(
      "Tout cela suppose l'application ouverte. Application fermée, le client n'apprend rien : les notifications qui atteignent un téléphone en veille demandent une passerelle qui reste à mettre en place. Le client retrouve tout à sa prochaine ouverture — rien n'est perdu, seulement différé.",
      { after: 0 }
    ),
  ]),
  Espace(140),
  Puce([{ t: "Notifications", b: true }, { t: " — l'onglet regroupe tout l'historique : versements validés ou rejetés, achats complétés, informations de livraison, rappels d'encouragement. Une pastille rouge sur l'onglet compte ce qui n'a pas été lu." }]),
  Puce([{ t: "Profil", b: true }, { t: " — modifier son mot de passe, consulter les conditions générales, la politique de confidentialité, l'aide et le contact, se déconnecter ou supprimer son compte." }]),

  // ══════════════════════ 3. ADMIN ══════════════════════
  H1("3.  L'équipe — l'espace d'administration"),
  P(
    "C'est l'outil de travail quotidien de l'équipe Kayna Kayna Pay. Il s'ouvre dans un navigateur, à l'adresse de la plateforme."
  ),

  H2("3.1  Se connecter"),
  P(
    "Une fois connecté, le temps réel vaut sur toutes les pages : un versement déclaré fait apparaître un bandeau et incrémente le compteur de la « File de validation », que vous soyez sur le catalogue, les achats ou les paramètres. Un voyant en bas de la barre latérale indique si la liaison est active — une file figée par une coupure réseau se lit autrement comme une file vide.",
    { after: 140 }
  ),
  P("La connexion se fait en deux temps, parce qu'un compte d'administration donne accès à l'argent des clients."),
  Etape(1, "Saisir son numéro de téléphone et son mot de passe."),
  Etape(2, [
    { t: "Saisir le " },
    { t: "code à 6 chiffres reçu par SMS", b: true },
    { t: ". Il vaut 10 minutes et ne sert qu'une fois." },
  ], { after: 40 }),
  Espace(80),
  Encadre("attention", "Trois règles à ne pas contourner", [
    Puce([{ t: "Un compte par personne.", b: true }, { t: " Jamais de compte partagé : le journal d'audit ne vaut que si « qui » désigne quelqu'un." }], { after: 40 }),
    Puce([{ t: "Le numéro doit être accessible.", b: true }, { t: " C'est lui qui reçoit le code de connexion." }], { after: 40 }),
    Puce([{ t: "Un départ, une suspension.", b: true }, { t: " Le compte d'une personne qui quitte l'équipe est suspendu le jour même." }], { after: 0 }),
  ]),

  H2("3.2  La file de validation — l'écran principal"),
  P(
    "C'est là que se passe l'essentiel du travail. Chaque versement déclaré par un client y apparaît tout seul, sans rafraîchir la page. Quatre onglets : en attente, en vérification, validés, rejetés."
  ),
  Espace(60),
  P("Pour chaque ligne, l'équipe voit le nom et le numéro du client, le produit, l'opérateur, le montant déclaré et l'heure de la déclaration."),

  H3("La procédure, pas à pas"),
  Etape(1, "Lire la ligne : montant, opérateur, référence, numéro du client."),
  Etape(2, [
    { t: "Ouvrir l'" },
    { t: "application mobile money de la plateforme", b: true },
    { t: " correspondant à l'opérateur choisi, et chercher le dépôt en croisant trois éléments : le montant, le numéro émetteur, et la référence si elle a été saisie." },
  ]),
  Etape(3, "Décider — valider, ou rejeter avec un motif.", { after: 40 }),
  Espace(100),
  Tab(
    ["Ce que vous constatez", "Ce que vous faites"],
    [
      ["Le dépôt est là, montant identique", [{ t: "Valider", b: true, c: C.vert }, { t: " en laissant le montant proposé." }]],
      ["Le dépôt est là, montant différent", [{ t: "Valider", b: true, c: C.vert }, { t: " en saisissant le " }, { t: "montant réellement reçu", b: true }, { t: ". C'est ce montant qui est crédité." }]],
      ["Aucun dépôt trouvé", "Attendre — voir ci-dessous — puis rejeter avec un motif clair."],
      ["Doute sur l'émetteur", "Appeler le client avant toute décision."],
    ],
    [3400, 5960]
  ),
  Espace(200),
  Encadre("attention", "Combien de temps attendre avant de rejeter", [
    P("Un dépôt mobile money peut mettre plusieurs minutes à apparaître. Ne jamais rejeter dans les 15 premières minutes.", { after: 60 }),
    P("Si le dépôt reste introuvable : laisser le versement passer « en vérification », le revoir au passage suivant, appeler le client après 24 h, et ne rejeter qu'ensuite.", { after: 60 }),
    Pm([
      { t: "Règle d'or : ", b: true },
      { t: "un dépôt réellement effectué ne doit jamais être perdu." },
    ], { after: 0 }),
  ]),

  H3("Rédiger un motif de rejet"),
  P("Le motif est lu par le client dans sa notification. Il doit lui dire quoi faire, sans le braquer."),
  Espace(40),
  Tab(
    ["À écrire", "À éviter"],
    [
      [
        [{ t: "« Aucun dépôt reçu à ce numéro. Vérifiez que le transfert est bien parti, puis relancez. »", c: C.vert }],
        [{ t: "« rien »", c: C.rouge }],
      ],
      [
        [{ t: "« Dépôt introuvable pour ce montant. Contactez-nous au 90 00 00 00 avec votre reçu. »", c: C.vert }],
        [{ t: "« faux » · « erreur »", c: C.rouge }],
      ],
    ],
    [5800, 3560]
  ),
  Espace(200),
  Encadre("astuce", "L'onglet « en vérification » se vide chaque jour", [
    P(
      "Ce sont les versements dont le minuteur a expiré sans décision. C'est là que se logent les dépôts tardifs et les rapprochements difficiles. À traiter au moins une fois par jour.",
      { after: 0 }
    ),
  ]),

  H2("3.3  Gérer les achats et les livraisons"),
  P("L'onglet « Achats » suit chaque achat de son ouverture à sa livraison, avec des filtres par état."),
  Espace(40),
  Tab(
    ["État", "Ce que fait l'équipe"],
    [
      [{ t: "En cours", b: true }, "Rien — le client verse à son rythme."],
      [{ t: "Complété", b: true, c: C.vert }, "Contacter le partenaire, organiser la remise, puis marquer « en préparation »."],
      [{ t: "En préparation", b: true }, "Suivre la remise, puis marquer « livré » une fois le produit remis."],
      [{ t: "Demande d'annulation", b: true, c: C.rouge }, "Appeler le client, puis annuler et rembourser si confirmé."],
    ],
    [2900, 6460]
  ),
  Espace(200),
  Encadre("attention", "Le remboursement", [
    P(
      "Il s'enregistre par une écriture d'ajustement, motivée et signée — jamais par une modification directe du solde. L'historique reste ainsi complet et vérifiable.",
      { after: 60 }
    ),
    Pm([
      { t: "Tant que le taux de frais d'annulation n'est pas fixé et écrit dans les conditions générales, ", },
      { t: "rembourser intégralement", b: true },
      { t: " : prélever des frais non annoncés serait déloyal et juridiquement fragile." },
    ], { after: 0 }),
  ]),

  H2("3.4  Le catalogue et les partenaires"),
  P(
    "L'onglet « Catalogue » sert à créer les produits, les activer ou les désactiver, les mettre en avant, gérer les catégories et enregistrer les partenaires."
  ),
  Espace(60),
  Encadre("info", "Le prix affiché se calcule tout seul", [
    P(
      "L'équipe ne saisit que le prix du vendeur. La plateforme y ajoute la commission et arrondit aux 5 F supérieurs. Un produit à 640 000 F chez le vendeur sera affiché 672 000 F.",
      { after: 60 }
    ),
    P("Cela évite toute erreur de calcul, et garantit que la règle est appliquée de la même façon partout.", { after: 0 }),
  ]),
  Espace(140),
  H3("Les photos d'un produit"),
  P(
    "Chaque ligne du catalogue porte une vignette à gauche. Cliquez dessus — ou sur le bouton « Photos » — pour ouvrir la gestion des images."
  ),
  Etape(1, "Glissez une photo dans le cadre, ou cliquez pour la choisir sur l'ordinateur."),
  Etape(2, [
    { t: "Elle est " },
    { t: "réduite automatiquement", b: true },
    { t: " : n'hésitez pas à envoyer la photo telle qu'elle sort de l'appareil, même très lourde." },
  ]),
  Etape(3, "La première photo de la liste est celle qui s'affiche partout. Pour en changer, cliquez « Mettre en tête » sur une autre."),
  Etape(4, "Cinq photos au maximum par produit. « Retirer » en supprime une définitivement."),
  Espace(100),
  Encadre("astuce", "Pourquoi les photos sont réduites", [
    P(
      "Vos clients consultent le catalogue sur un forfait payé au mégaoctet, souvent en 3G. Une photo de téléphone pèse plusieurs mégaoctets ; vingt d'entre elles et la consultation coûterait plus cher que le produit. La plateforme en conserve deux versions allégées et jette l'originale.",
      { after: 60 }
    ),
    P(
      "Les données de localisation contenues dans le fichier sont effacées au passage : une photo prise en boutique porte souvent ses coordonnées GPS.",
      { after: 0 }
    ),
  ]),
  Espace(140),
  P(
    "Les partenaires sont créés par l'équipe, sur vérification — il n'existe pas d'inscription libre. Un compte de connexion peut leur être ouvert au passage."
  ),

  H2("3.5  Les utilisateurs"),
  P(
    "Recherche par nom ou par numéro, consultation, et suspension d'un compte en cas de fraude ou de litige. Une suspension prend effet immédiatement, mais ne détruit rien : la situation peut être régularisée."
  ),

  H2("3.6  Paramètres, campagnes et journal d'audit"),
  Puce([{ t: "Paramètres", b: true }, { t: " — numéros de dépôt par opérateur, taux de commission, versement minimum, durée du minuteur. Modifiables par le super-administrateur uniquement, et chaque changement est tracé." }]),
  Puce([{ t: "Campagnes", b: true }, { t: " — envoyer une notification à tous les clients, ou seulement à ceux qui ont un achat en cours. C'est l'outil d'encouragement au versement régulier." }]),
  Puce([{ t: "Journal d'audit", b: true }, { t: " — la trace de toutes les actions sensibles : validations, rejets, remboursements, suspensions, changements de paramètres. Réservé au super-administrateur." }]),
  Espace(80),
  Encadre("retenir", "Le rapprochement mensuel", [
    P(
      "Une fois par mois, comparer le total encaissé selon la plateforme avec les relevés des trois comptes mobile money. Tout écart doit être expliqué ligne à ligne : c'est le contrôle qui détecte les erreurs de validation et les dépôts non déclarés.",
      { after: 0 }
    ),
  ]),

  // ══════════════════════ 4. PARTENAIRE ══════════════════════
  H1("4.  Le partenaire — l'espace vendeur"),
  P(
    "Chaque vendeur partenaire dispose d'un espace en ligne, dans un navigateur. Il y suit ses produits et ses commandes."
  ),

  H2("4.1  Se connecter"),
  P(
    "Avec le numéro de téléphone et le mot de passe fournis par l'équipe Kayna Kayna Pay à l'ouverture du compte. Il n'y a pas d'inscription libre : les partenaires sont vérifiés avant d'entrer au catalogue."
  ),

  H2("4.2  Le tableau de bord"),
  P("Quatre indicateurs, mis à jour en continu :"),
  Espace(40),
  Tab(
    ["Indicateur", "Ce qu'il montre"],
    [
      [{ t: "Achats en cours", b: true }, "Combien de clients sont en train de payer un de vos produits."],
      [{ t: "Déjà versé", b: true }, "La somme que ces clients ont déjà déposée, et le total qu'ils doivent atteindre."],
      [{ t: "Commandes à préparer", b: true }, "Les achats entièrement payés, en attente de remise."],
      [{ t: "Ventes livrées", b: true }, "L'historique de ce qui a été remis, et le chiffre correspondant."],
    ],
    [2900, 6460]
  ),
  Espace(220),
  Encadre("retenir", "Ce qui protège le partenaire", [
    P(
      "Un produit n'est remis qu'une fois entièrement payé. Le partenaire ne prend donc aucun risque d'impayé : au moment où la commande lui parvient, l'argent est déjà chez Kayna Kayna Pay.",
      { after: 60 }
    ),
    P("En contrepartie, le partenaire n'est réglé qu'à la livraison confirmée — c'est ce qui protège le client.", { after: 0 }),
  ]),

  H2("4.3  Les commandes"),
  P(
    "La liste des achats complétés, en préparation et livrés, avec pour chacun la référence, le produit, le prix vendeur et la date. Le partenaire est prévenu par notification dès qu'un de ses produits est entièrement payé."
  ),

  H2("4.4  Les produits"),
  P(
    "Le partenaire consulte ses produits, avec pour chacun son prix, le prix affiché au client, le nombre d'achats en cours et de commandes."
  ),
  Espace(60),
  Encadre("info", "Ajouter ou modifier un produit", [
    P(
      "À ce stade, le catalogue est tenu par l'équipe Kayna Kayna Pay : contactez-la pour tout ajout ou changement de prix. Chaque modification est validée avant publication.",
      { after: 60 }
    ),
    P("La gestion autonome du catalogue par les partenaires est prévue pour une prochaine étape du projet.", { after: 0 }),
  ]),

  // ══════════════════════ 5. FAQ ══════════════════════
  H1("5.  Questions fréquentes"),
  P("Ce que demandent le plus souvent les clients, et quoi leur répondre."),
  Espace(80),

  H2("Sur les versements"),
  Tab(
    ["Question", "Réponse"],
    [
      ["« Combien dois-je verser à chaque fois ? »", "Ce que vous voulez, dès 100 F. Aucun rythme n'est imposé."],
      ["« J'ai payé mais rien n'apparaît. »", "Chaque dépôt est vérifié par notre équipe avant d'être crédité. Vous recevrez une notification dès la validation."],
      ["« Le minuteur est fini, mon argent est perdu ? »", "Non. Le versement passe « en vérification » et sera validé. Un dépôt réel n'est jamais perdu."],
      ["« J'ai oublié la référence. »", "Ce n'est pas bloquant : le dépôt est retrouvé grâce à votre numéro et au montant."],
      ["« Puis-je faire deux versements d'un coup ? »", "Non, un seul à la fois par achat. Attendez la validation du premier."],
    ],
    [3900, 5460]
  ),
  Espace(220),

  H2("Sur les achats"),
  Tab(
    ["Question", "Réponse"],
    [
      ["« Le prix peut-il augmenter en cours de route ? »", "Non. Le prix est figé au démarrage de l'achat et garanti jusqu'au bout."],
      ["« Puis-je acheter deux choses en même temps ? »", "Oui. Chaque achat a son propre portefeuille, l'argent n'est jamais mélangé."],
      ["« Quand vais-je recevoir mon produit ? »", "Dès que le montant total est atteint. Nous organisons alors la remise avec le vendeur."],
      ["« Je veux arrêter et récupérer mon argent. »", "Demandez l'annulation depuis le détail de l'achat. Nous vous recontactons."],
      ["« Le produit n'est plus disponible. »", "Vous choisissez : un produit équivalent, le report sur un autre achat, ou le remboursement intégral sans frais."],
    ],
    [3900, 5460]
  ),
  Espace(220),

  H2("Sur la confiance"),
  Tab(
    ["Question", "Réponse"],
    [
      ["« Comment savoir que vous ne partirez pas avec mon argent ? »", "Chaque versement est tracé et consultable dans l'application : c'est votre preuve. Les fonds restent sous notre contrôle jusqu'à la livraison, et le vendeur n'est payé qu'à ce moment-là."],
      ["« Et si le vendeur ne livre pas ? »", "Il n'est pas payé. Vous êtes remboursé intégralement ou réorienté vers un autre produit."],
      ["« Mes données sont-elles en sécurité ? »", "Nous ne collectons que le nécessaire : numéro, nom, historique d'achats. Votre mot de passe est chiffré de façon irréversible — même nous ne pouvons pas le lire."],
    ],
    [3900, 5460]
  ),

  // ══════════════════════ 6. QUI FAIT QUOI ══════════════════════
  H1("6.  Qui fait quoi"),
  P("Récapitulatif des rôles et de ce que chacun peut faire."),
  Espace(80),
  Tab(
    ["Rôle", "Peut", "Ne peut pas"],
    [
      [
        { t: "Client", b: true },
        "Créer un compte, acheter, verser, suivre ses portefeuilles, demander une annulation, supprimer son compte",
        "Voir les achats des autres, accéder aux espaces web",
      ],
      [
        { t: "Partenaire", b: true },
        "Consulter ses produits, ses achats en cours et ses commandes",
        "Modifier son catalogue lui-même, voir les autres partenaires",
      ],
      [
        { t: "Administrateur", b: true },
        "Valider et rejeter les versements, gérer achats, catalogue, partenaires et clients, envoyer des campagnes",
        "Modifier les paramètres, voir le journal d'audit, suspendre un autre administrateur",
      ],
      [
        { t: "Super-admin", b: true },
        "Tout, y compris les paramètres (commission, numéros de dépôt, minimums) et le journal d'audit",
        "—",
      ],
    ],
    [1900, 4230, 3230]
  ),
  Espace(240),
  Encadre("retenir", "Le principe derrière ces cloisons", [
    P(
      "Chacun n'a accès qu'à ce dont il a besoin. Ce n'est pas de la défiance : c'est ce qui permet, en cas de problème, de savoir précisément qui a fait quoi — et donc de protéger aussi les personnes de bonne foi.",
      { after: 0 }
    ),
  ]),
  Espace(200),
  Pm(
    [
      { t: "Pour aller plus loin : " },
      { t: "Comprendre Kayna Kayna Pay", b: true },
      { t: " explique le fonctionnement interne du produit ; la " },
      { t: "documentation d'exploitation", b: true },
      { t: " (dossier docs/) détaille la gestion des litiges, les sauvegardes et la surveillance quotidienne." },
    ],
    { size: 17, color: C.gris }
  ),
];

const doc = new Document({
  creator: "Kayna Kayna Pay",
  title: "Kayna Kayna Pay — Guide d'utilisation",
  description: "Comment utiliser Kayna Kayna Pay au quotidien : client, équipe et partenaire.",
  styles: { default: { document: { run: { font: M.TEXTE, size: M.T.corps } } } },
  numbering: { config: [] },
  sections: sections({
    titreDoc: "Guide d'utilisation",
    couverture: Couverture({
      logo: LOGO,
      titre: "Guide d'utilisation",
      sousTitre: "Se servir de la plateforme au quotidien",
      description:
        "Ce guide explique comment utiliser Kayna Kayna Pay, pour les trois publics de la plateforme : les clients sur l'application mobile, l'équipe Kayna Kayna Pay dans l'espace d'administration, et les vendeurs partenaires dans leur espace.",
      meta: [
        ["Public", "Clients, équipe, partenaires"],
        ["Version", "1.0 — août 2026"],
        ["Complément", "Comprendre Kayna Kayna Pay · Documentation d'exploitation"],
      ],
    }),
    corps,
  }),
});

Packer.toBuffer(doc).then((buf) => {
  const sortie = process.argv[2] || "Kayna_Kayna_Pay_Guide_Utilisation.docx";
  fs.writeFileSync(sortie, buf);
  console.log("écrit :", sortie);
});
