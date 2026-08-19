import { createContext, useCallback, useContext, useState } from "react";

// Notifications éphémères. Remplace window.alert, qui bloque l'interface et ne
// distingue pas une réussite d'une erreur.
const ContexteToasts = createContext(() => {});

export function FournisseurToasts({ children }) {
  const [liste, setListe] = useState([]);

  const retirer = useCallback((id) => {
    setListe((actuels) => actuels.filter((t) => t.id !== id));
  }, []);

  // toast("succes", "Versement validé", "2 500 F crédités.")
  const toast = useCallback(
    (ton, titre, detail) => {
      const id = Date.now() + Math.random();
      setListe((actuels) => [...actuels, { id, ton, titre, detail }]);
      // Une erreur reste plus longtemps : elle demande souvent une action.
      setTimeout(() => retirer(id), ton === "erreur" ? 7000 : 4200);
    },
    [retirer]
  );

  return (
    <ContexteToasts.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {liste.map((t) => (
          <div key={t.id} className={`toast ${t.ton}`}>
            <div className="texte">
              <strong>{t.titre}</strong>
              {t.detail ? <span>{t.detail}</span> : null}
            </div>
            <button className="fermer" onClick={() => retirer(t.id)} aria-label="Fermer">
              ×
            </button>
          </div>
        ))}
      </div>
    </ContexteToasts.Provider>
  );
}

export function useToast() {
  return useContext(ContexteToasts);
}
