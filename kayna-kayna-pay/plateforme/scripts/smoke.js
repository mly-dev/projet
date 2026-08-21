// Test de bout en bout des critères d'acceptation du MVP
// (cahier des charges, chapitre 13). Nécessite le serveur démarré
// (npm run dev) et la base migrée + seedée.
require("dotenv").config();
const { io } = require("socket.io-client");
const { query, pool } = require("../lib/db");
const { motDePasse } = require("./identifiants");

const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
let reussites = 0;
let echecs = 0;

function critere(nom, ok, detail) {
  if (ok) {
    reussites += 1;
    console.log(`  ✓ ${nom}`);
  } else {
    echecs += 1;
    console.error(`  ✗ ${nom}${detail ? " — " + detail : ""}`);
  }
}

async function api(chemin, options = {}, jeton) {
  const res = await fetch(BASE + chemin, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
    },
    body: options.corps ? JSON.stringify(options.corps) : undefined,
  });
  return { statut: res.status, corps: await res.json(), entetes: res.headers };
}

// Connexion d'un administrateur : mot de passe, puis code SMS (deuxième
// facteur). Renvoie le jeton de session et les constats intermédiaires.
async function connexionAdmin(telephone, motDePasse) {
  const etape1 = await api("/api/auth/connexion", {
    method: "POST",
    corps: { telephone, mot_de_passe: motDePasse },
  });
  const r = await query(
    "SELECT code FROM otp_codes WHERE telephone = $1 AND usage = 'connexion' ORDER BY id DESC LIMIT 1",
    [telephone]
  );
  const etape2 = await api("/api/auth/connexion-2fa", {
    method: "POST",
    corps: { jeton_temporaire: etape1.corps.jeton_temporaire, code: r.rows[0] && r.rows[0].code },
  });
  return { etape1, etape2, jeton: etape2.corps.jeton };
}

function attendre(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function principal() {
  console.log("Kayna Kayna Pay — test de bout en bout (critères d'acceptation du MVP)\n");
  const telephone = "+2279" + String(Math.floor(1000000 + Math.random() * 9000000));

  // ── Critère : inscription vérifiée par OTP ────────────────────────────────
  const sansCgu = await api("/api/auth/inscription", {
    method: "POST",
    corps: { telephone, nom: "Client Test", mot_de_passe: "test1234", cgu_acceptees: false },
  });
  critere("L'inscription exige l'acceptation des CGU", sansCgu.statut === 400);

  const inscription = await api("/api/auth/inscription", {
    method: "POST",
    corps: { telephone, nom: "Client Test", mot_de_passe: "test1234", cgu_acceptees: true },
  });
  if (!inscription.corps.ok) throw new Error("Inscription impossible : " + inscription.corps.erreur);

  const rOtp = await query(
    "SELECT code FROM otp_codes WHERE telephone = $1 AND usage = 'inscription' ORDER BY id DESC LIMIT 1",
    [telephone]
  );
  const verif = await api("/api/auth/verifier-otp", {
    method: "POST",
    corps: { telephone, code: rOtp.rows[0].code },
  });
  const jetonClient = verif.corps.jeton;
  critere("Un client peut créer un compte vérifié par OTP", Boolean(jetonClient));

  // ── Critère : trouver un produit, démarrer un achat, portefeuille à zéro ──
  const produits = await api("/api/produits?q=moto");
  const produit = produits.corps.produits[0];
  const achatCree = await api("/api/achats", { method: "POST", corps: { produit_id: produit.id } }, jetonClient);
  const achatId = achatCree.corps.achat && achatCree.corps.achat.id;
  critere(
    "Il peut trouver un produit, démarrer un achat et voir son portefeuille à zéro",
    Boolean(achatId) && achatCree.corps.achat.montant_verse === 0 &&
      achatCree.corps.achat.prix_total === produit.prix_affiche
  );

  // ── Connexions socket : client (notifications) et admin (file) ────────────
  const { etape1, etape2, jeton: jetonAdmin } = await connexionAdmin("+22790000010", motDePasse("admin"));
  critere(
    "La connexion administrateur exige un deuxième facteur (aucun jeton au mot de passe seul)",
    etape1.corps.second_facteur === true && !etape1.corps.jeton && Boolean(etape1.corps.jeton_temporaire)
  );
  const avecJetonTemporaire = await api("/api/admin/versements", {}, etape1.corps.jeton_temporaire);
  critere(
    "Le jeton intermédiaire n'ouvre aucune session",
    avecJetonTemporaire.statut === 401
  );
  critere("Le code SMS ouvre la session administrateur", Boolean(jetonAdmin) && etape2.corps.ok === true);

  const mauvaisCode = await api("/api/auth/connexion-2fa", {
    method: "POST",
    corps: { jeton_temporaire: etape1.corps.jeton_temporaire, code: "000000" },
  });
  critere("Un code de connexion erroné est refusé", mauvaisCode.statut === 400);

  // Espaces web : le jeton part en cookie httpOnly, jamais dans le corps
  const connexionWeb = await api("/api/auth/connexion", {
    method: "POST",
    corps: { telephone: "+22792000001", mot_de_passe: motDePasse("partenaire"), espace_web: true },
  });
  const cookie = connexionWeb.entetes.get("set-cookie") || "";
  critere(
    "L'espace web reçoit un cookie httpOnly SameSite et aucun jeton dans la réponse",
    !connexionWeb.corps.jeton &&
      /kkp_jeton=/.test(cookie) &&
      /HttpOnly/i.test(cookie) &&
      /SameSite=Strict/i.test(cookie)
  );

  const evenements = { client: [], admin: [] };
  const socketClient = io(BASE, { auth: { jeton: jetonClient }, transports: ["websocket"] });
  const socketAdmin = io(BASE, { auth: { jeton: jetonAdmin }, transports: ["websocket"] });
  socketClient.on("notification", (n) => evenements.client.push(n));
  socketAdmin.on("file:nouveau", (v) => evenements.admin.push(v));
  await attendre(600);

  // ── Critère : déclarer un versement, suivre l'attente, crédit temps réel ──
  const initiation = await api(
    "/api/versements",
    { method: "POST", corps: { achat_id: achatId, montant: 5000, operateur: "nita" } },
    jetonClient
  );
  const versement = initiation.corps.versement;
  const instructions = initiation.corps.instructions;
  critere(
    "L'initiation renvoie les instructions (numéro de dépôt, référence unique, frais)",
    Boolean(instructions && instructions.numero_depot && /^KKP-/.test(instructions.reference))
  );

  const doublon = await api(
    "/api/versements",
    { method: "POST", corps: { achat_id: achatId, montant: 1000, operateur: "wave" } },
    jetonClient
  );
  critere("Anti-doublon : un seul versement actif par achat", doublon.statut === 400);

  await api(`/api/versements/${versement.id}/confirmer`, { method: "POST" }, jetonClient);
  await attendre(600);
  critere(
    "Un administrateur voit le versement apparaître en temps réel dans la file",
    evenements.admin.some((v) => v.id === versement.id)
  );

  const file = await api("/api/admin/versements?statut=en_attente", {}, jetonAdmin);
  critere(
    "La file de validation liste le versement (montant, opérateur, référence, client, horodatage)",
    file.corps.versements.some((v) => v.id === versement.id && v.client_telephone && v.depot_confirme_le)
  );

  // Validation pour un montant réel différent du montant déclaré.
  await api(
    `/api/admin/versements/${versement.id}/valider`,
    { method: "POST", corps: { montant_reel: 4500 } },
    jetonAdmin
  );
  await attendre(600);
  const apresValidation = await api(`/api/achats/${achatId}`, {}, jetonClient);
  critere(
    "Après validation admin (au montant réel), le portefeuille est crédité",
    apresValidation.corps.achat.montant_verse === 4500
  );
  critere(
    "Le client est notifié en temps réel de la validation",
    evenements.client.some((n) => n.type === "versement_valide")
  );

  // ── Critère : minuteur expiré → « en vérification », jamais perdu ─────────
  const init2 = await api(
    "/api/versements",
    { method: "POST", corps: { achat_id: achatId, montant: 3000, operateur: "wave" } },
    jetonClient
  );
  const v2 = init2.corps.versement;
  await api(`/api/versements/${v2.id}/confirmer`, { method: "POST" }, jetonClient);
  // On antidate la confirmation pour simuler l'expiration du minuteur.
  await query("UPDATE versements SET depot_confirme_le = now() - interval '15 minutes' WHERE id = $1", [v2.id]);
  const { balayerMinuteurs } = require("../lib/versements");
  await balayerMinuteurs();
  const v2Etat = await api(`/api/versements/${v2.id}`, {}, jetonClient);
  critere(
    "Un versement dont le minuteur expire passe « en vérification » (jamais perdu)",
    v2Etat.corps.versement.statut === "en_verification"
  );
  const validationTardive = await api(
    `/api/admin/versements/${v2.id}/valider`,
    { method: "POST", corps: {} },
    jetonAdmin
  );
  critere("Il peut ensuite être validé depuis la vérification", validationTardive.corps.ok === true);

  // ── Critère : rejet avec motif ────────────────────────────────────────────
  const init3 = await api(
    "/api/versements",
    { method: "POST", corps: { achat_id: achatId, montant: 1000, operateur: "amana" } },
    jetonClient
  );
  await api(`/api/versements/${init3.corps.versement.id}/confirmer`, { method: "POST" }, jetonClient);
  const rejetSansMotif = await api(
    `/api/admin/versements/${init3.corps.versement.id}/rejeter`,
    { method: "POST", corps: {} },
    jetonAdmin
  );
  critere("Le rejet exige un motif", rejetSansMotif.statut === 400);
  await api(
    `/api/admin/versements/${init3.corps.versement.id}/rejeter`,
    { method: "POST", corps: { motif: "Aucun dépôt trouvé" } },
    jetonAdmin
  );
  await attendre(400);
  critere(
    "Le client est notifié du rejet avec le motif",
    evenements.client.some((n) => n.type === "versement_rejete" && n.corps.includes("Aucun dépôt trouvé"))
  );

  // ── Critère : complétion → notifications + récapitulatif ──────────────────
  const detail = await api(`/api/achats/${achatId}`, {}, jetonClient);
  const restant = detail.corps.achat.prix_total - detail.corps.achat.montant_verse;
  const initFinal = await api(
    "/api/versements",
    { method: "POST", corps: { achat_id: achatId, montant: restant, operateur: "nita" } },
    jetonClient
  );
  await api(`/api/versements/${initFinal.corps.versement.id}/confirmer`, { method: "POST" }, jetonClient);
  await api(
    `/api/admin/versements/${initFinal.corps.versement.id}/valider`,
    { method: "POST", corps: {} },
    jetonAdmin
  );
  await attendre(600);
  const apresCompletion = await api(`/api/achats/${achatId}`, {}, jetonClient);
  critere(
    "Quand le portefeuille atteint le total, l'achat passe « complété » et le client est notifié",
    apresCompletion.corps.achat.statut === "complete" &&
      evenements.client.some((n) => n.type === "achat_complete")
  );
  const partenaireUser = await query(
    `SELECT pa.user_id FROM partenaires pa JOIN produits p ON p.partenaire_id = pa.id WHERE p.id = $1`,
    [produit.id]
  );
  const notifPartenaire = await query(
    "SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'commande_complete' AND donnees->>'achat_id' = $2",
    [partenaireUser.rows[0].user_id, String(achatId)]
  );
  critere("Le partenaire est notifié de la commande complétée", notifPartenaire.rows.length === 1);

  const recap = await api(`/api/achats/${achatId}/recapitulatif`, {}, jetonClient);
  critere(
    "Un récapitulatif valant preuve d'achat est disponible",
    recap.corps.ok && recap.corps.recapitulatif.versements_valides.length >= 3
  );

  // ── Critère : intégrité — solde = somme des versements validés ────────────
  const integrite = await query(
    `SELECT a.montant_verse,
            COALESCE((SELECT SUM(montant_valide) FROM versements WHERE achat_id = a.id AND statut = 'valide'), 0)
          + COALESCE((SELECT SUM(montant) FROM ajustements WHERE achat_id = a.id), 0) AS recalcule
     FROM achats a WHERE a.id = $1`,
    [achatId]
  );
  critere(
    "Le solde du portefeuille égale exactement la somme des écritures validées",
    Number(integrite.rows[0].montant_verse) === Number(integrite.rows[0].recalcule)
  );

  // ── Critère : contrôle d'accès par rôle ───────────────────────────────────
  const accesRefuse = await api("/api/admin/versements", {}, jetonClient);
  const accesSansJeton = await api("/api/achats");
  const auditRefuse = await api("/api/admin/audit", {}, jetonAdmin); // admin simple ≠ superadmin
  critere(
    "Aucune route n'est accessible sans le rôle approprié",
    accesRefuse.statut === 403 && accesSansJeton.statut === 401 && auditRefuse.statut === 403
  );

  // ── Divers : CGU consultables, historique des transitions journalisé ──────
  const cgu = await api("/api/contenus/cgu");
  critere("Les CGU sont consultables depuis l'application", cgu.corps.ok === true);
  const transitions = await query(
    "SELECT COUNT(*)::int AS n FROM versement_transitions WHERE versement_id = $1",
    [versement.id]
  );
  critere("Chaque transition de versement est journalisée", transitions.rows[0].n >= 3);

  socketClient.close();
  socketAdmin.close();
  await pool.end();

  console.log(`\nRésultat : ${reussites} critères validés, ${echecs} en échec.`);
  process.exit(echecs ? 1 : 0);
}

principal().catch((e) => {
  console.error("Erreur du test :", e);
  process.exit(1);
});
