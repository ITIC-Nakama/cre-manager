import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { ReferenceOption } from '../../types/models/JobOffer';

interface MultiSelectReferenceProps {
    options: ReferenceOption[];
    loading?: boolean;
    /** CSV, comme stocké côté back (ex: "M1805,M1810"). Vide = aucune restriction. */
    value: string;
    onChange: (csv: string) => void;
    /** Libellé de l'option "aucune restriction" (ex: "Toutes les offres"), toujours en tête de liste. */
    allLabel: string;
    searchPlaceholder?: string;
    noResultsLabel?: string;
    closeLabel?: string;
    /** Libellé du badge de repli quand plus de 3 éléments sont sélectionnés (ex: "{{count}} sélectionnés"). */
    selectedCountLabel?: (count: number) => string;
}

/**
 * Dropdown multi-sélection (checkboxes + recherche), pour choisir parmi un référentiel qui peut
 * compter plusieurs centaines d'entrées (ex: ~1900 codes ROME) — repose sur le même mécanisme de
 * portail/positionnement que CustomSelect.tsx, mais avec des lignes cochables au clic simple
 * plutôt qu'un <select multiple> natif (qui exige Ctrl/Cmd+clic, peu discoverable). Replié par
 * défaut : la sélection courante reste visible sous forme de chips, sans occuper l'espace d'une
 * liste toujours dépliée.
 */
export default function MultiSelectReference({
    options,
    loading = false,
    value,
    onChange,
    allLabel,
    searchPlaceholder = 'Rechercher…',
    noResultsLabel = 'Aucun résultat',
    closeLabel = 'Fermer',
    selectedCountLabel = (count) => `${count} sélectionnés`,
}: MultiSelectReferenceProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [autoDropUp, setAutoDropUp] = useState(false);
    const [panelRect, setPanelRect] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null);
    const [panelMaxHeight, setPanelMaxHeight] = useState(320);
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const selected = useMemo(
        () => (value ? value.split(',').map((v) => v.trim()).filter(Boolean) : []),
        [value]
    );
    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;

    const filtered = search.trim()
        ? options.filter((o) => {
              const needle = search.trim().toLowerCase();
              return o.label.toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle);
          })
        : options;

    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            const target = e.target as Node;
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
            if (panelRef.current?.contains(e.target as Node)) return;
            setIsOpen(false);
        };
        window.addEventListener('scroll', closeOnScroll, true);
        return () => window.removeEventListener('scroll', closeOnScroll, true);
    }, [isOpen]);

    const handleToggleOpen = () => {
        if (loading) return;
        setIsOpen((o) => {
            const next = !o;
            if (next && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const estimatedDropdownHeight = 340;
                const shouldDropUp = window.innerHeight - rect.bottom < estimatedDropdownHeight;
                setAutoDropUp(shouldDropUp);
                setPanelRect({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
                // Espace reellement disponible dans la direction choisie — sans ca, un panel plus
                // haut que l'espace dispo (ex: pres du bord de l'ecran) deborde hors viewport.
                const viewportPadding = 16;
                const available = shouldDropUp
                    ? rect.top - viewportPadding
                    : window.innerHeight - rect.bottom - viewportPadding;
                setPanelMaxHeight(Math.max(180, available));
            }
            if (!next) setSearch('');
            return next;
        });
    };

    const toggleValue = (v: string) => {
        const next = selectedSet.has(v) ? selected.filter((s) => s !== v) : [...selected, v];
        onChange(next.join(','));
    };

    const clearAll = () => onChange('');

    const removeOne = (v: string) => onChange(selected.filter((s) => s !== v).join(','));

    const triggerLabel = selected.length === 0
        ? allLabel
        : selected.length <= 2
            ? selected.map(labelFor).join(', ')
            : selectedCountLabel(selected.length);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={handleToggleOpen}
                disabled={loading}
                className={`w-full inline-flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-slate-900 border px-3 py-2 text-sm text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                    isOpen ? 'border-[#E2762F] ring-2 ring-[#E2762F]/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
                <span className={`truncate ${selected.length === 0 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
                    {triggerLabel}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && panelRect && createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        left: panelRect.left,
                        minWidth: panelRect.width,
                        maxWidth: Math.max(panelRect.width, 360),
                        maxHeight: panelMaxHeight,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        ...(autoDropUp
                            ? { bottom: window.innerHeight - panelRect.top + 8 }
                            : { top: panelRect.bottom + 8 }),
                    }}
                    className="z-[100] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-950 focus:outline-none"
                >
                    <div className="flex items-center gap-1.5 px-0.5 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => { setIsOpen(false); setSearch(''); }}
                            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={closeLabel}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={clearAll}
                        className={`w-full flex items-center gap-2 text-left rounded-xl px-3 py-2 text-sm font-semibold transition-colors cursor-pointer mb-0.5 shrink-0 ${
                            selected.length === 0
                                ? 'bg-[#E2762F]/10 dark:bg-[#E2762F]/15 text-[#E2762F] dark:text-[#f0a066]'
                                : 'text-[#E2762F] dark:text-[#f0a066] hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`}
                    >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            selected.length === 0 ? 'bg-[#E2762F] border-[#E2762F]' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                            {selected.length === 0 && <Check className="h-3 w-3 text-white" />}
                        </span>
                        {allLabel}
                    </button>

                    <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-3">{noResultsLabel}</p>
                        ) : (
                            filtered.map((o) => {
                                const isSelected = selectedSet.has(o.value);
                                return (
                                    <button
                                        key={o.value}
                                        type="button"
                                        onClick={() => toggleValue(o.value)}
                                        className={`w-full flex items-center gap-2 text-left rounded-xl px-3 py-2 text-sm transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-medium'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                                        }`}
                                    >
                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                            isSelected ? 'bg-[#E2762F] border-[#E2762F]' : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                        </span>
                                        <span className="truncate">{o.label}</span>
                                        <span className="ml-auto text-[10px] text-slate-400 shrink-0">{o.value}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>,
                document.body
            )}

            <div className="flex flex-wrap gap-1 mt-1.5">
                {selected.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">{allLabel}</span>
                ) : (
                    selected.map((v) => (
                        <span
                            key={v}
                            className="inline-flex items-center gap-1 rounded-full bg-[#E2762F]/10 dark:bg-[#E2762F]/15 text-[#E2762F] dark:text-[#f0a066] text-[11px] font-medium px-2 py-0.5"
                        >
                            {labelFor(v)}
                            <button
                                type="button"
                                onClick={() => removeOne(v)}
                                className="hover:text-[#c9631f] dark:hover:text-white cursor-pointer"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))
                )}
            </div>
        </div>
    );
}
