import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { utilisateur, deconnexion } from "../client/api";
import { useDirect } from "./Direct";

const LIENS_ADMIN = [
  ["/admin/file", "File de validation", "file"],
  ["/admin/achats", "Achats et livraisons"],
  ["/admin/catalogue", "Catalogue"],
  ["/admin/utilisateurs", "Utilisateurs"],
  ["/admin/parametres", "Paramètres"],
];

const LIENS_PARTENAIRE = [["/partenaire/tableau", "Tableau de bord"]];

// Coquille commune des espaces web : barre latérale, garde d'affichage, titre
// de page. La session réelle vit dans le cookie httpOnly et chaque route de
// l'API revérifie le rôle côté serveur — cette garde n'est qu'un confort.
export default function Coque({ espace, titre, sousTitre, children, actions }) {
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = utilisateur();
    const rolesAttendus = espace === "admin" ? ["admin", "superadmin"] : ["partenaire"];
    if (!u || !rolesAttendus.includes(u.role)) {
      router.replace("/");
      return;
    }
    setUser(u);
    setPret(true);
  }, [espace, router]);

  if (!pret) return null;

  const liens = espace === "admin" ? LIENS_ADMIN : LIENS_PARTENAIRE;
  const roleLisible = {
    admin: "Administrateur",
    superadmin: "Super-admin",
    partenaire: "Partenaire",
  }[user.role] || user.role;

  return (
    <div className="coque">
      <Head>
        <title>{titre} — Kayna Kayna Pay</title>
      </Head>

      <aside className="lateral">
        <div className="bloc-marque">
          <img src="/logo-marque-fond-sombre.svg" alt="" width={32} height={32} />
          <div>
            <div className="marque">KAYNA KAYNA PAY</div>
            <div className="devise">Petit à petit, paye</div>
          </div>
        </div>

        <nav>
          {liens.map(([href, libelle, cle]) => (
            <Link key={href} href={href} className={router.pathname === href ? "actif" : ""}>
              <span>{libelle}</span>
              {cle === "file" ? <PastilleFile /> : null}
            </Link>
          ))}
        </nav>

        <div className="pied">
          {espace === "admin" ? <EtatDirect /> : null}
          <div className="qui">{user.nom}</div>
          <div className="role">{roleLisible}</div>
          <button onClick={deconnexion}>Se déconnecter</button>
        </div>
      </aside>

      <main className="contenu">
        <div className="entete-ligne" style={{ marginBottom: sousTitre ? 6 : 18 }}>
          <h1>{titre}</h1>
          {actions ? <div className="actions">{actions}</div> : null}
        </div>
        {sousTitre ? <div className="sous-titre">{sousTitre}</div> : null}
        {children}
      </main>
    </div>
  );
}

// Nombre de versements en attente, tenu à jour en direct sur toutes les pages.
function PastilleFile() {
  const { aTraiter } = useDirect();
  if (!aTraiter) return null;
  return <span className="pastille">{aTraiter}</span>;
}

// Sans cet indicateur, une file figée par une coupure réseau se lit comme une
// file vide — et l'on croit qu'il n'y a rien à faire.
function EtatDirect() {
  const { direct } = useDirect();
  return (
    <div className={`etat-direct ${direct ? "en-ligne" : "hors-ligne"}`}>
      <span className="point" />
      {direct ? "Temps réel actif" : "Temps réel interrompu"}
    </div>
  );
}
