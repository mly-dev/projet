import { utilisateurRequis } from "../../../../lib/auth";
import { query, tx } from "../../../../lib/db";
import { auditer } from "../../../../lib/audit";
import { notifier } from "../../../../lib/notifications";

// Actions administrateur sur un achat : avancement de la livraison,
// traitement d'une annulation (remboursement par écriture d'ajustement).
const ACTIONS = {
  en_preparation: { depuis: ["complete"], titre: "Commande en préparation", corps: "Votre commande est en préparation de livraison." },
  livre: { depuis: ["complete", "en_preparation"], titre: "Commande livrée ✓", corps: "Votre produit a été remis ou votre service activé. Merci pour votre confiance !" },
  annule: { depuis: ["en_cours"], titre: "Achat annulé", corps: "Votre achat a été annulé. Le remboursement sera traité selon les CGU." },
  rembourse: { depuis: ["annule"], titre: "Remboursement effectué", corps: "Le remboursement de votre achat a été effectué." },
};

export default async function handler(req, res) {
  const user = await utilisateurRequis(req, res, ["admin", "superadmin"]);
  if (!user) return;
  if (req.method !== "PUT") return res.status(405).json({ ok: false, erreur: "Méthode non autorisée." });

  const id = Number(req.query.id);
  const { action, montant_rembourse, motif } = req.body || {};
  const regle = ACTIONS[action];
  if (!regle) return res.status(400).json({ ok: false, erreur: "Action inconnue." });

  try {
    const achat = await tx(async (client) => {
      const r = await client.query("SELECT * FROM achats WHERE id = $1 FOR UPDATE", [id]);
      const a = r.rows[0];
      if (!a) throw new Error("Achat introuvable.");
      if (!regle.depuis.includes(a.statut)) {
        throw new Error(`Impossible de passer de « ${a.statut} » à « ${action} ».`);
      }
      await client.query("UPDATE achats SET statut = $2, maj_le = now() WHERE id = $1", [id, action]);
      if (action === "rembourse") {
        // Écriture d'ajustement négative : le portefeuille reste recalculable.
        const montant = Number.isInteger(montant_rembourse) ? montant_rembourse : a.montant_verse;
        await client.query(
          `INSERT INTO ajustements (achat_id, montant, motif, admin_id) VALUES ($1, $2, $3, $4)`,
          [id, -Math.abs(montant), motif || "Remboursement après annulation", user.id]
        );
        const rc = await client.query(
          `SELECT COALESCE((SELECT SUM(montant_valide) FROM versements WHERE achat_id = $1 AND statut = 'valide'), 0)
                + COALESCE((SELECT SUM(montant) FROM ajustements WHERE achat_id = $1), 0) AS total`,
          [id]
        );
        await client.query("UPDATE achats SET montant_verse = $2 WHERE id = $1", [id, Number(rc.rows[0].total)]);
      }
      return { ...a, statut: action };
    });

    await auditer(user.id, `achat.${action}`, "achat", id, { motif: motif || null });
    await notifier(achat.client_id, `achat_${action}`, regle.titre, regle.corps, { achat_id: id });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, erreur: e.message });
  }
}
