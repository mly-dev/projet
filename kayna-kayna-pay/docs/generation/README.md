# Génération des documents

Trois documents Word (et leur PDF) sont produits depuis ce dossier. Ils
partagent la même mise en page : couverture, sommaire, en-tête, pied de page
numéroté, encadrés colorés et tableaux.

| Script | Document | Pour qui |
|---|---|---|
| `comprendre.cjs` | Comprendre Kayna Kayna Pay | Qui doit reprendre le projet, l'expliquer ou décider de son avenir |
| `essentiel.cjs` | L'essentiel | Le porteur du projet : l'indispensable, et comment installer pour essayer |
| `guide-utilisation.cjs` | Guide d'utilisation | Clients, équipe et partenaires : se servir du produit au quotidien |

## Produire les trois documents

```
cd docs/generation
npm install
node comprendre.cjs        ../Comprendre_Kayna_Kayna_Pay.docx
node essentiel.cjs         ../Kayna_Kayna_Pay_Essentiel.docx
node guide-utilisation.cjs ../Kayna_Kayna_Pay_Guide_Utilisation.docx
```

Puis les PDF, avec LibreOffice :

```
cd ..
soffice --headless --convert-to pdf --outdir . *.docx
```

## Pourquoi des fichiers `.cjs`

La racine du dépôt déclare `"type": "module"`. L'extension `.cjs` force le
mode CommonJS attendu par la bibliothèque `docx`.

## `mise-en-page.cjs`

La mise en page est là, et nulle part ailleurs : palette, tailles de texte,
titres, puces, étapes numérotées, blocs de commande, encadrés (`info`,
`attention`, `retenir`, `astuce`), tableaux, couverture, sommaire, en-tête et
pied de page. Un document ne redéfinit jamais une couleur ni une taille — il
assemble ces blocs. C'est ce qui fait que les trois se ressemblent.

Les polices sont Cambria (titres), Calibri (corps) et Consolas (code) : elles
sont présentes dans Microsoft Office, et LibreOffice leur substitue Caladea,
Carlito et un équivalent monospace de mêmes métriques — le rendu PDF est donc
fidèle à ce que verra un lecteur sous Word.
