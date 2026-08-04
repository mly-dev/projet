const crypto = require("crypto");
const { query, tx, getParametre } = require("./db");
const { notifier, emettreAdmins } = require("./notifications");
const { auditer } = require("./audit");

// Machine à états du versement (cahier des charges §9.2) :
// initie → en_attente → valide | rejete | en_verification
// en_verification → valide | rejete
const TRANSITIONS = {
  initie: ["en_attente", "rejete"],
  en_attente: ["valide", "rejete", "en_verification"],
  en_verification: ["valide", "rejete"],
  valide: [],
  rejete: [],
};

const OPERATEURS = ["nita", "amana", "wave"];

function genererReference() {
  // Référence courte, lisible au téléphone : KKP- + 5 caractères sans ambiguïté.
  const alphabet = "23456789ABCDEFHJKMNPRTUVWXY";
  let s = "";
  for (let i = 0; i < 5; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return `KKP-${s}`;
}

// Applique une transition dans une transaction déjà ouverte (client pg).
// Verrouille la ligne, vérifie la légalité de la transition, journalise.
async function transitionner(client, versementId, vers, parUserId, note, majSupplementaires = {}) {
  const r = await client.query("SELECT * FROM versements WHERE id = $1 FOR UPDATE", [versementId]);
  const v = r.rows[0];
  if (!v) throw new Error("Versement introuvable.");
  if (!TRANSITIONS[v.statut].includes(vers)) {
    throw new Error(`Transition interdite : ${v.statut} → ${vers}.`);
  }
  const champs = ["statut = $2", "statut_maj_le = now()"];
  const valeurs = [versementId, vers];
  let i = 3;
  for (const [k, val] of Object.entries(majSupplementaires)) {
    champs.push(`${k} = $${i}`);
    valeurs.push(val);
    i += 1;
  }
  await client.query(`UPDATE versements SET ${champs.join(", ")} WHERE id = $1`, valeurs);
  await client.query(
    `INSERT INTO versement_transitions (versement_id, de, vers, par_user_id, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [versementId, v.statut, vers, parUserId, note || null]
  );
  return { ...v, statut: vers };
}

// Recalcule le portefeuille d'un achat depuis les écritures (jamais d'addition
// incrémentale aveugle) : somme des versements validés + ajustements.
async function recalculerPortefeuille(client, achatId) {
  const r = await client.query(
    `SELECT
       COALESCE((SELECT SUM(montant_valide) FROM versements
                 WHERE achat_id = $1 AND statut = 'valide'), 0)
     + COALESCE((SELECT SUM(montant) FROM ajustements WHERE achat_id = $1), 0) AS total`,
    [achatId]
  );
  const total = Number(r.rows[0].total);
  await client.query("UPDATE achats SET montant_verse = $2, maj_le = now() WHERE id = $1", [achatId, total]);
  return total;
}

// 1. Initiation : le client déclare vouloir verser un montant sur un achat.
async function initierVersement(clientUser, achatId, montant, operateur) {
  if (!OPERATEURS.includes(operateur)) throw new Error("Opérateur inconnu.");
  const minimum = Number(await getParametre("versement_minimum", 100));
  if (!Number.isInteger(montant) || montant < minimum) {
    throw new Error(`Le versement minimum est de ${minimum} F.`);
  }
  const numeros = await getParametre("numeros_depot", {});
  if (!numeros[operateur]) throw new Error("Numéro de dépôt indisponible pour cet opérateur.");

  return tx(async (client) => {
    const ra = await client.query(
      "SELECT * FROM achats WHERE id = $1 AND client_id = $2 FOR UPDATE",
      [achatId, clientUser.id]
    );
    const achat = ra.rows[0];
    if (!achat) throw new Error("Achat introuvable.");
    if (achat.statut !== "en_cours") throw new Error("Cet achat n'accepte plus de versements.");

    const actif = await client.query(
      "SELECT id FROM versements WHERE achat_id = $1 AND statut IN ('initie', 'en_attente')",
      [achatId]
    );
    if (actif.rows.length) {
      throw new Error("Un versement est déjà en cours sur cet achat. Attendez sa validation.");
    }

    const rv = await client.query(
      `INSERT INTO versements (reference, achat_id, client_id, operateur, montant_declare)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [genererReference(), achatId, clientUser.id, operateur, montant]
    );
    const versement = rv.rows[0];
    await client.query(
      `INSERT INTO versement_transitions (versement_id, de, vers, par_user_id, note)
       VALUES ($1, NULL, 'initie', $2, 'Initiation par le client')`,
      [versement.id, clientUser.id]
    );
    return {
      versement,
      instructions: {
        operateur,
        numero_depot: numeros[operateur],
        montant,
        reference: versement.reference,
        frais: "Les frais de dépôt mobile money sont à votre charge.",
      },
    };
  });
}

// 3-4. Le client confirme avoir effectué le dépôt → en attente de validation.
async function confirmerDepot(clientUser, versementId) {
  const versement = await tx(async (client) =>
    transitionner(client, versementId, "en_attente", clientUser.id, "Dépôt déclaré par le client", {
      depot_confirme_le: new Date(),
    })
  );
  const r = await query(
    `SELECT v.*, a.reference AS achat_reference, p.nom AS produit_nom, u.telephone AS client_telephone, u.nom AS client_nom
     FROM versements v
     JOIN achats a ON a.id = v.achat_id
     JOIN produits p ON p.id = a.produit_id
     JOIN users u ON u.id = v.client_id
     WHERE v.id = $1`,
    [versementId]
  );
  emettreAdmins("file:nouveau", r.rows[0]);
  return versement;
}

// 5. Validation par un administrateur (montant réellement reçu).
async function validerVersement(adminUser, versementId, montantReel) {
  const resultat = await tx(async (client) => {
    const avant = await client.query("SELECT * FROM versements WHERE id = $1", [versementId]);
    if (!avant.rows[0]) throw new Error("Versement introuvable.");
    const montant = Number.isInteger(montantReel) && montantReel > 0
      ? montantReel
      : avant.rows[0].montant_declare;

    const v = await transitionner(client, versementId, "valide", adminUser.id,
      montant !== avant.rows[0].montant_declare
        ? `Validé pour le montant réellement reçu : ${montant} F (déclaré : ${avant.rows[0].montant_declare} F)`
        : "Validé",
      { montant_valide: montant, valide_par: adminUser.id });

    const total = await recalculerPortefeuille(client, v.achat_id);
    const ra = await client.query(
      `SELECT a.*, p.nom AS produit_nom, p.partenaire_id FROM achats a
       JOIN produits p ON p.id = a.produit_id WHERE a.id = $1 FOR UPDATE`,
      [v.achat_id]
    );
    const achat = ra.rows[0];
    let complete = false;
    if (achat.statut === "en_cours" && total >= achat.prix_total) {
      await client.query(
        "UPDATE achats SET statut = 'complete', complete_le = now(), maj_le = now() WHERE id = $1",
        [achat.id]
      );
      complete = true;
    }
    return { versement: v, achat, total, montant, complete };
  });

  const { versement, achat, total, montant, complete } = resultat;
  await auditer(adminUser.id, "versement.valide", "versement", versementId, {
    montant, achat_id: achat.id,
  });
  await notifier(
    versement.client_id,
    "versement_valide",
    "Versement validé ✓",
    `Votre versement de ${montant} F sur « ${achat.produit_nom} » est validé. Total versé : ${total} F sur ${achat.prix_total} F.`,
    { achat_id: achat.id, versement_id: versementId, montant, total }
  );
  if (complete) {
    await notifier(
      versement.client_id,
      "achat_complete",
      "Félicitations, achat complété ! 🎉",
      `Vous avez complété le paiement de « ${achat.produit_nom} ». Nous préparons la remise de votre produit.`,
      { achat_id: achat.id }
    );
    const rp = await query("SELECT user_id FROM partenaires WHERE id = $1", [achat.partenaire_id]);
    if (rp.rows[0] && rp.rows[0].user_id) {
      await notifier(
        rp.rows[0].user_id,
        "commande_complete",
        "Commande complétée",
        `L'achat ${achat.reference} (« ${achat.produit_nom} ») est entièrement payé. Préparez la remise.`,
        { achat_id: achat.id }
      );
    }
  }
  emettreAdmins("file:traite", { versement_id: versementId, statut: "valide" });
  return resultat;
}

// 5 bis. Rejet par un administrateur, avec motif.
async function rejeterVersement(adminUser, versementId, motif) {
  if (!motif || !motif.trim()) throw new Error("Le motif de rejet est obligatoire.");
  const versement = await tx(async (client) =>
    transitionner(client, versementId, "rejete", adminUser.id, motif, { motif_rejet: motif })
  );
  await auditer(adminUser.id, "versement.rejete", "versement", versementId, { motif });
  await notifier(
    versement.client_id,
    "versement_rejete",
    "Versement non validé",
    `Votre versement ${versement.reference} n'a pas pu être validé : ${motif}. Vous pouvez relancer un versement ou contacter le support depuis l'application.`,
    { versement_id: versementId, motif }
  );
  emettreAdmins("file:traite", { versement_id: versementId, statut: "rejete" });
  return versement;
}

// Balayage périodique : les versements « en attente » dont le minuteur de
// 10 minutes a expiré passent « en cours de vérification » — jamais perdus.
async function balayerMinuteurs() {
  const delai = Number(await getParametre("delai_attente_minutes", 10));
  const r = await query(
    `SELECT id, client_id, reference FROM versements
     WHERE statut = 'en_attente' AND depot_confirme_le < now() - ($1 || ' minutes')::interval`,
    [String(delai)]
  );
  for (const v of r.rows) {
    await tx(async (client) =>
      transitionner(client, v.id, "en_verification", null, "Minuteur expiré — vérification en cours")
    );
    await notifier(
      v.client_id,
      "versement_verification",
      "Vérification en cours",
      `Votre versement ${v.reference} est en cours de vérification. Inutile de rester sur la page d'attente : vous serez notifié dès sa validation. Un dépôt réel n'est jamais perdu.`,
      { versement_id: v.id }
    );
    emettreAdmins("file:verification", { versement_id: v.id });
  }
  // Les versements « initiés » jamais confirmés sont rejetés après 24 h pour
  // libérer l'achat (anti-doublon) — le client peut toujours relancer.
  const abandons = await query(
    `SELECT id FROM versements WHERE statut = 'initie' AND initie_le < now() - interval '24 hours'`
  );
  for (const v of abandons.rows) {
    await tx(async (client) =>
      transitionner(client, v.id, "rejete", null, "Abandonné : dépôt jamais déclaré", {
        motif_rejet: "Versement abandonné (aucun dépôt déclaré sous 24 h).",
      })
    );
  }
  return r.rows.length;
}

module.exports = {
  OPERATEURS,
  initierVersement,
  confirmerDepot,
  validerVersement,
  rejeterVersement,
  balayerMinuteurs,
  recalculerPortefeuille,
  transitionner,
};
