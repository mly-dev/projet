import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { Ecran, Carte, CarteSquelette, Vide } from "../composants/Base";
import { api } from "../api/client";
import { couleurs, espace } from "../theme";

// CGU, politique de confidentialité, FAQ, contact — servis par la plateforme
// et administrables sans mise à jour de l'application.
export default function Contenu({ route, navigation }) {
  const [contenu, setContenu] = useState(null);
  const [absent, setAbsent] = useState(false);

  useEffect(() => {
    api(`/api/contenus/${route.params.cle}`).then((r) => {
      if (r.ok) setContenu(r.contenu);
      else setAbsent(true);
    });
  }, [route.params.cle]);

  return (
    <Ecran titre={contenu ? contenu.titre : "Chargement…"} retour navigation={navigation}>
      {absent ? (
        <Vide
          icone="📄"
          titre="Document indisponible"
          detail="Ce texte n'a pas pu être chargé. Vérifiez votre connexion et réessayez."
        />
      ) : !contenu ? (
        <>
          <CarteSquelette lignes={4} />
          <CarteSquelette lignes={3} />
        </>
      ) : (
        <Carte>
          <Text style={{ color: couleurs.encre, fontSize: 14.5, lineHeight: 23 }}>{contenu.corps}</Text>
          {contenu.maj_le ? (
            <Text style={{ color: couleurs.encre3, fontSize: 11.5, marginTop: espace.lg }}>
              Mis à jour le {new Date(contenu.maj_le).toLocaleDateString("fr-FR")}
            </Text>
          ) : null}
        </Carte>
      )}
    </Ecran>
  );
}
