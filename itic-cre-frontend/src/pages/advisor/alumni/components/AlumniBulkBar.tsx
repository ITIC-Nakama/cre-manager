import { Loader2, Trash2, Download, CheckSquare, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AlumniBulkBarProps {
    selectedCount: number;
    totalElements: number;
    allPageRowsSelected: boolean;
    allMatchingSelected: boolean;
    isAdmin: boolean;
    processing: boolean;
    selectingAllMatching: boolean;
    onDelete: () => void;
    onExport: () => void;
    onClear: () => void;
    onSelectAllMatching: () => void;
}

export default function AlumniBulkBar({
    selectedCount,
    totalElements,
    allPageRowsSelected,
    allMatchingSelected,
    isAdmin,
    processing,
    selectingAllMatching,
    onDelete,
    onExport,
    onClear,
    onSelectAllMatching,
}: AlumniBulkBarProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-2 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/80 dark:bg-indigo-950/40 p-3 sm:px-4 sm:py-3 animate-fade-in-up">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                    <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>
                        {t('dashboard.alumni.bulk.selected_count', {
                            count: selectedCount,
                            defaultValue: '{{count}} fiche(s) sélectionnée(s)',
                        })}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onExport}
                        disabled={processing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    >
                        <Download className="h-3.5 w-3.5" />
                        {t('dashboard.alumni.bulk.export_selected', 'Exporter la sélection')}
                    </button>

                    {isAdmin && (
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={processing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                        >
                            {processing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                            {t('dashboard.alumni.bulk.delete_selected', 'Supprimer la sélection')}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClear}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                        <X className="h-3.5 w-3.5" />
                        {t('dashboard.alumni.bulk.cancel', 'Annuler')}
                    </button>
                </div>
            </div>

            {allPageRowsSelected && !allMatchingSelected && totalElements > selectedCount && (
                <button
                    type="button"
                    onClick={onSelectAllMatching}
                    disabled={selectingAllMatching}
                    className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer disabled:opacity-60"
                >
                    {selectingAllMatching && <Loader2 className="h-3 w-3 animate-spin" />}
                    {t('dashboard.alumni.bulk.select_all_matching', {
                        count: totalElements,
                    })}
                </button>
            )}
        </div>
    );
}
