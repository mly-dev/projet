# Kayna Kayna Pay — « Petit à petit, paye »

Dossier projet de **Kayna Kayna Pay**, la première plateforme d'achat par
paiement progressif (« save now, buy later ») au Niger. Le client choisit un
produit ou un service, verse par mobile money (NITA, Amana, Wave) au montant
et à la fréquence de son choix — même 100 F —, et reçoit son achat une fois
le montant total atteint.

> *« Kayan si djineh koy yan gandji »* — Faire petit n'empêche pas d'avancer.

## Contenu du dossier

```
kayna-kayna-pay/
├── docs/                        Documentation du projet (voir l'index ci-dessous)
├── identite/                    Logo, déclinaisons et charte graphique
├── pitch/
│   ├── Kayna_Kayna_Pay_Pitch_Deck.pptx   Présentation de pitch (13 diapositives, modifiable)
│   └── Kayna_Kayna_Pay_Pitch_Deck.pdf    La même, en PDF (partage WhatsApp / impression)
├── plateforme/                  MVP — backend API + espace admin + espace partenaire
│                                (Next.js, PostgreSQL, Socket.io — voir plateforme/README.md)
└── mobile/                      MVP — application mobile client (Expo / React Native, JavaScript
                                 — voir mobile/README.md)
```

Le pitch deck reprend fidèlement le contenu du document de présentation, aux
couleurs de la marque (bleu Ecobank et blanc), pour les rendez-vous avec les
partenaires pilotes, institutions et investisseurs. Les montants qui y
figurent en illustration (exemple de prix, maquette d'écran) sont fictifs.

## Documentation

| Document | Pour qui | Contenu |
|---|---|---|
| [`docs/presentation.md`](docs/presentation.md) | tous | Le projet dans son ensemble, sans technique |
| [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md) | tous | Exigences fonctionnelles et techniques v1.0 — **la référence** |
| [`docs/guide-essai.md`](docs/guide-essai.md) | **pour commencer** | Tester le parcours complet sur un vrai téléphone avec Expo, pas à pas |
| [`docs/exploitation.md`](docs/exploitation.md) | **équipe d'exploitation** | Procédure de validation des versements, gestion des litiges, sauvegardes, surveillance |
| [`docs/backend.md`](docs/backend.md) | développeurs | Architecture du serveur, modules, parcours de versement, sécurité, recettes de développement |
| [`docs/api.md`](docs/api.md) | développeurs | Référence des 33 routes de l'API, temps réel, codes d'erreur |
| [`docs/schema-donnees.md`](docs/schema-donnees.md) | développeurs | Tables, relations, invariants financiers, transactions |
| [`docs/journal-de-developpement.md`](docs/journal-de-developpement.md) | tous | Ce qui a été construit, décisions et leurs raisons, écarts assumés, points de vigilance |
| [`identite/README.md`](identite/README.md) | communication, développeurs | Logo et son sens, couleurs, typographie, ton, usages à éviter |
| [`plateforme/README.md`](plateforme/README.md) | développeurs | Installation et démarrage de la plateforme |
| [`mobile/README.md`](mobile/README.md) | développeurs | Installation et démarrage de l'application mobile |
| `docs/originaux/` | archives | Versions Word de référence des deux documents fondateurs |

Trois entrées possibles selon le besoin : **exploiter le service au quotidien**
→ `exploitation.md` ; **reprendre le code** → `backend.md`, puis `api.md` et
`schema-donnees.md` ; **comprendre les choix faits** → `journal-de-developpement.md`.

## État du projet

| Étape | Statut |
|---|---|
| Document de présentation | ✅ Rédigé (août 2026) |
| Cahier des charges v1.0 | ✅ Rédigé — règles « à définir » à arbitrer |
| Pitch deck | ✅ Généré à partir du document de présentation |
| MVP plateforme (API, admin, partenaire) | ✅ Développé — 25/25 critères passent (`npm run smoke`) |
| MVP application mobile (Expo, Android) | ✅ Développé — 16 écrans, parcours de versement complet, temps réel |
| Identité visuelle (logo, charte) | ✅ Logo créé, décliné et intégré ; charte documentée |
| Durcissement sécurité | ✅ Double authentification admin, session en cookie httpOnly, migrations versionnées |
| Essai sur un vrai téléphone | ⬜ **À faire en priorité** — jamais lancée sur un appareil réel |
| Photos de produits | ⬜ Champ prêt en base, upload à développer |
| Cadre juridique (BCEAO/UEMOA) | ⬜ Consultation à engager avant tout lancement public |
| CGU et politique de confidentialité | 🔶 Projets de texte intégrés (seed) — à faire valider juridiquement |
| Pilote avec partenaires vérifiés | ⬜ Phase 2 |

## Démarrer le MVP en local

```bash
cd plateforme && npm install && npm run db:migrer && npm run db:seed && npm run dev
# puis, dans un autre terminal :
cd mobile && npm install && EXPO_PUBLIC_API_URL=http://<ip-locale>:3000 npx expo start
```

Espace admin : http://localhost:3000 (`+22790000010` / `admin123`, puis le code
de connexion affiché dans les journaux du serveur — les comptes d'administration
exigent un deuxième facteur).

Détails et comptes de démonstration dans `plateforme/README.md` et `mobile/README.md`.

## Prochaines étapes

1. **Lancer l'application sur un vrai téléphone** (Expo Go) — jamais fait, et
   tout le reste en dépend.
2. Arbitrer les règles de gestion marquées « à définir » dans le cahier des
   charges (frais d'annulation, délai d'inactivité, règle d'arrondi) — les
   paramètres sont déjà modifiables depuis l'espace super-admin.
3. Engager la consultation juridique (réglementation BCEAO/UEMOA, services
   de paiement et collecte de fonds) et faire valider les projets de CGU.
4. Brancher une passerelle SMS locale — elle conditionne les inscriptions
   clients **et** la connexion des administrateurs.
5. Développer les photos de produits, déployer la plateforme, signer les
   premiers partenaires pilotes (pitch deck à l'appui), puis lancer le pilote
   avec de vrais dépôts mobile money de faible montant (recette du MVP).
