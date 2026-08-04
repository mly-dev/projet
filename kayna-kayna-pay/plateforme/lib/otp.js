const crypto = require("crypto");
const { query } = require("./db");
const { envoyerSms } = require("./sms");

const VALIDITE_MINUTES = 10;

async function envoyerOtp(telephone, usage) {
  const code = String(crypto.randomInt(100000, 1000000));
  await query(
    `INSERT INTO otp_codes (telephone, code, usage, expire_le)
     VALUES ($1, $2, $3, now() + interval '${VALIDITE_MINUTES} minutes')`,
    [telephone, code, usage]
  );
  await envoyerSms(
    telephone,
    `Kayna Kayna Pay : votre code de vérification est ${code}. Il expire dans ${VALIDITE_MINUTES} minutes.`
  );
}

async function verifierOtp(telephone, code, usage) {
  const r = await query(
    `SELECT id FROM otp_codes
     WHERE telephone = $1 AND code = $2 AND usage = $3
       AND utilise = FALSE AND expire_le > now()
     ORDER BY id DESC LIMIT 1`,
    [telephone, String(code || ""), usage]
  );
  if (!r.rows.length) return false;
  await query("UPDATE otp_codes SET utilise = TRUE WHERE id = $1", [r.rows[0].id]);
  return true;
}

module.exports = { envoyerOtp, verifierOtp };
