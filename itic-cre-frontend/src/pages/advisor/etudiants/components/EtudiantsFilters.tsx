import { Loader2, Search, SlidersHorizontal, GraduationCap, ShieldAlert, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../../../../components/basics/CustomSelect';

export type FilterStatus = 'all' | 'active' | 'inactive' | 'stale' | 'no-cv';

interface FilterOption {
    value: string;
    label: string;
}

interface EtudiantsFiltersProps {
    search: string;
    filterStatus: FilterStatus;
    promotionFilter: string;
    studyYearFilter: string;
    includeAnonymized: boolean;
    isFetching: boolean;
    isLoading: boolean;
    isAdmin: boolean;
    filterOptions: FilterOption[];
    promotionOptions: FilterOption[];
    studyYearOptions: FilterOption[];
    onSearchChange: (value: string) => void;
    onFilterChange: (value: FilterStatus) => void;
    onPromotionChange: (value: string) => void;
    onStudyYearChange: (value: string) => void;
    onIncludeAnonymizedChange: (value: boolean) => void;
}

export default function EtudiantsFilters({
    search,
    filterStatus,
    promotionFilter,
    studyYearFilter,
    includeAnonymized,
    isFetching,
    isLoading,
    isAdmin,
    filterOptions,
    promotionOptions,
    studyYearOptions,
    onSearchChange,
    onFilterChange,
    onPromotionChange,
    onStudyYearChange,
    onIncludeAnonymizedChange,
}: EtudiantsFiltersProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative flex-1 min-w-48 max-w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('dashboard.etudiants.search_placeholder')}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Status select */}
            <CustomSelect
                value={filterStatus}
                options={filterOptions}
                onChange={(value) => onFilterChange(value as FilterStatus)}
                icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
                className="min-w-48"
            />

            {/* Promotion select */}
            <CustomSelect
                value={promotionFilter}
                options={promotionOptions}
                onChange={onPromotionChange}
                icon={<GraduationCap className="h-4 w-4 text-slate-400" />}
                className="min-w-48"
                searchable
                searchPlaceholder={t('dashboard.etudiants.promotion_search_placeholder')}
                noResultsLabel={t('dashboard.etudiants.promotion_no_results')}
            />

            {/* Study year select */}
            <CustomSelect
                value={studyYearFilter}
                options={studyYearOptions}
                onChange={onStudyYearChange}
                icon={<Calendar className="h-4 w-4 text-slate-400" />}
                className="min-w-44"
            />

            {/* Admin anonymized checkbox */}
            {isAdmin && (
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <input
                        type="checkbox"
                        checked={includeAnonymized}
                        onChange={(e) => onIncludeAnonymizedChange(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                    <span>{t('dashboard.etudiants.filter_show_anonymized')}</span>
                </label>
            )}

            {/* Loading indicator */}
            {isFetching && !isLoading && (
                <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
            )}
        </div>
    );
}
