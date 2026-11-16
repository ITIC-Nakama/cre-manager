import { useCallback, useEffect, useState } from 'react';
import { useUserStore } from '../store/UserStore';

/**
 * Brouillons des formulaires longs (PROPOSITIONS-JULES §2, option 1) : enregistrés automatiquement DANS LE NAVIGATEUR
 * (localStorage), propres à la personne connectée, jamais envoyés au serveur.
 * - à la réouverture du formulaire : « Reprendre votre brouillon ? » (le brouillon trouvé est proposé, pas imposé) ;
 * - formulaire modifié : confirmation avant de le fermer ou de quitter la page ;
 * - effacé à l'envoi (clear) et à la déconnexion (clearAllFormDrafts, appelé par la déconnexion).
 */
import { FORM_DRAFT_PREFIX as PREFIX } from '../utils/formDrafts';

export { clearAllFormDrafts } from '../utils/formDrafts';
const SAVE_DELAY_MS = 800;

interface StoredDraft<T> {
  value: T;
  savedAt: string;
}

const storageKey = (userId: string | number | undefined, key: string) => `${PREFIX}${userId ?? 'anonyme'}:${key}`;

function read<T>(fullKey: string): StoredDraft<T> | null {
  try {
    const raw = localStorage.getItem(fullKey);
    return raw ? (JSON.parse(raw) as StoredDraft<T>) : null;
  } catch {
    return null;
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface FormDraft<T> {
  /** Brouillon trouvé à l'ouverture et pas encore repris ni ignoré. */
  pending: StoredDraft<T> | null;
  /** Reprendre le brouillon : renvoie ses valeurs (à remettre dans le formulaire). */
  restore: () => T | null;
  /** Ignorer le brouillon trouvé (il est effacé). */
  discard: () => void;
  /** Formulaire envoyé : effacer le brouillon. */
  clear: () => void;
  /** Le formulaire a été modifié (confirmation avant fermeture). */
  dirty: boolean;
}

/**
 * @param key identifiant du formulaire (ex. « offre:nouvelle », « offre:<id> », « cv-commentaire:<id> »)
 * @param value valeurs actuelles du formulaire (sérialisables)
 * @param initial valeurs de départ : un formulaire revenu à elles n'a pas de brouillon
 * @param enabled false : formulaire en lecture seule, ou pas encore prêt
 */
export function useFormDraft<T>(key: string, value: T, initial: T, enabled = true): FormDraft<T> {
  const userId = useUserStore((state) => state.user?.id);
  const fullKey = storageKey(userId, key);
  const [pending, setPending] = useState<StoredDraft<T> | null>(null);
  // Le brouillon est cherché chaque fois que le formulaire devient prêt (ouverture, valeurs chargées) : pas au montage
  // d'une fenêtre toujours montée, ni avant que les valeurs de départ ne soient connues.
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [clearedKey, setClearedKey] = useState<string | null>(null);
  const readyKey = enabled ? fullKey : null;
  if (readyKey !== checkedKey) {
    setCheckedKey(readyKey);
    setClearedKey(null);
    const found = readyKey ? read<T>(readyKey) : null;
    setPending(found && !same(found.value, initial) ? found : null);
  }
  const dirty = enabled && !same(value, initial);

  // Enregistrement automatique (après une courte pause de frappe), sauf tant qu'un brouillon attend une réponse.
  useEffect(() => {
    if (!enabled || checkedKey !== fullKey || pending || clearedKey === fullKey) return undefined;
    const timer = window.setTimeout(() => {
      try {
        if (same(value, initial)) localStorage.removeItem(fullKey);
        else localStorage.setItem(fullKey, JSON.stringify({ value, savedAt: new Date().toISOString() }));
      } catch {
        // stockage plein ou indisponible : le formulaire fonctionne sans brouillon
      }
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, checkedKey, clearedKey, pending, fullKey, value, initial]);

  // Quitter la page (onglet fermé, rechargement) avec des modifications : avertissement du navigateur.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const restore = useCallback(() => {
    const found = pending;
    setPending(null);
    return found ? found.value : null;
  }, [pending]);

  const discard = useCallback(() => {
    setPending(null);
    try {
      localStorage.removeItem(fullKey);
    } catch {
      // rien
    }
  }, [fullKey]);

  const clear = useCallback(() => {
    setClearedKey(fullKey);
    setPending(null);
    try {
      localStorage.removeItem(fullKey);
    } catch {
      // rien
    }
  }, [fullKey]);

  return { pending, restore, discard, clear, dirty };
}
