/** Préfixe des brouillons de formulaires enregistrés dans le navigateur (hooks/useFormDraft). */
export const FORM_DRAFT_PREFIX = 'cre-draft:';

/** Déconnexion : aucun brouillon ne reste dans le navigateur (poste partagé). */
export function clearAllFormDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(FORM_DRAFT_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // stockage indisponible (navigation privée stricte) : rien à effacer
  }
}
