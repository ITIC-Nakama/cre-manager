import { useEffect, useId } from 'react';
import { create } from 'zustand';

interface ModalStackState {
    stack: string[];
    push: (id: string) => void;
    remove: (id: string) => void;
}

const useModalStack = create<ModalStackState>((set) => ({
    stack: [],
    push: (id) => set((s) => ({ stack: [...s.stack.filter((x) => x !== id), id] })),
    remove: (id) => set((s) => ({ stack: s.stack.filter((x) => x !== id) })),
}));

/**
 * Enregistre la modale dans la pile des modales ouvertes (dans l'ordre d'ouverture) et retourne true
 * tant qu'une autre modale enregistree est ouverte par-dessus. Une modale recouverte se masque
 * (display: none, etat conserve) au lieu de rester peinte sous celle du dessus.
 * `active` = la modale est reellement affichee (les modales a fermeture animee passent `shouldRender`).
 */
export function useModalLayer(active = true): boolean {
    const id = useId();

    useEffect(() => {
        if (!active) return;
        useModalStack.getState().push(id);
        return () => useModalStack.getState().remove(id);
    }, [active, id]);

    return useModalStack((s) => active && s.stack.includes(id) && s.stack[s.stack.length - 1] !== id);
}
