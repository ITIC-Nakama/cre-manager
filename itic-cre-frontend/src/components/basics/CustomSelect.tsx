import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const effectiveDropUp = dropUp || autoDropUp;

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const filteredOptions = searchable && search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  // Close when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
        setAutoDropUp(window.innerHeight - rect.bottom < estimatedDropdownHeight);
      }
      if (!next) setSearch('');
      return next;
    });
  };

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

      {/* Dropdown panel - Matches SwitchLanguage exactly */}
      {isOpen && (
        <div
          className={`absolute ${
            effectiveDropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } right-0 z-50 min-w-full origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-950 focus:outline-none`}
        >
          {searchable && (
            <div className="relative px-0.5 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800">
              <Search className="absolute left-3 top-4 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
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
        </div>
      )}
    </div>
  );
}

