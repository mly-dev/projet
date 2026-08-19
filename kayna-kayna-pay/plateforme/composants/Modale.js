import { useEffect, useRef } from "react";

// Fenêtre modale accessible : ferme sur Échap, piège le focus, et rend le fond
// inerte. Remplace window.prompt/confirm, qui ne permettent ni de présenter le
// contexte d'une décision ni de valider une saisie.
export default function Modale({ titre, contexte, onFermer, children, actions, large }) {
  const boite = useRef(null);

  useEffect(() => {
    const surTouche = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onFermer();
      }
      if (e.key === "Tab" && boite.current) {
        const cibles = boite.current.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        );
        if (!cibles.length) return;
        const premier = cibles[0];
        const dernier = cibles[cibles.length - 1];
        if (e.shiftKey && document.activeElement === premier) {
          e.preventDefault();
          dernier.focus();
        } else if (!e.shiftKey && document.activeElement === dernier) {
          e.preventDefault();
          premier.focus();
        }
      }
    };
    document.addEventListener("keydown", surTouche);

    // Le premier champ saisissable prend le focus ; à défaut, la boîte.
    const premierChamp = boite.current && boite.current.querySelector("input, select, textarea");
    if (premierChamp) premierChamp.focus();
    else if (boite.current) boite.current.focus();

    const debordement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = debordement;
    };
  }, [onFermer]);

  return (
    <div
      className="modale-fond"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
    >
      <div
        className="modale"
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        tabIndex={-1}
        ref={boite}
        style={large ? { maxWidth: 620 } : undefined}
      >
        <div className="modale-entete">
          <h3>{titre}</h3>
          {contexte ? <div className="contexte">{contexte}</div> : null}
        </div>
        <div className="modale-corps">{children}</div>
        {actions ? <div className="modale-pied">{actions}</div> : null}
      </div>
    </div>
  );
}
