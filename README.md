# bip — l'assistant "Build in Public" automatisé

> Les créateurs de SaaS détestent faire du marketing, mais ont besoin de visibilité.
> `bip` écoute votre activité de développeur (commits GitHub, tâches Notion terminées)
> et rédige automatiquement des posts engageants pour **X (Twitter)**, **LinkedIn**
> et **Reddit** — avec un **graphique de progression** prêt à joindre.

Inspiré de la méthode "build in public" de Marc Lou : montrez les coulisses,
racontez une histoire, laissez le produit se vendre.

## Comment ça marche

```
GitHub (commits) ─┐
Notion (tâches) ──┼─→ Claude (storytelling) ─→ x-thread.md / linkedin.md / reddit.md
Stripe (MRR) ─────┘                        ├─→ progression.svg (commits par jour)
                                           └─→ revenus.svg (encaissements + MRR)
```

1. **Collecte** — les commits du dépôt sur la période (GitHub API) et les tâches
   marquées "terminées" dans votre base Notion (optionnel).
2. **Storytelling** — Claude transforme le jargon technique ("fix: webhook
   signature verification") en une histoire de solopreneur : galères, victoires,
   leçons apprises. Ton adapté à chaque plateforme.
3. **Graphique** — un SVG "commits par jour" au format carte X (1200×675),
   avec le total en chiffre héros.
4. **Brouillons** — tout est écrit dans `output/AAAA-MM-JJ/`. Vous relisez,
   vous ajustez, vous publiez. Retournez coder.

## Installation

```bash
git clone <ce-dépôt> && cd projet
npm install
npm run build
cp .env.example .env   # puis remplissez ANTHROPIC_API_KEY (et le reste)
```

## Utilisation

```bash
# Essai immédiat, sans configuration (données d'exemple, pas d'appel IA)
npm run dev -- generate --demo --skip-posts

# Le vrai flux : votre dépôt, 7 derniers jours, posts en anglais
npm run dev -- generate --repo vous/votre-saas --days 7

# Posts en français, uniquement pour X, avec du contexte produit
npm run dev -- generate --repo vous/votre-saas --lang fr --platforms x \
  --context "SaaS d'emailing pour créateurs de contenu, cible US"

# Publier le thread généré sur X (aperçu sans --yes, publication avec)
npm run dev -- publish
npm run dev -- publish --yes
```

### Options

| Option | Description | Défaut |
|---|---|---|
| `--repo <owner/repo>` | Dépôt GitHub à analyser | `GITHUB_REPO` du `.env` |
| `--days <n>` | Période analysée en jours | `7` |
| `--platforms <liste>` | `x,linkedin,reddit` | les trois |
| `--lang <fr\|en>` | Langue des posts | `en` |
| `--context <texte>` | Contexte produit pour l'IA | — |
| `--out <dossier>` | Dossier de sortie | `./output` |
| `--demo` | Données d'exemple (aucun accès GitHub/Notion) | — |
| `--skip-posts` | Graphique seul, pas d'appel IA | — |

### Configuration (`.env`)

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | **Requis** pour la rédaction des posts |
| `GITHUB_TOKEN` | Optionnel — dépôts privés et rate limit étendue |
| `GITHUB_REPO` | Dépôt par défaut (`owner/repo`) |
| `NOTION_TOKEN` | Optionnel — active la source Notion |
| `NOTION_DATABASE_ID` | Base Notion contenant vos tâches |
| `NOTION_STATUS_PROPERTY` | Nom de la propriété de statut (défaut `Status`) |
| `NOTION_DONE_VALUE` | Valeur "terminé" (défaut `Done`) — propriétés `status`, `select` ou `checkbox` supportées |
| `STRIPE_SECRET_KEY` | Optionnel — MRR dans le storytelling + graphique `revenus.svg` |
| `X_API_KEY` `X_API_SECRET` `X_ACCESS_TOKEN` `X_ACCESS_SECRET` | Requis pour `bip publish` — app developer.x.com avec accès "Read and write" (OAuth 1.0a) |

## Ce que produit une exécution

```
output/2026-07-14/
├── progression.svg   # graphique commits/jour, ratio 16:9, prêt à joindre
├── revenus.svg       # encaissements/jour + MRR héros (si Stripe configuré)
├── posts.json        # les trois posts en JSON structuré
├── x-thread.md       # thread X : hook + 3-6 tweets
├── linkedin.md       # post narratif avec leçon métier
└── reddit.md         # titre + corps, ton authentique r/SaaS
```

## Publication automatique du vendredi (mode cron)

Le workflow `.github/workflows/buildinpublic.yml` tourne **chaque vendredi à
9h UTC** (et à la demande via *Run workflow*) :

1. collecte la semaine écoulée du dépôt courant,
2. rédige les brouillons et les dépose en **artefact** téléchargeable,
3. **publie le thread X automatiquement** si les 4 secrets X sont définis.

Configurez les secrets dans *Settings → Secrets and variables → Actions* :
`ANTHROPIC_API_KEY` (requis), puis selon vos besoins `NOTION_TOKEN`,
`NOTION_DATABASE_ID`, `STRIPE_SECRET_KEY`, `X_API_KEY`, `X_API_SECRET`,
`X_ACCESS_TOKEN`, `X_ACCESS_SECRET`.

## Philosophie du storytelling

L'IA suit des règles strictes pour éviter le contenu générique :

- **Hook obligatoire** — une tension, un chiffre, une confession. Jamais
  "cette semaine j'ai travaillé sur…".
- **Coulisses honnêtes** — ce qui a cassé compte autant que ce qui a marché.
- **Jargon traduit** — un lecteur non-développeur doit tout comprendre.
- **Zéro marketing creux** — pas de superlatifs, pas de spam de hashtags,
  ton "builder qui partage" et non "marque qui vend".

## Roadmap

- [x] Publication directe sur X (`bip publish`)
- [x] Mode cron : un post automatique chaque vendredi (GitHub Actions)
- [x] Source Stripe : MRR + graphique des encaissements
- [ ] Upload du graphique en pièce jointe du tweet (media upload)
- [ ] Publication LinkedIn
- [ ] Sources supplémentaires : Linear, Plausible (trafic)
- [ ] Graphique streak de jours consécutifs
- [ ] Mémoire des posts précédents pour éviter les répétitions

## Licence

MIT
