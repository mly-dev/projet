const { query } = require("./db");

// Trace une action sensible dans le journal d'audit (qui, quoi, quand).
async function auditer(userId, action, cibleType, cibleId, details = {}) {
  await query(
    `INSERT INTO audit_journal (user_id, action, cible_type, cible_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, cibleType, cibleId == null ? null : String(cibleId), JSON.stringify(details)]
  );
}

module.exports = { auditer };
