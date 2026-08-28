import { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FiltersPopoverProps {
    activeCount: number;
    onReset: () => void;
    children: ReactNode;
    className?: string;
}

export default function FiltersPopover({ activeCount, onReset, children, className = '' }: FiltersPopoverProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [panelRect, setPanelRect] = useState<{ top: number; bottom: number; right: number; width: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            const target = e.target as Node;
            // Un CustomSelect imbriqué se portale directement dans document.body : cliquer une
            // de ses options tombe donc hors de containerRef/panelRef sans être un vrai "outside click".
            if (target instanceof Element && target.closest('[data-custom-select-portal]')) {
                return;
            }
            if (
                containerRef.current && !containerRef.current.contains(target) &&
                panelRef.current && !panelRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnScroll = (e: Event) => {
            const target = e.target as Node;
            if (panelRef.current?.contains(target)) return;
            if (target instanceof Element && target.closest('[data-custom-select-portal]')) return;
            setIsOpen(false);
        };
        window.addEventListener('scroll', closeOnScroll, true);
        return () => window.removeEventListener('scroll', closeOnScroll, true);
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen((o) => {
            const next = !o;
            if (next && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setPanelRect({
                    top: rect.top,
                    bottom: rect.bottom,
                    right: window.innerWidth - rect.right,
                    width: rect.width,
                });
            }
            return next;
        });
    };

    const hasActive = activeCount > 0;

    return (
        <div ref={containerRef} className={`relative inline-block ${className}`}>
            <button
                type="button"
                onClick={handleToggle}
                className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-2xs transition-all cursor-pointer ${
                    hasActive || isOpen
                        ? 'border-[#E2762F] bg-[#E2762F] text-white hover:bg-[#c76426] shadow-sm'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <SlidersHorizontal className="h-4 w-4" />
                {t('dashboard.offres.filters_button', 'Filtres')}
                {hasActive && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-white/25 text-xs font-bold tabular-nums">
                        {activeCount}
                    </span>
                )}
            </button>

            {isOpen && panelRect && createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        top: panelRect.bottom + 10,
                        right: panelRect.right,
                        width: 320,
                    }}
                    className="z-[100] origin-top-right rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl ring-1 ring-black/5 overflow-hidden animate-fadeIn"
                >
                    <div className="h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500" />
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {t('dashboard.offres.filters_button', 'Filtres')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80 px-4">
                        {children}
                    </div>
                    <div className="p-3">
                        <button
                            type="button"
                            onClick={() => { onReset(); setIsOpen(false); }}
                            disabled={!hasActive}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t('dashboard.offres.filters_reset', 'Réinitialiser les filtres')}
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
