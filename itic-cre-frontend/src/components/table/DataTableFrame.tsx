import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFitToViewport } from './useFitToViewport';

/**
 * Carte d'un tableau de données (lot 11).
 *   - Le tableau défile à l'intérieur de la carte, jamais la page entière : horizontalement quand il est plus large
 *     que l'écran, et verticalement (à partir de md) dans une hauteur calée sur la fenêtre, pour que l'en-tête du
 *     tableau reste visible (un conteneur qui défile en largeur empêche sinon l'en-tête de rester accroché à la page).
 *   - Ombre sur le bord droit tant qu'il reste des colonnes à droite ; ombre sur la dernière colonne figée dès qu'on
 *     a défilé (classes dt-* dans index.css).
 *   - `footer` est placé dans la zone qui défile : la sentinelle du défilement infini y suit le bas du tableau.
 */
interface DataTableFrameProps {
    children: ReactNode;
    /** Barre d'outils au-dessus du tableau (ex. bouton « Colonnes »). */
    toolbar?: ReactNode;
    footer?: ReactNode;
    /** Nom de la zone qui défile, pour les lecteurs d'écran (ex. « Tableau des étudiants »). */
    label: string;
    /** Hauteur calée sur la fenêtre à partir de md (défaut : oui). */
    fitToViewport?: boolean;
    className?: string;
}

export default function DataTableFrame({ children, toolbar, footer, label, fitToViewport = true, className = '' }: DataTableFrameProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ left: false, right: false });

    const updateEdges = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const left = el.scrollLeft > 1;
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
        setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    }, []);

    useEffect(() => {
        updateEdges();
        const el = scrollRef.current;
        if (!el) return;
        const observer = new ResizeObserver(updateEdges);
        observer.observe(el);
        const table = el.querySelector('table');
        if (table) observer.observe(table);
        return () => observer.disconnect();
    }, [updateEdges]);

    useFitToViewport(scrollRef, fitToViewport);

    return (
        <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
            {toolbar && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                    {toolbar}
                </div>
            )}
            <div className="relative">
                {/* Zone qui défile : focusable au clavier (flèches) et nommée pour les lecteurs d'écran. */}
                <div
                    ref={scrollRef}
                    onScroll={updateEdges}
                    role="region"
                    aria-label={label}
                    tabIndex={0}
                    data-scrolled-x={edges.left ? 'true' : undefined}
                    data-testid="data-table-scroll"
                    className="dt-scroll overflow-auto overscroll-x-contain focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                    {children}
                    {footer}
                </div>
                {edges.right && <div aria-hidden="true" className="dt-more-right pointer-events-none absolute inset-y-0 right-0 w-8" />}
            </div>
        </div>
    );
}
