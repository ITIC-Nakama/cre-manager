import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

const MD_QUERY = '(min-width: 768px)';

/** Vrai à partir de md (768 px), suivi en direct. */
export function useIsMdUp(): boolean {
    const [mdUp, setMdUp] = useState(() => typeof window !== 'undefined' && window.matchMedia(MD_QUERY).matches);
    useEffect(() => {
        const mql = window.matchMedia(MD_QUERY);
        const onChange = () => setMdUp(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);
    return mdUp;
}

/**
 * Hauteur maximale de la zone qui défile = place restante sous elle dans la page (<main> du gabarit), moins la marge
 * du bas et la bannière « Installer l'application ». Recalculée quand la page change de taille (filtres sur deux
 * lignes, barre d'actions groupées…). Sous md (mobile) : pas de hauteur imposée, la page défile normalement.
 */
export function useFitToViewport(ref: RefObject<HTMLElement | null>, enabled = true, minHeight = 320, bottomGap = 33) {
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || !enabled) return;
        const scroller = el.closest('main');
        const mql = window.matchMedia(MD_QUERY);
        let frame = 0;

        const apply = () => {
            if (!scroller || !mql.matches) {
                el.style.maxHeight = '';
                return;
            }
            const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
            const banner = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pwa-banner-space')) || 0;
            const available = Math.floor(scroller.clientHeight - top - bottomGap - banner);
            el.style.maxHeight = `${Math.max(minHeight, available)}px`;
        };
        // Différé d'une image : évite la boucle « ResizeObserver loop » quand la hauteur appliquée redimensionne la page.
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(apply);
        };

        apply();
        const observer = new ResizeObserver(schedule);
        if (scroller) {
            observer.observe(scroller);
            if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
        }
        window.addEventListener('resize', schedule);
        // La bannière « Installer l'application » annonce sa hauteur par cet événement (PwaInstallBanner.tsx).
        window.addEventListener('pwa-banner-space', schedule);
        mql.addEventListener('change', schedule);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener('resize', schedule);
            window.removeEventListener('pwa-banner-space', schedule);
            mql.removeEventListener('change', schedule);
            el.style.maxHeight = '';
        };
    }, [ref, enabled, minHeight, bottomGap]);
}
