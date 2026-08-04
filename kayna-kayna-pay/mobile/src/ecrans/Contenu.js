import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { Ecran, Carte, Chargement } from "../composants/Base";
import { api } from "../api/client";
import { couleurs } from "../theme";

// CGU, politique de confidentialité, FAQ, contact — servis par la plateforme
// et administrables sans mise à jour de l'application.
export default function Contenu({ route, navigation }) {
  const [contenu, setContenu] = useState(null);

  useEffect(() => {
    api(`/api/contenus/${route.params.cle}`).then((r) => r.ok && setContenu(r.contenu));
  }, [route.params.cle]);

  return (
    <Ecran titre={contenu ? contenu.titre : "…"} retour navigation={navigation}>
      {!contenu ? (
        <Chargement />
      ) : (
        <Carte>
          <Text style={{ color: couleurs.encre, fontSize: 14, lineHeight: 22 }}>{contenu.corps}</Text>
        </Carte>
      )}
    </Ecran>
  );
}
