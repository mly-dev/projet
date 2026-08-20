import { createNavigationContainerRef } from "@react-navigation/native";

// Référence de navigation accessible hors des écrans : elle permet à un toast
// de notification d'ouvrir l'achat concerné, alors qu'il est rendu au-dessus
// de l'arbre de navigation et n'a donc pas de prop `navigation`.
export const refNavigation = createNavigationContainerRef();

export function naviguer(nom, params) {
  if (refNavigation.isReady()) refNavigation.navigate(nom, params);
}
