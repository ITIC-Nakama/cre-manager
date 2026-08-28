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
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    hasActive
                        ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <SlidersHorizontal className="h-4 w-4" />
                {hasActive
                    ? t('dashboard.offres.filters_button_active', { count: activeCount })
                    : t('dashboard.offres.filters_button', 'Filtres')}
            </button>

            {isOpen && panelRect && createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        top: panelRect.bottom + 8,
                        right: panelRect.right,
                        width: 300,
                    }}
                    className="z-[100] origin-top-right rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-lg ring-1 ring-black/5 flex flex-col gap-3"
                >
                    <div className="flex items-center justify-between -mt-0.5 -mr-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {t('dashboard.offres.filters_button', 'Filtres')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    {children}
                    <button
                        type="button"
                        onClick={() => { onReset(); setIsOpen(false); }}
                        disabled={!hasActive}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors mt-1"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('dashboard.offres.filters_reset', 'Réinitialiser les filtres')}
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}
