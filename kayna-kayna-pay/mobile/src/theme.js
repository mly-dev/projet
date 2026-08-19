// Charte Kayna Kayna Pay appliquée à l'application mobile.
// Référence : identite/README.md

export const couleurs = {
  bleu: "#005CA9",
  bleuVif: "#0B74CC",
  bleuFonce: "#003A70",
  bleuNuit: "#00284D",
  bleuClair: "#EAF2FA",
  bleuPale: "#F4F9FD",

  ambre: "#F2A900",
  ambreFonce: "#9A6C00",
  ambrePale: "#FFF7E6",

  encre: "#16293B",
  encre2: "#4A5F74",
  encre3: "#7B8FA3",

  bord: "#DDE7F0",
  bordFort: "#C3D4E3",
  fond: "#F3F7FB",
  surface: "#FFFFFF",

  vert: "#127A3A",
  vertPale: "#E7F6EC",
  rouge: "#C0281F",
  rougePale: "#FDECEA",
  orange: "#B45C00",
  orangePale: "#FFF2E0",

  blanc: "#FFFFFF",
};

// Échelle typographique — une seule source, pour éviter les tailles au hasard.
export const texte = {
  titreEcran: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  titre: { fontSize: 17, fontWeight: "800" },
  sousTitre: { fontSize: 15, fontWeight: "700" },
  corps: { fontSize: 14.5, lineHeight: 21 },
  corpsFort: { fontSize: 14.5, fontWeight: "700" },
  petit: { fontSize: 12.5, lineHeight: 18 },
  legende: { fontSize: 11.5 },
  montant: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  montantGrand: { fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
};

// Rythme d'espacement — multiples de 4.
export const espace = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 };

export const rayon = { sm: 8, md: 12, lg: 16, xl: 22, rond: 999 };

// Élévations, discrètes : l'écran d'un téléphone d'entrée de gamme rend mal
// les ombres trop marquées.
export const ombre = {
  carte: {
    shadowColor: "#0F2942",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  flottant: {
    shadowColor: "#0F2942",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};

export function fcfa(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " F";
}

// Montant compact pour les espaces contraints : 672 000 F → 672 k F
export function fcfaCourt(n) {
  const v = Number(n || 0);
  if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + " M F";
  if (v >= 10000) return Math.round(v / 1000) + " k F";
  return fcfa(v);
}

// Repère de durée affiché dans les listes du catalogue. Un rythme fixe donnerait
// des chiffres absurdes (« 1 344 jours » pour une moto) : on choisit le plus
// petit versement quotidien qui ramène l'échéance sous six mois, et on exprime
// le résultat dans l'unité qui se lit — jours, semaines ou mois.
const RYTHMES_INDICATIFS = [200, 500, 1000, 2000, 5000, 10000, 25000];

export function rythmeIndicatif(prix) {
  const total = Number(prix || 0);
  if (total <= 0) return null;
  const rythme =
    RYTHMES_INDICATIFS.find((r) => total / r <= 180) ||
    RYTHMES_INDICATIFS[RYTHMES_INDICATIFS.length - 1];
  const jours = Math.ceil(total / rythme);
  const duree =
    jours <= 21 ? `${jours} j`
    : jours <= 70 ? `${Math.round(jours / 7)} sem.`
    : `${Math.round(jours / 30)} mois`;
  return { rythme, jours, duree, libelle: `≈ ${duree} à ${fcfa(rythme)}/jour` };
}

export const OPERATEURS = [
  { cle: "nita", nom: "NITA" },
  { cle: "amana", nom: "Amana" },
  { cle: "wave", nom: "Wave" },
];

// Correspondance état → libellé et couleurs, partagée par tous les écrans.
export const ETATS_VERSEMENT = {
  initie: { libelle: "à finaliser", fond: couleurs.bleuClair, texte: couleurs.bleu },
  en_attente: { libelle: "en attente", fond: couleurs.ambrePale, texte: couleurs.ambreFonce },
  en_verification: { libelle: "en vérification", fond: couleurs.orangePale, texte: couleurs.orange },
  valide: { libelle: "validé", fond: couleurs.vertPale, texte: couleurs.vert },
  rejete: { libelle: "rejeté", fond: couleurs.rougePale, texte: couleurs.rouge },
};

export const ETATS_ACHAT = {
  en_cours: { libelle: "en cours", fond: couleurs.bleuClair, texte: couleurs.bleu },
  complete: { libelle: "complété", fond: couleurs.vertPale, texte: couleurs.vert },
  en_preparation: { libelle: "en préparation", fond: couleurs.ambrePale, texte: couleurs.ambreFonce },
  livre: { libelle: "livré", fond: couleurs.vertPale, texte: couleurs.vert },
  annule: { libelle: "annulé", fond: couleurs.rougePale, texte: couleurs.rouge },
  rembourse: { libelle: "remboursé", fond: couleurs.rougePale, texte: couleurs.rouge },
};
