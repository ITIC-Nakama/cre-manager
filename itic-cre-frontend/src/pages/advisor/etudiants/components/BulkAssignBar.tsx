import { useState } from 'react';
import { Loader2, UserCog, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../../../../components/basics/CustomSelect';

const REMOVE_ADVISOR_VALUE = '__remove__';

interface AdvisorOption {
    value: string;
    label: string;
}

interface BulkAssignBarProps {
    selectedCount: number;
    totalElements: number;
    allPageRowsSelected: boolean;
    allMatchingSelected: boolean;
    advisorOptions: AdvisorOption[];
    processing: boolean;
    selectingAllMatching: boolean;
    onAssign: (advisorId: string) => void;
    onRemove: () => void;
    onClear: () => void;
    onSelectAllMatching: () => void;
}

export default function BulkAssignBar({
    selectedCount,
    totalElements,
    allPageRowsSelected,
    allMatchingSelected,
    advisorOptions,
    processing,
    selectingAllMatching,
    onAssign,
    onRemove,
    onClear,
    onSelectAllMatching,
}: BulkAssignBarProps) {
    const { t } = useTranslation();
    const [advisorId, setAdvisorId] = useState('');

    const isRemoveSelected = advisorId === REMOVE_ADVISOR_VALUE;

    const handleApply = () => {
        if (!advisorId) return;
        if (isRemoveSelected) {
            onRemove();
        } else {
            onAssign(advisorId);
        }
    };

    return (
        <div className="flex flex-col gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/70 dark:bg-indigo-950/30 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                    <UserCog className="h-4 w-4" />
                    {t('dashboard.etudiants.bulk.selected_count', { count: selectedCount })}
                </div>

                <div className="w-56">
                    <CustomSelect
                        value={advisorId}
                        options={[
                            ...advisorOptions,
                            { value: REMOVE_ADVISOR_VALUE, label: t('dashboard.etudiants.table.no_advisor', 'Aucun conseiller') },
                        ]}
                        onChange={setAdvisorId}
                        searchable
                        className="text-sm"
                    />
                </div>

                <button
                    onClick={handleApply}
                    disabled={!advisorId || processing}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isRemoveSelected ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                >
                    {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isRemoveSelected
                        ? t('dashboard.etudiants.bulk.remove_button', 'Retirer')
                        : t('dashboard.etudiants.bulk.assign_button', 'Affecter')}
                </button>

                <button
                    onClick={onClear}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                    <X className="h-4 w-4" />
                    {t('dashboard.etudiants.bulk.cancel', 'Annuler')}
                </button>
            </div>

            {allPageRowsSelected && !allMatchingSelected && totalElements > selectedCount && (
                <button
                    onClick={onSelectAllMatching}
                    disabled={selectingAllMatching}
                    className="self-start inline-flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer disabled:opacity-60"
                >
                    {selectingAllMatching && <Loader2 className="h-3 w-3 animate-spin" />}
                    {t('dashboard.etudiants.bulk.select_all_matching', {
                        count: totalElements,
                        defaultValue: 'Sélectionner les {{count}} étudiants correspondant au filtre',
                    })}
                </button>
            )}
        </div>
    );
}
