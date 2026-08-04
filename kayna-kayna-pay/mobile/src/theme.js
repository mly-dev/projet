// Charte Kayna Kayna Pay : bleu (bleu Ecobank) et blanc.
export const couleurs = {
  bleu: "#005CA9",
  bleuFonce: "#003A70",
  bleuClair: "#EAF2FA",
  encre: "#20344A",
  gris: "#5D7285",
  ambre: "#F2A900",
  bord: "#D8E2EC",
  fond: "#F5F8FB",
  blanc: "#FFFFFF",
  vert: "#1E8E3E",
  rouge: "#C5221F",
};

export function fcfa(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " F";
}

export const OPERATEURS = [
  { cle: "nita", nom: "NITA" },
  { cle: "amana", nom: "Amana" },
  { cle: "wave", nom: "Wave" },
];
