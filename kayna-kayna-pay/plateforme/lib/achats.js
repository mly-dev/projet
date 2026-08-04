const crypto = require("crypto");
const { query, tx } = require("./db");
const { auditer } = require("./audit");
const { notifier } = require("./notifications");

function genererReferenceAchat() {
  const alphabet = "23456789ABCDEFHJKMNPRTUVWXY";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return `ACH-${s}`;
}

// Démarre un achat : le prix affiché est figé à cet instant et garanti
// jusqu'au terme (règle de gestion « Prix affiché »).
async function demarrerAchat(clientUser, produitId) {
  return tx(async (client) => {
    const rp = await client.query(
      `SELECT p.*, pa.enseigne FROM produits p
       JOIN partenaires pa ON pa.id = p.partenaire_id
       WHERE p.id = $1 AND p.disponible = TRUE AND p.statut_validation = 'valide'`,
      [produitId]
    );
    const produit = rp.rows[0];
    if (!produit) throw new Error("Produit indisponible.");
    const ra = await client.query(
      `INSERT INTO achats (reference, client_id, produit_id, prix_total)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [genererReferenceAchat(), clientUser.id, produitId, produit.prix_affiche]
    );
    return { achat: ra.rows[0], produit };
  });
}

async function listerAchats(clientId) {
  const r = await query(
    `SELECT a.*, p.nom AS produit_nom, p.photos, pa.enseigne AS partenaire
     FROM achats a
     JOIN produits p ON p.id = a.produit_id
     JOIN partenaires pa ON pa.id = p.partenaire_id
     WHERE a.client_id = $1
     ORDER BY a.maj_le DESC`,
    [clientId]
  );
  return r.rows;
}

async function detailAchat(clientId, achatId) {
  const r = await query(
    `SELECT a.*, p.nom AS produit_nom, p.description AS produit_description,
            p.photos, p.modalites_remise, pa.enseigne AS partenaire
     FROM achats a
     JOIN produits p ON p.id = a.produit_id
     JOIN partenaires pa ON pa.id = p.partenaire_id
     WHERE a.id = $1 AND a.client_id = $2`,
    [achatId, clientId]
  );
  const achat = r.rows[0];
  if (!achat) return null;
  const rv = await query(
    `SELECT id, reference, operateur, montant_declare, montant_valide, statut,
            motif_rejet, initie_le, depot_confirme_le, statut_maj_le
     FROM versements WHERE achat_id = $1 ORDER BY id DESC`,
    [achatId]
  );
  return { ...achat, versements: rv.rows };
}

// Récapitulatif valant preuve d'achat (après complétion).
async function recapitulatif(clientId, achatId) {
  const achat = await detailAchat(clientId, achatId);
  if (!achat) return null;
  return {
    reference: achat.reference,
    produit: achat.produit_nom,
    partenaire: achat.partenaire,
    prix_total: achat.prix_total,
    montant_verse: achat.montant_verse,
    statut: achat.statut,
    complete_le: achat.complete_le,
    versements_valides: achat.versements
      .filter((v) => v.statut === "valide")
      .map((v) => ({
        reference: v.reference,
        montant: v.montant_valide,
        operateur: v.operateur,
        date: v.statut_maj_le,
      })),
  };
}

// Demande d'annulation par le client (traitée par l'administration selon les
// règles de gestion du chapitre 6 du cahier des charges).
async function demanderAnnulation(clientUser, achatId, motif) {
  const r = await query(
    `UPDATE achats SET annulation_demandee = TRUE, annulation_motif = $3, maj_le = now()
     WHERE id = $1 AND client_id = $2 AND statut = 'en_cours' RETURNING *`,
    [achatId, clientUser.id, motif || null]
  );
  const achat = r.rows[0];
  if (!achat) throw new Error("Achat introuvable ou non annulable.");
  await auditer(clientUser.id, "achat.annulation_demandee", "achat", achatId, { motif });
  await notifier(
    clientUser.id,
    "annulation_demandee",
    "Demande d'annulation enregistrée",
    "Notre équipe va traiter votre demande d'annulation et vous recontacter. Les modalités de remboursement sont décrites dans les CGU.",
    { achat_id: achatId }
  );
  return achat;
}

module.exports = {
  demarrerAchat,
  listerAchats,
  detailAchat,
  recapitulatif,
  demanderAnnulation,
};
