import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { utilisateur, jeton, deconnexion } from "../client/api";

const LIENS_ADMIN = [
  ["/admin/file", "File de validation"],
  ["/admin/achats", "Achats"],
  ["/admin/catalogue", "Catalogue"],
  ["/admin/utilisateurs", "Utilisateurs"],
  ["/admin/parametres", "Paramètres"],
];

const LIENS_PARTENAIRE = [["/partenaire/tableau", "Tableau de bord"]];

// Coquille commune des espaces web : barre latérale + garde d'authentification.
export default function Coque({ espace, titre, sousTitre, children }) {
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = utilisateur();
    const rolesAttendus = espace === "admin" ? ["admin", "superadmin"] : ["partenaire"];
    if (!jeton() || !u || !rolesAttendus.includes(u.role)) {
      router.replace("/");
      return;
    }
    setUser(u);
    setPret(true);
  }, [espace, router]);

  if (!pret) return null;

  const liens = espace === "admin" ? LIENS_ADMIN : LIENS_PARTENAIRE;
  return (
    <div className="coque">
      <aside className="lateral">
        <div className="marque">KAYNA KAYNA PAY</div>
        <div className="devise">Petit à petit, paye</div>
        <nav>
          {liens.map(([href, libelle]) => (
            <Link key={href} href={href} className={router.pathname === href ? "actif" : ""}>
              {libelle}
            </Link>
          ))}
        </nav>
        <div className="pied">
          {user.nom}
          <br />
          <span style={{ opacity: 0.7 }}>{user.role}</span>
          <br />
          <button onClick={deconnexion}>Se déconnecter</button>
        </div>
      </aside>
      <main className="contenu">
        <h1>{titre}</h1>
        {sousTitre ? <div className="sous-titre">{sousTitre}</div> : null}
        {children}
      </main>
    </div>
  );
}
