import { useEffect, useRef } from 'react';

/**
 * Trouve le premier ancetre scrollable d'un element DOM.
 */
function findScrollContainer(el: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = el.parentElement;
    while (node) {
        const style = window.getComputedStyle(node);
        const overflow = style.overflowY;
        if (overflow === 'auto' || overflow === 'scroll') return node;
        node = node.parentElement;
    }
    return null;
}

/**
 * Déclenche onIntersect quand la sentinelle approche du bas du conteneur scroll.
 * Utilise une référence pour `enabled` et `onIntersect` afin de maintenir l'observateur
 * stable sans le détruire et recréer à chaque cycle de chargement.
 */
export function useInfiniteScrollTrigger(onIntersect: () => void, enabled: boolean) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const onIntersectRef = useRef(onIntersect);
    onIntersectRef.current = onIntersect;
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const root = findScrollContainer(el);

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && enabledRef.current) {
                    onIntersectRef.current();
                }
            },
            { root, rootMargin: '200px 0px' },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return sentinelRef;
}
