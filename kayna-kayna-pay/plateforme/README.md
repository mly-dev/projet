# Kayna Kayna Pay — Plateforme (backend + espaces web)

API de l'application mobile, espace web administrateur et espace web
partenaire. Next.js (API routes + pages), PostgreSQL, Socket.io pour le
temps réel. Montants en francs CFA entiers.

## Démarrage

Prérequis : Node 18+, PostgreSQL.

```bash
# 1. Base de données
sudo -u postgres psql -c "CREATE USER kkp WITH PASSWORD 'kkp' CREATEDB;" \
                      -c "CREATE DATABASE kaynakaynapay OWNER kkp;"

# 2. Configuration
cp .env.example .env    # ajustez DATABASE_URL et JWT_SECRET

# 3. Installation, migrations, données de démonstration
npm install
npm run db:migrer            # applique les migrations en attente
npm run db:seed

# 4. Serveur (Next.js + Socket.io) — http://localhost:3000
npm run dev
```

Comptes de démonstration (seed) :

| Rôle | Téléphone | Mot de passe | Espace |
|---|---|---|---|
| Super-admin | `+22790000000` | `superadmin123` | `/admin/file` |
| Admin | `+22790000010` | `admin123` | `/admin/file` |
| Partenaire | `+22792000001` | `partenaire123` | `/partenaire/tableau` |
| Client | `+22791111111` | `client123` | application mobile |

En développement, les SMS (codes OTP) s'affichent dans les journaux du
serveur (`SMS_FOURNISSEUR=console`).

> **Les comptes d'administration exigent un deuxième facteur** : après le mot de
> passe, un code est envoyé par SMS. En développement, relevez-le dans les
> journaux du serveur (ligne `[SMS → +227…]`).

## Test de bout en bout

Le script `npm run smoke` (serveur démarré) déroule le parcours complet —
inscription OTP, achat, versement, validation admin en temps réel, minuteur
expiré, rejet, complétion, intégrité comptable, contrôle d'accès — et vérifie
un à un les critères d'acceptation du chapitre 13 du cahier des charges, plus
les garanties de sécurité (deuxième facteur administrateur, cookie de session
httpOnly). **25 critères, tous verts.**

## Architecture

```
server.js            Serveur HTTP : Next.js + Socket.io + balayage du minuteur
db/migrations/       Migrations versionnées (versements immuables, transitions journalisées)
public/              Favicon et logo des espaces web
lib/
  versements.js      Machine à états : initié → en attente → validé/rejeté/en vérification
  achats.js          Démarrage d'achat (prix figé), portefeuilles, annulation
  auth.js            JWT, bcrypt, contrôle d'accès par rôle sur chaque route
  otp.js, sms/       OTP par SMS — fournisseur abstrait (console en dev)
  notifications.js   Notification = base + socket temps réel + push (stub FCM)
  audit.js           Journal d'audit des actions sensibles
pages/api/           API mobile (auth, catalogue, achats, versements, contenus)
pages/api/admin/     Validation des versements, achats, utilisateurs, catalogue,
                     paramètres, campagnes, journal d'audit
pages/api/partenaire/  Tableau de bord, produits, commandes
pages/admin/*        Espace web administrateur (file de validation temps réel…)
pages/partenaire/*   Espace web partenaire (consultation)
scripts/             migrer, seed, smoke
```

Principes tenus (cahier des charges §9.2) :

- **Intégrité financière** — un versement validé est une écriture immuable ;
  le solde d'un portefeuille est recalculé depuis les écritures (versements
  validés + ajustements), jamais modifié directement.
- **Machine à états** — transitions strictes, horodatées et journalisées
  (`versement_transitions`) ; anti-doublon en base (index partiel unique).
- **API unique multi-clients** — mobile, admin et partenaire consomment la
  même API avec jetons et rôles.
- **Module de paiement isolé** — la validation manuelle vit derrière
  `lib/versements.js` ; les API opérateurs pourront la remplacer sans refonte.

## Durcissement avant production

- `JWT_SECRET` fort et HTTPS obligatoire (le cookie de session passe
  automatiquement en `Secure` quand `NODE_ENV=production`).
- Passerelle SMS réelle dans `lib/sms/`, FCM réel dans `lib/push.js`.
- Limitation de débit partagée (Redis) si plusieurs instances.
- Sauvegardes quotidiennes chiffrées de la base.
- **Consultation juridique BCEAO/UEMOA avant tout lancement public** — les
  CGU du seed sont des projets de texte, pas des documents validés.
