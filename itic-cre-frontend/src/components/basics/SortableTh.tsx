import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export function toggleSort(current: SortState | null, key: string): SortState | null {
  if (!current || current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return null;
}

interface SortableThProps {
  label: React.ReactNode;
  sortKey: string;
  currentSort: SortState | null;
  onSort: (key: string) => void;
  className?: string;
}

export default function SortableTh({ label, sortKey, currentSort, onSort, className = '' }: SortableThProps) {
  const isActive = currentSort?.key === sortKey;
  const Icon = isActive ? (currentSort!.direction === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th className={`px-6 py-4 select-none ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        {label}
        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`} />
      </button>
    </th>
  );
}
