@echo off
REM ============================================================
REM  Kayna Kayna Pay - mise a jour du projet depuis GitHub
REM
REM  Double-cliquez ce fichier, ou lancez-le depuis une fenetre
REM  de commandes. Il recupere la derniere version du code.
REM
REM  Pourquoi ce script existe : npm reecrit les fichiers
REM  package-lock.json a chaque installation, et selon la version
REM  de npm installee, le resultat differe de celui du depot. Git
REM  refuse alors de telecharger les nouveautes pour ne pas
REM  ecraser ces modifications. Ces fichiers etant entierement
REM  generes par la machine, les remettre en l'etat ne fait
REM  perdre aucun travail.
REM ============================================================
setlocal
set BRANCHE=claude/kayna-kayna-pay-presentation-gp4lgf

cd /d "%~dp0.."
if errorlevel 1 (
  echo   Impossible de trouver le dossier du projet.
  pause
  exit /b 1
)

echo.
echo   Mise a jour de Kayna Kayna Pay
echo   ==============================
echo.

echo   [1/2] Remise en etat des fichiers de verrouillage npm...
git checkout -- kayna-kayna-pay/mobile/package-lock.json 2>nul
git checkout -- kayna-kayna-pay/plateforme/package-lock.json 2>nul

echo   [2/2] Telechargement de la derniere version...
git pull origin %BRANCHE%
if errorlevel 1 (
  echo.
  echo   ECHEC. Copiez le message ci-dessus et transmettez-le.
  echo   Rien n'a ete modifie.
  pause
  exit /b 1
)

echo.
echo   Termine.
echo.
echo   Relancez maintenant les deux fenetres :
echo     Fenetre 1 :  cd kayna-kayna-pay\plateforme
echo                  npm run dev
echo     Fenetre 2 :  cd kayna-kayna-pay\mobile
echo                  npx expo start -c
echo.
pause
