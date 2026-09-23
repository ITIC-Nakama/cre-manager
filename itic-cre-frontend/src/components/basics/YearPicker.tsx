import { useState, useEffect, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Drawer } from 'vaul';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface YearPickerProps {
    id?: string;
    value?: number | string;
    onChange: (year: number | undefined) => void;
    minYear?: number;
    maxYear?: number;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    className?: string;
}

const MOBILE_QUERY = '(max-width: 767px)';

export default function YearPicker({
    id,
    value,
    onChange,
    minYear = 1990,
    maxYear = new Date().getFullYear() + 1,
    placeholder,
    disabled = false,
    error = false,
    className = '',
}: YearPickerProps) {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();
    const parsedValue = typeof value === 'string' ? (value ? Number(value) : undefined) : value;

    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
    );

    // Initialiser la décennie vue sur l'année sélectionnée ou l'année courante
    const initialYear = parsedValue && !isNaN(parsedValue) ? parsedValue : currentYear;
    const [viewDecadeStart, setViewDecadeStart] = useState(() => Math.floor(initialYear / 10) * 10);

    useEffect(() => {
        const mql = window.matchMedia(MOBILE_QUERY);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    // Quand le picker s'ouvre, recentrer la vue sur l'année sélectionnée ou l'année actuelle
    const handleOpenChange = (open: boolean) => {
        if (open) {
            const targetYear = parsedValue && !isNaN(parsedValue) ? parsedValue : currentYear;
            setViewDecadeStart(Math.floor(targetYear / 10) * 10);
        }
        setIsOpen(open);
    };

    const handlePrevDecade = () => {
        setViewDecadeStart((prev) => Math.max(Math.floor(minYear / 10) * 10, prev - 10));
    };

    const handleNextDecade = () => {
        setViewDecadeStart((prev) => Math.min(Math.floor(maxYear / 10) * 10, prev + 10));
    };

    const handleSelectYear = (year: number) => {
        if (year < minYear || year > maxYear) return;
        onChange(year);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(undefined);
    };

    // Grille 3x4 : 12 années (1 année de fin de décennie précédente + 10 années de la décennie + 1 année de décennie suivante)
    const years = useMemo(() => {
        const result: { year: number; isOutDecade: boolean }[] = [];
        for (let i = -1; i <= 10; i++) {
            const y = viewDecadeStart + i;
            result.push({
                year: y,
                isOutDecade: i === -1 || i === 10,
            });
        }
        return result;
    }, [viewDecadeStart]);

    const canPrev = viewDecadeStart > Math.floor(minYear / 10) * 10;
    const canNext = viewDecadeStart + 9 < maxYear;

    const displayPlaceholder = placeholder || t('alumni.form.exit_year_placeholder', 'Choisir une année');

    const calendarGrid = (
        <div className="p-3 w-72 sm:w-80 select-none">
            {/* Header décennie */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                <button
                    type="button"
                    onClick={handlePrevDecade}
                    disabled={!canPrev}
                    aria-label="Décennie précédente"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">
                    {viewDecadeStart} – {viewDecadeStart + 9}
                </div>

                <button
                    type="button"
                    onClick={handleNextDecade}
                    disabled={!canNext}
                    aria-label="Décennie suivante"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Grille des années 3 colonnes x 4 rangées */}
            <div className="grid grid-cols-3 gap-2">
                {years.map(({ year, isOutDecade }) => {
                    const isSelected = parsedValue === year;
                    const isCurrent = year === currentYear;
                    const isDisabled = year < minYear || year > maxYear;

                    return (
                        <button
                            key={year}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleSelectYear(year)}
                            className={`h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center relative ${
                                isSelected
                                    ? 'bg-[#3f74ff] text-white shadow-md shadow-[#3f74ff]/25 font-bold'
                                    : isDisabled
                                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                    : isOutDecade
                                    ? 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer'
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#3f74ff] dark:hover:text-[#3f74ff] cursor-pointer'
                            } ${isCurrent && !isSelected ? 'ring-1 ring-[#3f74ff]/50 font-bold' : ''}`}
                        >
                            {year}
                            {isCurrent && !isSelected && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#3f74ff]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Raccourci rapide */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                    type="button"
                    onClick={() => handleSelectYear(currentYear)}
                    className="font-medium text-[#3f74ff] hover:underline cursor-pointer"
                >
                    {t('common.this_year', 'Cette année ({{year}})', { year: currentYear })}
                </button>

                {parsedValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="font-medium text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                    >
                        {t('common.clear', 'Effacer')}
                    </button>
                )}
            </div>
        </div>
    );

    const triggerButton = (
        <button
            type="button"
            id={id}
            disabled={disabled}
            className={`w-full relative flex items-center justify-between rounded-xl border bg-white dark:bg-slate-900 py-3 pl-11 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#3f74ff]/20 ${
                disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            } ${
                error
                    ? 'border-rose-400 focus:border-rose-500'
                    : isOpen
                    ? 'border-[#3f74ff] ring-2 ring-[#3f74ff]/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#3f74ff]'
            }`}
        >
            <Calendar className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                isOpen ? 'text-[#3f74ff]' : 'text-slate-400'
            }`} />

            <span className={`truncate font-medium ${
                parsedValue ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
            }`}>
                {parsedValue ? String(parsedValue) : displayPlaceholder}
            </span>

            <div className="flex items-center gap-1">
                {parsedValue && !disabled && (
                    <span
                        role="button"
                        tabIndex={0}
                        aria-label="Effacer l'année"
                        onClick={handleClear}
                        onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </span>
                )}
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#3f74ff]' : ''
                }`} />
            </div>
        </button>
    );

    return (
        <div className={`relative w-full ${className}`}>
            {isMobile ? (
                <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
                    <Drawer.Trigger asChild>{triggerButton}</Drawer.Trigger>
                    <Drawer.Portal>
                        <Drawer.Overlay className="fixed inset-0 z-[99] bg-black/40" />
                        <Drawer.Content
                            aria-describedby={undefined}
                            className="fixed inset-x-0 bottom-0 z-[100] rounded-t-3xl border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-800 dark:bg-slate-950 focus:outline-none flex flex-col items-center"
                        >
                            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mb-3" />
                            <Drawer.Title className="sr-only">{displayPlaceholder}</Drawer.Title>
                            {calendarGrid}
                        </Drawer.Content>
                    </Drawer.Portal>
                </Drawer.Root>
            ) : (
                <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
                    <Popover.Trigger asChild>{triggerButton}</Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content
                            side="bottom"
                            align="start"
                            sideOffset={8}
                            className="z-[100] rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 focus:outline-none animate-in fade-in zoom-in-95 duration-150"
                        >
                            {calendarGrid}
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            )}
        </div>
    );
}
