// Données de démonstration : paramètres, contenus, catégories, comptes,
// partenaires et produits d'exemple (prix indicatifs en F CFA).
require("dotenv").config();
const crypto = require("crypto");
const { pool, query, setParametre, getParametre } = require("../lib/db");
const { hacherMotDePasse } = require("../lib/auth");
const { PRODUCTION } = require("../lib/config");

// Mots de passe des comptes de démonstration.
//
// Sur un poste de développement, des mots de passe courts et connus font gagner
// du temps à chaque essai. Sur un serveur public, ce sont des comptes — dont un
// super-administrateur — dont les identifiants sont écrits en clair dans un
// dépôt Git et dans la documentation. Quiconque trouve l'adresse entre.
//
// En production ils sont donc tirés au hasard et affichés une seule fois, à la
// fin du seed. SEED_MDP_ADMIN et consorts permettent d'en imposer un choisi.
const comptes = [];

function motDePasse(role, defautDeDemo) {
  const impose = process.env[`SEED_MDP_${role.toUpperCase()}`];
  if (impose) return impose;
  if (!PRODUCTION) return defautDeDemo;
  return crypto.randomBytes(9).toString("base64url");
}

// En production, ces mots de passe ne sont affichés qu'ici, une seule fois :
// seul un condensé est conservé en base, ils ne peuvent pas être relus ensuite.
function annoncerComptes() {
  const nouveaux = comptes.filter((c) => c.mdp);
  const existants = comptes.filter((c) => !c.mdp);

  console.log("\nSeed terminé.\n");

  if (nouveaux.length) {
    console.log("  Comptes créés :\n");
    const largeur = Math.max(...nouveaux.map((c) => c.role.length));
    for (const c of nouveaux) {
      console.log(`    ${c.role.padEnd(largeur)}  ${c.telephone}  ${c.mdp}   ${c.nom}`);
    }
    if (PRODUCTION) {
      console.log(
        "\n  ┌────────────────────────────────────────────────────────────────┐\n" +
          "  │  Notez ces mots de passe MAINTENANT : ils ne sont pas          │\n" +
          "  │  conservés et cet affichage ne reviendra pas.                  │\n" +
          "  └────────────────────────────────────────────────────────────────┘"
      );
    }
  }

  if (existants.length) {
    console.log(`\n  ${existants.length} compte(s) déjà présent(s), mot de passe inchangé :\n`);
    for (const c of existants) console.log(`    ${c.telephone}  ${c.nom}`);
  }
  console.log("");
}

async function upsertUser(telephone, nom, mdp, role) {
  const existant = await query("SELECT id FROM users WHERE telephone = $1", [telephone]);
  if (existant.rows.length) {
    // Un compte déjà présent garde son mot de passe : relancer le seed ne doit
    // pas écraser un mot de passe changé depuis. On le note pour ne surtout pas
    // afficher plus bas celui qu'on vient de tirer — il n'a pas été appliqué,
    // et l'annoncer enfermerait dehors.
    comptes.push({ role, nom, telephone, mdp: null });
    return existant.rows[0].id;
  }
  const r = await query(
    `INSERT INTO users (telephone, nom, mot_de_passe_hash, role, telephone_verifie, cgu_acceptees_le)
     VALUES ($1, $2, $3, $4, TRUE, now()) RETURNING id`,
    [telephone, nom, await hacherMotDePasse(mdp), role]
  );
  comptes.push({ role, nom, telephone, mdp });
  return r.rows[0].id;
}

async function principal() {
  // Paramètres de la plateforme (modifiables par le super-admin).
  await setParametre("commission_pct", 5);
  await setParametre("versement_minimum", 100);
  await setParametre("delai_attente_minutes", 10);
  await setParametre("numeros_depot", {
    nita: "+227 90 00 00 01",
    amana: "+227 91 00 00 02",
    wave: "+227 92 00 00 03",
  });

  // Contenus légaux — PROJETS de textes, à faire valider juridiquement
  // (consultation BCEAO/UEMOA prévue en Phase 0) avant tout lancement public.
  await query(
    `INSERT INTO contenus (cle, titre, corps) VALUES
     ('cgu', 'Conditions générales d''utilisation (projet)',
      'PROJET DE TEXTE — à valider par un conseil juridique avant publication.\n\n1. Objet. Kayna Kayna Pay permet d''acheter un produit ou service en versant progressivement par mobile money jusqu''au prix total. Le produit est remis une fois le montant complété.\n\n2. Prix. Le prix affiché est figé au démarrage de l''achat et garanti jusqu''à son terme. Les frais de dépôt mobile money sont à la charge du client.\n\n3. Versements. Montant minimum : 100 F CFA. Chaque versement est vérifié puis validé par l''équipe ; l''historique consultable dans l''application vaut preuve.\n\n4. Annulation. Le client peut demander l''annulation d''un achat en cours ; le montant versé est remboursé, déduction faite de frais de gestion précisés avant confirmation, sous le délai annoncé.\n\n5. Produit indisponible. Si le produit devient indisponible avant complétion, le client choisit entre un produit équivalent, le report du solde sur un autre achat, ou le remboursement intégral sans frais.\n\n6. Protection des fonds. Les fonds restent sous le contrôle de la plateforme jusqu''à la livraison ; le partenaire n''est payé qu''à la livraison confirmée.'),
     ('confidentialite', 'Politique de confidentialité (projet)',
      'PROJET DE TEXTE — à valider par un conseil juridique avant publication.\n\nNous collectons le minimum de données nécessaires au service : numéro de téléphone, nom, historique d''achats et de versements. Ces données ne sont ni vendues ni partagées à des fins commerciales. Vous pouvez supprimer votre compte depuis votre profil ; vos données personnelles sont alors anonymisées, les écritures comptables étant conservées conformément aux obligations légales.'),
     ('faq', 'Questions fréquentes',
      'Comment payer ? Choisissez un produit, appuyez sur « Commencer à payer », puis faites des versements par NITA, Amana ou Wave quand vous voulez, même 100 F.\n\nQue se passe-t-il quand j''ai tout payé ? Votre achat passe « complété » : nous organisons la remise du produit avec le partenaire.\n\nMon versement n''apparaît pas ? Chaque dépôt est vérifié par notre équipe. Si le minuteur expire, le versement passe « en vérification » : il n''est jamais perdu, vous serez notifié.\n\nPuis-je annuler ? Oui, depuis le détail de votre achat. Le remboursement suit les règles des CGU.'),
     ('contact', 'Nous contacter',
      'Téléphone / WhatsApp : +227 90 00 00 00\nNiamey, Niger\nNous répondons 7 jours sur 7, de 8 h à 20 h.')
     ON CONFLICT (cle) DO NOTHING`
  );

  // Catégories (liste administrable).
  const categories = [
    ["Téléphonie", "telephonie", 1],
    ["Informatique", "informatique", 2],
    ["Motos & véhicules", "motos-vehicules", 3],
    ["Maison & cuisine", "maison-cuisine", 4],
    ["Billets & transport", "billets-transport", 5],
    ["Assurances", "assurances", 6],
  ];
  for (const [nom, slug, ordre] of categories) {
    await query(
      `INSERT INTO categories (nom, slug, ordre) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING`,
      [nom, slug, ordre]
    );
  }
  const cat = {};
  for (const ligne of (await query("SELECT id, slug FROM categories")).rows) cat[ligne.slug] = ligne.id;

  // Comptes de démonstration. Voir motDePasse() : valeurs fixes en
  // développement, tirées au hasard sur un serveur public.
  await upsertUser("+22790000000", "Super Admin", motDePasse("superadmin", "superadmin123"), "superadmin");
  await upsertUser("+22790000010", "Admin Démo", motDePasse("admin", "admin123"), "admin");
  const clientId = await upsertUser("+22791111111", "Aïcha Démo", motDePasse("client", "client123"), "client");

  // Partenaires vérifiés + comptes.
  const partenaires = [
    ["Sahel Électronique", "+22792000001", "Marché de Katako, Niamey"],
    ["Moto Plus Niamey", "+22792000002", "Route de Tillabéri, Niamey"],
    ["Confort Maison", "+22792000003", "Grand Marché, Niamey"],
  ];
  const pids = {};
  for (const [enseigne, tel, contact] of partenaires) {
    const uid = await upsertUser(tel, enseigne, motDePasse("partenaire", "partenaire123"), "partenaire");
    const existant = await query("SELECT id FROM partenaires WHERE enseigne = $1", [enseigne]);
    if (existant.rows.length) {
      pids[enseigne] = existant.rows[0].id;
    } else {
      const r = await query(
        "INSERT INTO partenaires (user_id, enseigne, contact) VALUES ($1, $2, $3) RETURNING id",
        [uid, enseigne, contact]
      );
      pids[enseigne] = r.rows[0].id;
    }
  }

  // Produits d'exemple — prix partenaire en F CFA. Le prix affiché suit la même
  // règle que l'API admin : prix partenaire + commission, arrondi aux 5 F
  // supérieurs. Le taux est relu depuis les paramètres pour que le seed ne
  // diverge pas si la commission change.
  const commission = Number(await getParametre("commission_pct", 5));
  const prixAffiche = (p) => Math.ceil((p * (1 + commission / 100)) / 5) * 5;
  const produits = [
    ["Sahel Électronique", "telephonie", "Téléphone Tecno Spark (128 Go)", "Écran 6,6\", 128 Go, double SIM, garantie 12 mois.", 78000, true],
    ["Sahel Électronique", "telephonie", "Téléphone Itel A50", "Simple et robuste, idéal premier smartphone.", 42000, false],
    ["Sahel Électronique", "informatique", "Ordinateur portable HP 15", "Intel i3, 8 Go RAM, 256 Go SSD — pour étudier et travailler.", 265000, true],
    ["Moto Plus Niamey", "motos-vehicules", "Moto 125 cc", "Moto neuve 125 cc, homologuée, casque offert.", 640000, true],
    ["Moto Plus Niamey", "motos-vehicules", "Assurance moto 1 an", "Responsabilité civile, souscription en 24 h.", 24000, false],
    ["Confort Maison", "maison-cuisine", "Lot d'ustensiles de cuisine (12 pièces)", "Marmites, casseroles et accessoires en inox.", 46000, true],
    ["Confort Maison", "maison-cuisine", "Réfrigérateur 200 L", "Classe A, faible consommation, livraison à Niamey incluse.", 185000, false],
    ["Confort Maison", "billets-transport", "Billet de bus Niamey–Cotonou (aller)", "Compagnie partenaire, siège garanti, bagage 25 kg.", 33000, false],
  ];
  for (const [enseigne, slug, nom, description, prix, avant] of produits) {
    const existant = await query("SELECT id FROM produits WHERE nom = $1", [nom]);
    if (existant.rows.length) continue;
    await query(
      `INSERT INTO produits (partenaire_id, categorie_id, nom, description, prix_partenaire,
                             prix_affiche, mis_en_avant, statut_validation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'valide')`,
      [pids[enseigne], cat[slug], nom, description, prix, prixAffiche(prix), avant]
    );
  }

  annoncerComptes();
  await pool.end();
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
