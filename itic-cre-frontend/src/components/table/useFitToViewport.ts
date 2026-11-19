import { useLayoutEffect, type RefObject } from 'react';

const MD_QUERY = '(min-width: 768px)';

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
        mql.addEventListener('change', schedule);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener('resize', schedule);
            mql.removeEventListener('change', schedule);
            el.style.maxHeight = '';
        };
    }, [ref, enabled, minHeight, bottomGap]);
}
