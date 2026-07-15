import { Resvg } from "@resvg/resvg-js";

/**
 * Convertit un graphique SVG en PNG (1200px de large) pour l'upload sur les
 * réseaux sociaux — X n'accepte pas le SVG en pièce jointe.
 */
export function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: { loadSystemFonts: true },
  });
  return resvg.render().asPng();
}
