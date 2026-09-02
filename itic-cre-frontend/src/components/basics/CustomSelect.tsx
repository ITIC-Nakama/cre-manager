import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [autoDropUp, setAutoDropUp] = useState(false);
  const [panelRect, setPanelRect] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const effectiveDropUp = dropUp || autoDropUp;

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const filteredOptions = searchable && search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  // Close when clicking outside — the dropdown panel is portaled to <body>, so it's
  // no longer a DOM descendant of containerRef and must be checked separately.
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

  const handleToggle = () => {
    setIsOpen((o) => {
      const next = !o;
      if (next && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const estimatedDropdownHeight = (searchable ? 300 : 260);
        const shouldDropUp = window.innerHeight - rect.bottom < estimatedDropdownHeight;
        setAutoDropUp(shouldDropUp);
        setPanelRect({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
      }
      if (!next) setSearch('');
      return next;
    });
  };

  // panelRect n'est calculé qu'à l'ouverture, d'où la fermeture au scroll plutôt qu'un repositionnement:
  // si le trigger bouge réellement (page ou conteneur parent scrollé), le panneau fixed devient
  // désaligné et doit se fermer. Mais deux choses réduisent le viewport visuel sans que ce soit une
  // vraie intention de scroll: le clavier virtuel qui s'ouvre (focus sur la recherche) et la barre
  // d'adresse mobile qui se réduit en bas de page — dans les deux cas on ignore, quel que soit le
  // déplacement du trigger que ça provoque au passage (le clavier peut reflow toute la page).
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const initialTop = containerRef.current.getBoundingClientRect().top;
    const initialViewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const SCROLL_CLOSE_THRESHOLD = 8;
    const VIEWPORT_SHRINK_THRESHOLD = 60;
    const closeOnScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      const currentViewportHeight = window.visualViewport?.height ?? window.innerHeight;
      if (initialViewportHeight - currentViewportHeight > VIEWPORT_SHRINK_THRESHOLD) return;
      const currentTop = containerRef.current?.getBoundingClientRect().top ?? initialTop;
      if (Math.abs(currentTop - initialTop) < SCROLL_CLOSE_THRESHOLD) return;
      setIsOpen(false);
    };
    window.addEventListener('scroll', closeOnScroll, true);
    return () => window.removeEventListener('scroll', closeOnScroll, true);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`} id={id}>
      {/* Trigger Button - Matches SwitchLanguage exactly */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
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

      {/* Dropdown panel — portaled to <body> so it can't be clipped by an ancestor's
          overflow-x-auto (which forces overflow-y to auto too, per the CSS spec) */}
      {isOpen && panelRect && createPortal(
        <div
          ref={panelRef}
          data-custom-select-portal
          style={{
            position: 'fixed',
            right: window.innerWidth - panelRect.left - panelRect.width,
            minWidth: panelRect.width,
            ...(effectiveDropUp
              ? { bottom: window.innerHeight - panelRect.top + 8 }
              : { top: panelRect.bottom + 8 }),
          }}
          className="z-[100] origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-950 focus:outline-none"
        >
          <div className={`flex items-center gap-1.5 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 ${searchable ? 'px-0.5' : 'justify-end'}`}>
            {searchable && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearch('');
              }}
              aria-label="Fermer"
              className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
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
        </div>,
        document.body
      )}
    </div>
  );
}

