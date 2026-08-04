-- Kayna Kayna Pay — schéma de la base de données
-- Montants stockés en francs CFA entiers (le FCFA n'a pas de subdivision).

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  telephone      VARCHAR(20) NOT NULL UNIQUE,
  nom            TEXT        NOT NULL,
  mot_de_passe_hash TEXT     NOT NULL,
  role           TEXT        NOT NULL DEFAULT 'client'
                 CHECK (role IN ('client', 'partenaire', 'admin', 'superadmin')),
  telephone_verifie BOOLEAN  NOT NULL DEFAULT FALSE,
  statut         TEXT        NOT NULL DEFAULT 'actif'
                 CHECK (statut IN ('actif', 'suspendu', 'supprime')),
  cgu_acceptees_le TIMESTAMPTZ,
  cree_le        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id         SERIAL PRIMARY KEY,
  telephone  VARCHAR(20) NOT NULL,
  code       VARCHAR(6)  NOT NULL,
  usage      TEXT        NOT NULL CHECK (usage IN ('inscription', 'reinitialisation')),
  expire_le  TIMESTAMPTZ NOT NULL,
  utilise    BOOLEAN     NOT NULL DEFAULT FALSE,
  cree_le    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_codes_tel_idx ON otp_codes (telephone, usage, utilise);

CREATE TABLE IF NOT EXISTS partenaires (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users (id),
  enseigne    TEXT NOT NULL,
  contact     TEXT,
  coordonnees_reglement TEXT,
  statut      TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu')),
  cree_le     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id     SERIAL PRIMARY KEY,
  nom    TEXT NOT NULL,
  slug   TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  ordre  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS produits (
  id              SERIAL PRIMARY KEY,
  partenaire_id   INTEGER NOT NULL REFERENCES partenaires (id),
  categorie_id    INTEGER NOT NULL REFERENCES categories (id),
  nom             TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  prix_partenaire INTEGER NOT NULL CHECK (prix_partenaire > 0),
  prix_affiche    INTEGER NOT NULL CHECK (prix_affiche >= prix_partenaire),
  photos          JSONB   NOT NULL DEFAULT '[]',
  disponible      BOOLEAN NOT NULL DEFAULT TRUE,
  mis_en_avant    BOOLEAN NOT NULL DEFAULT FALSE,
  modalites_remise TEXT   NOT NULL DEFAULT 'Retrait chez le partenaire',
  statut_validation TEXT  NOT NULL DEFAULT 'valide'
                  CHECK (statut_validation IN ('en_attente', 'valide', 'refuse')),
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  maj_le          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS produits_categorie_idx ON produits (categorie_id);
CREATE INDEX IF NOT EXISTS produits_partenaire_idx ON produits (partenaire_id);

CREATE TABLE IF NOT EXISTS achats (
  id           SERIAL PRIMARY KEY,
  reference    VARCHAR(12) NOT NULL UNIQUE,
  client_id    INTEGER NOT NULL REFERENCES users (id),
  produit_id   INTEGER NOT NULL REFERENCES produits (id),
  prix_total   INTEGER NOT NULL CHECK (prix_total > 0), -- figé au démarrage de l'achat
  montant_verse INTEGER NOT NULL DEFAULT 0,             -- cache, recalculable (versements validés + ajustements)
  statut       TEXT    NOT NULL DEFAULT 'en_cours'
               CHECK (statut IN ('en_cours', 'complete', 'en_preparation', 'livre', 'annule', 'rembourse')),
  annulation_demandee BOOLEAN NOT NULL DEFAULT FALSE,
  annulation_motif    TEXT,
  cree_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
  maj_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
  complete_le  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS achats_client_idx ON achats (client_id);
CREATE INDEX IF NOT EXISTS achats_statut_idx ON achats (statut);

-- Les versements sont des écritures immuables : une fois validé ou rejeté,
-- un versement ne change plus. Toute correction passe par un ajustement tracé.
CREATE TABLE IF NOT EXISTS versements (
  id              SERIAL PRIMARY KEY,
  reference       VARCHAR(12) NOT NULL UNIQUE, -- ex. KKP-4F7B2
  achat_id        INTEGER NOT NULL REFERENCES achats (id),
  client_id       INTEGER NOT NULL REFERENCES users (id),
  operateur       TEXT    NOT NULL CHECK (operateur IN ('nita', 'amana', 'wave')),
  montant_declare INTEGER NOT NULL CHECK (montant_declare > 0),
  montant_valide  INTEGER,
  statut          TEXT    NOT NULL DEFAULT 'initie'
                  CHECK (statut IN ('initie', 'en_attente', 'valide', 'rejete', 'en_verification')),
  motif_rejet     TEXT,
  valide_par      INTEGER REFERENCES users (id),
  initie_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
  depot_confirme_le TIMESTAMPTZ,
  statut_maj_le   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS versements_statut_idx ON versements (statut);
CREATE INDEX IF NOT EXISTS versements_achat_idx ON versements (achat_id);
-- Anti-doublon : un seul versement actif (initié ou en attente) par achat.
CREATE UNIQUE INDEX IF NOT EXISTS versement_actif_unique
  ON versements (achat_id) WHERE statut IN ('initie', 'en_attente');

-- Journal des transitions de la machine à états (horodatées, qui, quoi).
CREATE TABLE IF NOT EXISTS versement_transitions (
  id           SERIAL PRIMARY KEY,
  versement_id INTEGER NOT NULL REFERENCES versements (id),
  de           TEXT,
  vers         TEXT    NOT NULL,
  par_user_id  INTEGER REFERENCES users (id), -- NULL = système
  note         TEXT,
  le           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transitions_versement_idx ON versement_transitions (versement_id);

-- Écritures d'ajustement (corrections admin) : jamais de modification directe de solde.
CREATE TABLE IF NOT EXISTS ajustements (
  id        SERIAL PRIMARY KEY,
  achat_id  INTEGER NOT NULL REFERENCES achats (id),
  montant   INTEGER NOT NULL, -- signé
  motif     TEXT    NOT NULL,
  admin_id  INTEGER NOT NULL REFERENCES users (id),
  cree_le   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id       SERIAL PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users (id),
  type     TEXT    NOT NULL,
  titre    TEXT    NOT NULL,
  corps    TEXT    NOT NULL,
  donnees  JSONB   NOT NULL DEFAULT '{}',
  lue      BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, lue);

CREATE TABLE IF NOT EXISTS parametres (
  cle    TEXT PRIMARY KEY,
  valeur JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_journal (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users (id), -- NULL = système
  action     TEXT NOT NULL,
  cible_type TEXT,
  cible_id   TEXT,
  details    JSONB NOT NULL DEFAULT '{}',
  cree_le    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_journal (action, cree_le);

CREATE TABLE IF NOT EXISTS contenus (
  cle    TEXT PRIMARY KEY, -- cgu, confidentialite, faq, contact
  titre  TEXT NOT NULL,
  corps  TEXT NOT NULL,
  maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
