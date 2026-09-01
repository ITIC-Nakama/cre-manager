import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Empeche un geste de scroll demarrant sur le fond (backdrop) de faire defiler la page derriere
 * une modale ouverte. Sans ca, sur mobile, ce "scroll leak" laisse la modale visuellement en
 * place mais son propre scroll interne reste bloque jusqu'a sa fermeture (le geste suivant cible
 * encore le fond, pas la modale). Le scroll a l'interieur de containerRef reste autorise normalement.
 */
export function useLockBodyScroll(containerRef: RefObject<HTMLElement | null>, locked: boolean) {
    useEffect(() => {
        if (!locked) return;

        const isInsideContainer = (target: EventTarget | null) =>
            containerRef.current?.contains(target as Node) ?? false;

        const handleTouchMove = (e: TouchEvent) => {
            if (!isInsideContainer(e.target)) {
                e.preventDefault();
            }
        };
        const handleWheel = (e: WheelEvent) => {
            if (!isInsideContainer(e.target)) {
                e.preventDefault();
            }
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('wheel', handleWheel);
        };
    }, [containerRef, locked]);
}
