import React, { useCallback, useState, useEffect } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ecran, Carte, CarteSquelette, Vide, Alerte } from "../composants/Base";
import { api } from "../api/client";
import { surNotification } from "../api/socket";
import { useNotifications } from "../contexte/Notifications";
import { couleurs, texte, espace, rayon } from "../theme";

// Pictogramme par type : la liste se lit d'un coup d'œil, sans lire les titres.
const ICONES = {
  versement_valide: ["✅", couleurs.vertPale],
  versement_rejete: ["⚠️", couleurs.rougePale],
  versement_verification: ["🔎", couleurs.orangePale],
  achat_complete: ["🎉", couleurs.ambrePale],
  achat_livre: ["📦", couleurs.vertPale],
  campagne: ["💬", couleurs.bleuClair],
};

function quand(date) {
  const d = new Date(date);
  const minutes = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 24) return `il y a ${Math.round(minutes / 60)} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default function Notifications() {
  const [liste, setListe] = useState(null);
  const { rafraichir, enLigne } = useNotifications();

  const charger = useCallback(async () => {
    const r = await api("/api/notifications");
    if (!r.ok) return;
    setListe(r.notifications);
    // Ouvrir l'écran vaut lecture : on marque tout lu, puis on remet la
    // pastille de l'onglet à jour.
    if (r.non_lues > 0) await api("/api/notifications", { method: "POST" });
    rafraichir();
  }, [rafraichir]);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));
  useEffect(() => surNotification(() => charger()), [charger]);

  return (
    <Ecran titre="Notifications" onRafraichir={charger}>
      {/* Sans cet avertissement, une liste vide pendant une coupure réseau se
          lit comme « il ne s'est rien passé » — ce qui est faux. */}
      {!enLigne ? (
        <Alerte type="attention">
          Temps réel indisponible : les nouvelles notifications peuvent tarder à
          apparaître. Tirez la liste vers le bas pour la rafraîchir.
        </Alerte>
      ) : null}

      {liste === null ? (
        <>
          <CarteSquelette lignes={2} />
          <CarteSquelette lignes={2} />
        </>
      ) : liste.length === 0 ? (
        <Vide
          icone="🔔"
          titre="Rien pour le moment"
          detail="Les validations de vos versements et l'avancement de vos achats apparaîtront ici, en temps réel."
        />
      ) : (
        liste.map((n) => {
          const [icone, fond] = ICONES[n.type] || ["🔔", couleurs.bleuClair];
          return (
            <Carte key={n.id} style={!n.lue ? { borderColor: couleurs.bleu, borderWidth: 1.5 } : null}>
              <View style={{ flexDirection: "row", gap: espace.md }}>
                <View style={[styles.pastille, { backgroundColor: fond }]}>
                  <Text style={{ fontSize: 17 }}>{icone}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.enTete}>
                    <Text style={styles.titre}>{n.titre}</Text>
                    {!n.lue ? <View style={styles.point} /> : null}
                  </View>
                  <Text style={styles.corps}>{n.corps}</Text>
                  <Text style={styles.date}>{quand(n.cree_le)}</Text>
                </View>
              </View>
            </Carte>
          );
        })
      )}
    </Ecran>
  );
}

const styles = {
  pastille: { width: 38, height: 38, borderRadius: rayon.md, alignItems: "center", justifyContent: "center" },
  enTete: { flexDirection: "row", alignItems: "center", gap: espace.sm },
  titre: { ...texte.corpsFort, color: couleurs.encre, flex: 1 },
  point: { width: 8, height: 8, borderRadius: 4, backgroundColor: couleurs.bleu },
  corps: { ...texte.petit, color: couleurs.encre2, marginTop: 3, lineHeight: 19 },
  date: { ...texte.legende, color: couleurs.encre3, marginTop: 6 },
};
