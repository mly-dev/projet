import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import {
  Ecran, Carte, CarteSquelette, Champ, Bouton, Badge, Puces, Ligne, Alerte, Photo,
} from "../composants/Base";
import { useToast } from "../composants/Toasts";
import { api } from "../api/client";
import { couleurs, texte, espace, rayon, fcfa, rythmeIndicatif } from "../theme";

// Rythmes proposés au simulateur : ce sont les montants que les gens versent
// réellement, du billet de 500 F à l'épargne du samedi. La liste s'adapte au
// prix — proposer « 200 F par jour » pour une moto n'aiderait personne.
function rythmesPour(prix) {
  const echelle = [200, 500, 1000, 2000, 5000, 10000, 25000, 50000];
  const suggere = (rythmeIndicatif(prix) || {}).rythme || 500;
  const depart = Math.max(0, echelle.indexOf(suggere) - 1);
  return echelle.slice(depart, depart + 5).map((v) => ({ cle: String(v), libelle: fcfa(v) }));
}

// Une durée se lit en jours, en semaines, en mois ou en années — jamais en
// « 192 semaines ».
function enClair(jours) {
  if (jours <= 21) return `${jours} jour${jours > 1 ? "s" : ""}`;
  if (jours <= 70) return `${Math.round(jours / 7)} semaines`;
  if (jours <= 730) return `${Math.round(jours / 30)} mois`;
  const annees = (jours / 365).toFixed(1).replace(".0", "").replace(".", ",");
  return `${annees} ans`;
}


// Galerie de la fiche produit. Les photos défilent horizontalement, avec des
// points de repère quand il y en a plusieurs — l'usage attendu sur un
// téléphone, sans bibliothèque supplémentaire.
function Galerie({ photos }) {
  const [index, setIndex] = useState(0);
  const largeur = Dimensions.get("window").width - espace.lg * 2;

  return (
    <View style={{ marginBottom: espace.md }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / largeur))
        }
        style={{ borderRadius: rayon.lg }}
      >
        {photos.map((photo) => (
          <Photo
            key={photo.id}
            source={photo.detail}
            taille={largeur}
            arrondi={rayon.lg}
            style={{ height: Math.round(largeur * 0.78) }}
          />
        ))}
      </ScrollView>

      {photos.length > 1 ? (
        <View style={styles.points}>
          {photos.map((photo, i) => (
            <View
              key={photo.id}
              style={[styles.point, i === index && styles.pointActif]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function FicheProduit({ route, navigation }) {
  const toast = useToast();
  const [produit, setProduit] = useState(null);
  const [parJour, setParJour] = useState(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    api(`/api/produits/${route.params.id}`).then((r) => {
      if (!r.ok) return;
      setProduit(r.produit);
      // Rythme de départ proportionné au prix : le simulateur s'ouvre sur une
      // durée crédible plutôt que sur « 1 344 jours ».
      const suggere = rythmeIndicatif(r.produit.prix_affiche);
      setParJour(String(suggere ? suggere.rythme : 500));
    });
  }, [route.params.id]);

  if (!produit || parJour === null) {
    return (
      <Ecran titre="Produit" retour navigation={navigation}>
        <CarteSquelette lignes={3} />
        <CarteSquelette lignes={2} />
      </Ecran>
    );
  }

  const montantJour = Number(String(parJour).replace(/\D/g, "")) || 0;
  const jours = montantJour > 0 ? Math.ceil(produit.prix_affiche / montantJour) : null;
  const dateFin = jours
    ? new Date(Date.now() + jours * 24 * 3600 * 1000).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  async function commencer() {
    setEnCours(true);
    const r = await api("/api/achats", { method: "POST", corps: { produit_id: produit.id } });
    setEnCours(false);
    if (!r.ok) return toast("erreur", "Impossible de démarrer", r.erreur);
    // On emmène directement le client sur son achat : lui demander de confirmer
    // par « Voir mon achat » ajoutait un appui pour rien.
    navigation.replace("DetailAchat", { id: r.achat.id });
    toast(
      "succes",
      "C'est parti !",
      `Votre portefeuille pour « ${produit.nom} » est ouvert. Versez à votre rythme, même 100 F.`,
      { icone: "🎉" }
    );
  }

  return (
    <Ecran
      titre={produit.nom}
      retour
      navigation={navigation}
      pied={
        <>
          <Bouton
            libelle={enCours ? "Ouverture…" : "Commencer à payer"}
            variante="ambre"
            onPress={commencer}
            chargement={enCours}
            desactive={!produit.disponible}
          />
          <Text style={styles.piedNote}>
            Aucun engagement de montant ni de fréquence — vous versez quand vous voulez.
          </Text>
        </>
      }
    >
      {(produit.photos || []).length ? (
        <Galerie photos={produit.photos} />
      ) : null}

      <Carte>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={[texte.titre, { color: couleurs.encre, flex: 1, paddingRight: espace.md }]}>
            {produit.nom}
          </Text>
          <Badge
            texte={produit.disponible ? "disponible" : "indisponible"}
            ton={produit.disponible ? "vert" : "rouge"}
          />
        </View>
        <Text style={styles.vendeur}>
          Vendu par {produit.partenaire} · {produit.categorie}
        </Text>

        <View style={styles.blocPrix}>
          <Text style={styles.prix}>{fcfa(produit.prix_affiche)}</Text>
          <Text style={styles.prixNote}>
            Prix garanti pendant toute la durée de votre achat.{"\n"}
            Commission de la plateforme déjà comprise — rien ne s'ajoute à la fin.
          </Text>
        </View>
      </Carte>

      {produit.description ? (
        <Carte>
          <Text style={[texte.corps, { color: couleurs.encre }]}>{produit.description}</Text>
        </Carte>
      ) : null}

      <Carte>
        <Text style={styles.titreBloc}>À votre rythme — simulez</Text>
        <Text style={styles.aideBloc}>
          Ce calcul est une projection, pas un engagement : rien ne vous oblige à verser tous les jours.
        </Text>

        <Puces
          options={rythmesPour(produit.prix_affiche)}
          valeur={String(montantJour)}
          onChoisir={setParJour}
          style={{ marginBottom: espace.md }}
        />
        <Champ
          libelle="Ou saisissez votre montant quotidien"
          keyboardType="number-pad"
          suffixe="F CFA"
          value={String(parJour)}
          onChangeText={setParJour}
          style={{ marginBottom: espace.md }}
        />

        {jours ? (
          <View style={styles.resultat}>
            <View style={styles.resultatHaut}>
              <Text style={styles.resultatJours}>{enClair(jours)}</Text>
            </View>
            <Text style={styles.resultatDetail}>
              soit {jours} versement{jours > 1 ? "s" : ""} de {fcfa(montantJour)} — terminé vers le{" "}
              <Text style={{ fontWeight: "800" }}>{dateFin}</Text>
            </Text>
          </View>
        ) : (
          <Text style={[texte.petit, { color: couleurs.encre3 }]}>
            Saisissez un montant pour voir la durée.
          </Text>
        )}
      </Carte>

      <Carte>
        <Text style={styles.titreBloc}>Ce qui se passe ensuite</Text>
        <Ligne libelle="Premier versement" valeur="dès 100 F" />
        <Ligne libelle="Moyens de dépôt" valeur="NITA · Amana · Wave" />
        <Ligne libelle="Validation d'un dépôt" valeur="≈ 10 minutes" />
        <Ligne libelle="Remise du produit" valeur={produit.modalites_remise || "à convenir"} dernier />
      </Carte>

      <Alerte type="info">
        Votre argent est conservé par Kayna Kayna Pay jusqu'à la remise du produit. En cas
        d'annulation, il vous est restitué selon les conditions générales.
      </Alerte>
    </Ecran>
  );
}

const styles = {
  vendeur: { ...texte.petit, color: couleurs.encre3, marginTop: 4 },

  points: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: espace.sm },
  point: { width: 6, height: 6, borderRadius: 3, backgroundColor: couleurs.bordFort },
  pointActif: { backgroundColor: couleurs.bleu, width: 18 },

  blocPrix: {
    marginTop: espace.lg,
    backgroundColor: couleurs.bleuPale,
    borderRadius: rayon.md,
    padding: espace.lg,
  },
  prix: { ...texte.montant, color: couleurs.bleu },
  prixNote: { ...texte.legende, color: couleurs.encre2, marginTop: 6, lineHeight: 16.5 },

  titreBloc: { ...texte.sousTitre, color: couleurs.bleuNuit, marginBottom: 4 },
  aideBloc: { ...texte.legende, color: couleurs.encre3, marginBottom: espace.md, lineHeight: 16 },

  resultat: {
    backgroundColor: couleurs.ambrePale,
    borderRadius: rayon.md,
    padding: espace.lg,
    alignItems: "center",
  },
  resultatHaut: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  resultatJours: { fontSize: 30, fontWeight: "900", color: couleurs.ambreFonce, letterSpacing: -0.8 },
  resultatDetail: { ...texte.petit, color: couleurs.encre, textAlign: "center", marginTop: 4 },

  piedNote: { ...texte.legende, color: couleurs.encre3, textAlign: "center", marginTop: espace.sm },
};
