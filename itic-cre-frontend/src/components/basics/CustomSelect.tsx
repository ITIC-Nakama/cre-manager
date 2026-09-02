import { useState, useEffect, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Drawer } from 'vaul';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  /** If true, the dropdown opens upward */
  dropUp?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** If true, shows a search input at the top of the dropdown to filter options */
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsLabel?: string;
}

const MOBILE_QUERY = '(max-width: 767px)';

export default function CustomSelect({
  value,
  options,
  onChange,
  id,
  className = '',
  dropUp = false,
  icon,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Rechercher…',
  noResultsLabel = 'Aucun résultat',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sur mobile le select s'affiche en feuille fixée en bas d'écran (via vaul), indépendante de la
  // position du trigger, du scroll ou du clavier virtuel. Sur desktop il reste un popover ancré au
  // trigger (via Radix), qui gère lui-même repositionnement/collision/clic extérieur/focus.
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const filteredOptions = searchable && search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setSearch('');
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    handleOpenChange(false);
  };

  // Radix/vaul focus leur propre Content par défaut à l'ouverture. On préempte ce comportement pour
  // focus directement le champ de recherche, comme avant — plus fiable qu'un autoFocus natif sur
  // l'input, qui pourrait être écrasé par cette gestion de focus interne à la lib.
  const focusSearchInput = (e: Event) => {
    if (searchable) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  const panelHeader = (
    <div className={`flex items-center gap-1.5 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 ${searchable ? 'px-0.5' : 'justify-end'}`}>
      {searchable && (
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => handleOpenChange(false)}
        aria-label="Fermer"
        className="shrink-0 rounded-full p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  const optionsList = (maxHeightClassName: string) => (
    <div className={`flex flex-col gap-1 overflow-y-auto overscroll-contain ${maxHeightClassName}`}>
      {filteredOptions.length > 0 ? (
        filteredOptions.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`w-full cursor-pointer text-left rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-primary text-white'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
              }`}
            >
              {opt.label}
            </button>
          );
        })
      ) : (
        <p className="text-xs text-slate-400 text-center py-2">{noResultsLabel}</p>
      )}
    </div>
  );

  const triggerButton = (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-between gap-2 w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
        disabled ? 'opacity-60 cursor-not-allowed hover:bg-white dark:hover:bg-slate-900' : 'cursor-pointer'
      }`}
    >
      <span className="flex items-center gap-2 truncate">
        {icon}
        <span className="truncate">{selectedLabel}</span>
      </span>
      <ChevronDown
        className={`h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
  );

  return (
    <div className={`relative inline-block text-left ${className}`} id={id}>
      {isMobile ? (
        <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
          <Drawer.Trigger asChild>{triggerButton}</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[99] bg-black/40" />
            <Drawer.Content
              aria-describedby={undefined}
              data-custom-select-portal
              onOpenAutoFocus={focusSearchInput}
              className="fixed inset-x-0 bottom-0 z-[100] rounded-t-2xl border-t border-slate-200 bg-white p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-lg dark:border-slate-800 dark:bg-slate-950 focus:outline-none"
            >
              <Drawer.Title className="sr-only">{selectedLabel}</Drawer.Title>
              {panelHeader}
              {optionsList('max-h-[50vh]')}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : (
        <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
          <Popover.Trigger asChild>{triggerButton}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              data-custom-select-portal
              side={dropUp ? 'top' : 'bottom'}
              align="end"
              sideOffset={8}
              onOpenAutoFocus={focusSearchInput}
              style={{ minWidth: 'var(--radix-popover-trigger-width)' }}
              className="z-[100] origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-950 focus:outline-none"
            >
              {panelHeader}
              {optionsList('max-h-60')}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
}
