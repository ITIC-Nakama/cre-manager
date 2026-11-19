import { useId, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import type { Table } from '@tanstack/react-table';
import { Columns3, Eye, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FilterTriggerButton from '../basics/FilterTriggerButton';
import { columnLabel } from './columnMeta';

/**
 * Bouton « Colonnes » d'un tableau TanStack (lot 11) : cases à cocher pour afficher ou masquer chaque colonne,
 * et « Tout afficher ». Les colonnes non masquables (enableHiding: false : identité de la ligne) restent cochées et
 * grisées ; la colonne de sélection n'apparaît pas dans la liste.
 * Clavier : Tab parcourt les cases, Espace coche, Échap ferme et rend le focus au bouton (Radix Popover).
 */
export default function ColumnsMenu<T>({ table, className = '' }: { table: Table<T>; className?: string }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const titleId = useId();
    const columns = table.getAllLeafColumns().filter((c) => c.id !== 'select');
    const hiddenCount = columns.filter((c) => c.getCanHide() && !c.getIsVisible()).length;
    const label = hiddenCount > 0
        ? t('table.columns_hidden', { count: hiddenCount, defaultValue: 'Colonnes ({{count}} masquées)' })
        : t('table.columns', 'Colonnes');

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <FilterTriggerButton
                    className={className}
                    icon={<Columns3 className="h-4 w-4 text-slate-400" />}
                    label={label}
                    active={hiddenCount > 0}
                    open={open}
                    data-testid="columns-menu-trigger"
                />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    align="end"
                    sideOffset={8}
                    aria-labelledby={titleId}
                    data-custom-select-portal
                    className="z-[100] w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                >
                    <p id={titleId} className="px-2 pb-1.5 pt-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {t('table.columns_title', 'Colonnes affichées')}
                    </p>
                    <ul className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto">
                        {columns.map((column) => {
                            const canHide = column.getCanHide();
                            const name = columnLabel(column);
                            return (
                                <li key={column.id}>
                                    <label
                                        className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm ${
                                            canHide
                                                ? 'cursor-pointer text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900'
                                                : 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={column.getIsVisible()}
                                            disabled={!canHide}
                                            onChange={column.getToggleVisibilityHandler()}
                                            aria-describedby={canHide ? undefined : `${titleId}-${column.id}`}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60"
                                        />
                                        <span className="flex-1 truncate">{name}</span>
                                        {!canHide && (
                                            <span id={`${titleId}-${column.id}`} className="inline-flex items-center gap-1 text-[11px]">
                                                <Lock className="h-3 w-3" aria-hidden="true" />
                                                {t('table.column_locked', 'toujours affichée')}
                                            </span>
                                        )}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="mt-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => table.toggleAllColumnsVisible(true)}
                            disabled={hiddenCount === 0}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-900 cursor-pointer"
                        >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('table.columns_show_all', 'Tout afficher')}
                        </button>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
