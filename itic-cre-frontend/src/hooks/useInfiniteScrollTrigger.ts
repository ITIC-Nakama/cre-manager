import { useEffect, useRef } from 'react';

/**
 * Declenche onIntersect bien avant que la sentinelle n'entre reellement dans le viewport
 * (rootMargin large) pour que le lot suivant soit deja charge quand l'utilisateur atteint
 * le bas visible — evite la pause visible d'un infinite scroll qui attend le bord exact.
 * root=null fonctionne meme si le vrai conteneur de scroll est un ancetre en overflow-auto
 * (ex. <main> des layouts) : le calcul d'intersection tient compte des clips ancestraux.
 */
export function useInfiniteScrollTrigger(onIntersect: () => void, enabled: boolean) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const onIntersectRef = useRef(onIntersect);
    onIntersectRef.current = onIntersect;

    useEffect(() => {
        if (!enabled) return;
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) onIntersectRef.current();
            },
            { rootMargin: '800px 0px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [enabled]);

    return sentinelRef;
}
