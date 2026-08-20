#!/usr/bin/env bash
# Kayna Kayna Pay — mise à jour du projet depuis GitHub (macOS, Linux).
# Équivalent de maj.cmd. Voir ce dernier pour l'explication détaillée : npm
# réécrit les package-lock.json selon sa version, ce qui bloque git pull. Ces
# fichiers étant entièrement générés, les remettre en l'état ne fait perdre
# aucun travail.
set -e

BRANCHE="claude/kayna-kayna-pay-presentation-gp4lgf"
cd "$(dirname "$0")/.."

echo
echo "  Mise à jour de Kayna Kayna Pay"
echo "  =============================="
echo
echo "  [1/2] Remise en état des fichiers de verrouillage npm…"
git checkout -- kayna-kayna-pay/mobile/package-lock.json 2>/dev/null || true
git checkout -- kayna-kayna-pay/plateforme/package-lock.json 2>/dev/null || true

echo "  [2/2] Téléchargement de la dernière version…"
git pull origin "$BRANCHE"

echo
echo "  Terminé. Relancez les deux fenêtres :"
echo "    Fenêtre 1 :  cd kayna-kayna-pay/plateforme && npm run dev"
echo "    Fenêtre 2 :  cd kayna-kayna-pay/mobile && npx expo start -c"
echo
