-- Double authentification des administrateurs (cahier des charges §10).
-- Ajoute l'usage 'connexion' aux codes OTP : après vérification du mot de passe,
-- un administrateur reçoit un code par SMS avant l'ouverture de sa session.

ALTER TABLE otp_codes DROP CONSTRAINT IF EXISTS otp_codes_usage_check;

ALTER TABLE otp_codes
  ADD CONSTRAINT otp_codes_usage_check
  CHECK (usage IN ('inscription', 'reinitialisation', 'connexion'));
