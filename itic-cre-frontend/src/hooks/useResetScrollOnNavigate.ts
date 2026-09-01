import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router ne reinitialise que le scroll de `window` lors d'un changement de page.
 * Nos layouts utilisent un <main overflow-y-auto> comme vrai conteneur de scroll (le layout
 * lui-meme ne se demonte jamais entre deux routes), donc sans ca la position de scroll de
 * la page precedente restait affichee sur la nouvelle page.
 */
export function useResetScrollOnNavigate(containerRef: RefObject<HTMLElement | null>) {
    const { pathname } = useLocation();

    useEffect(() => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname, containerRef]);
}
