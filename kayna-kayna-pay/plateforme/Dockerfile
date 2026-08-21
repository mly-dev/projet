# Image de la plateforme Kayna Kayna Pay.
#
# Une image décrit la plateforme et tout ce dont elle a besoin pour tourner :
# la version de Node, les dépendances, les fichiers, la commande de démarrage.
# C'est ce qui remplace « installez Node, puis PostgreSQL, puis lancez npm
# install » — cette suite d'instructions donne un résultat différent sur chaque
# machine, et c'est justement ce qu'on veut éviter en mise en ligne.
#
# Presque tous les hébergeurs savent la construire seuls à partir du dépôt.
# Elle marche aussi telle quelle sur un serveur loué, sans rien changer : c'est
# ce qui empêche d'être prisonnier d'un fournisseur.
#
#   docker build -t kkp .
#   docker run --rm -p 3000:3000 --env-file .env kkp

# Debian et non Alpine : sharp, qui fabrique les vignettes, est distribué en
# binaire compilé pour la glibc. Sur Alpine il faudrait le recompiler à chaque
# construction — plusieurs minutes, pour une image à peine plus légère.
FROM node:22-bookworm-slim AS base
WORKDIR /app

# ── Dépendances ──────────────────────────────────────────────────────────────
# Étape séparée et copiée en premier : tant que package-lock.json ne change pas,
# elle est reprise du cache. Les constructions suivantes durent des secondes.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Construction ─────────────────────────────────────────────────────────────
# `next build` compile une fois pour toutes les pages des espaces web. En
# développement elles sont compilées à la première visite — d'où les « Compiling
# /admin/… » du journal, et l'attente correspondante pour le visiteur.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Exécution ────────────────────────────────────────────────────────────────
FROM base AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    MEDIAS_DIR=/data/medias \
    TRUST_PROXY=1

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/.next        ./.next
COPY . .

# Les photos vivent hors de l'application : ce dossier est le point de montage
# du volume. Sans volume monté ici, elles sont perdues au déploiement suivant —
# lib/config.js le dit au démarrage plutôt que de laisser la surprise venir.
RUN mkdir -p /data/medias && chown -R node:node /data

# Le conteneur ne tourne pas en root : une faille d'exécution de code y gagne
# beaucoup moins.
USER node
EXPOSE 3000

# La sonde interroge la base, et non un simple « le processus est vivant » :
# une plateforme qui ne joint plus sa base doit être déclarée malade.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/sante').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Les migrations en attente sont appliquées avant que le serveur n'écoute.
# Deux processus successifs et non un seul : le migrateur ferme sa connexion en
# terminant, et il ne doit pas fermer celle du serveur.
CMD ["sh", "-c", "node scripts/migrer.js && node server.js"]
