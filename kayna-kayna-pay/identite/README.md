# Kayna Kayna Pay — Charte graphique

Livrable « charte graphique appliquée (logo, slogan) » du chapitre 11 du cahier
des charges.

## Le logo

![Logo](logo.svg)

**Le symbole est un anneau segmenté.** Chaque segment représente un versement :
les segments bleus sont ceux déjà effectués, le segment ambre est celui du jour,
les segments clairs sont ce qu'il reste à verser. Au centre, la pièce — le
produit à obtenir.

Le sens est littéral : **le tout se construit à partir de nombreux petits
versements.** C'est exactement ce que dit le nom en zarma, « petit à petit,
paye », et ce que fait le produit. Le symbole reprend le motif de progression
déjà présent dans l'application (barres de progression des portefeuilles) et
dans le pitch deck.

L'anneau est volontairement rempli aux trois quarts : la marque montre un
objectif en cours d'atteinte, pas une promesse déjà tenue.

## Fichiers

| Fichier | Usage |
|---|---|
| `logo.svg` | Logo horizontal complet (symbole + nom + slogan), fond clair |
| `logo-fond-sombre.svg` | Le même, pour fond bleu foncé |
| `logo-marque.svg` | Symbole seul, fond clair |
| `logo-marque-fond-sombre.svg` | Symbole seul, fond sombre |
| `splash.svg` | Écran de démarrage de l'application |
| `generer-logo.js` | Script de génération de tous les fichiers et déclinaisons |

Déclinaisons installées dans le projet :

| Fichier | Emplacement | Usage |
|---|---|---|
| `icone.png` (1024 px) | `mobile/assets/` | Icône de l'application |
| `icone-adaptative.png` | `mobile/assets/` | Icône adaptative Android (premier plan) |
| `splash.png` | `mobile/assets/` | Écran de démarrage |
| `logo-marque-blanc.png` | `mobile/assets/` | Écran de bienvenue |
| `favicon.png`, `favicon-32.png` | `plateforme/public/` | Onglet du navigateur |
| `logo-marque*.svg` | `plateforme/public/` | Espaces web (connexion, barre latérale) |

### Régénérer les fichiers

```bash
cd identite
npm install sharp      # si absent
node generer-logo.js ./sortie
```

Le script est la source de vérité : toute modification du logo passe par lui,
pas par une retouche des fichiers produits.

## Couleurs

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Principale | Bleu Kayna | `#005CA9` | Actions, liens, éléments actifs, segments versés |
| Foncée | Bleu profond | `#003A70` | Fonds sombres, titres, en-têtes, écran de démarrage |
| Accent | Ambre | `#F2A900` | **Avec parcimonie** : l'action clé (« Faire un versement »), le segment en cours |
| Surface | Bleu très clair | `#EAF2FA` | Fonds de cartes, puces de catégories |
| Bordure | Gris bleuté | `#D8E2EC` | Bordures, pistes de progression, segments restants |
| Texte | Encre | `#20344A` | Texte courant |
| Texte secondaire | Gris | `#5D7285` | Légendes, informations secondaires |
| Succès | Vert | `#1E8E3E` | Versement validé, achat complété |
| Erreur | Rouge | `#C5221F` | Rejet, suspension, annulation |

Le bleu domine, le blanc respire, **l'ambre ne sert qu'à une chose à la fois sur
un écran** : c'est ce qui lui garde sa force. Le vert et le rouge sont réservés
aux statuts, jamais à la décoration.

Les valeurs sont définies dans `mobile/src/theme.js` et
`plateforme/styles/globals.css` — un seul endroit chacune.

## Typographie

Arial / Liberation Sans (sans empattement, disponible partout, lisible sur les
téléphones d'entrée de gamme visés par le projet).

| Élément | Taille | Graisse |
|---|---|---|
| Titre d'écran | 17–22 px | 800 |
| Titre de section | 15–16 px | 800 |
| Texte courant | 13,5–15 px | 400 |
| Légende | 11,5–12,5 px | 400 |
| Montant mis en avant | 18–26 px | 900 |

## Ton et écriture

Le ton est **proche, clair et respectueux** — jamais administratif, jamais
condescendant.

- Vouvoiement, phrases courtes.
- Les messages d'erreur disent quoi faire : « Le versement minimum est de 100 F. »
  et non « Montant invalide ».
- Les montants s'écrivent avec une espace pour les milliers, suivis de `F` :
  `15 000 F`.
- L'encouragement reste modeste et concret : « Même 100 F aujourd'hui, c'est un
  pas de plus vers votre objectif. »
- Le zarma est présent aux moments symboliques (accueil, clôture), pas dans les
  écrans fonctionnels : il porte l'identité, il ne doit pas gêner la compréhension.

## Usages à éviter

- Déformer le logo, le faire pivoter, ou changer ses couleurs.
- Poser le logo sur fond clair dans sa version pour fond sombre (et inversement).
- Utiliser l'ambre comme couleur de fond étendue : c'est un accent.
- Ajouter un contour au symbole ou une ombre portée.
- Modifier le rapport de remplissage de l'anneau : les trois quarts font partie
  du sens.
