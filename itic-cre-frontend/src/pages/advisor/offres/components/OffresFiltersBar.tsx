import { FileSignature, Globe, Layers, Loader2, MapPin, Search, SlidersHorizontal, UserCheck, UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomSelect, { type SelectOption } from '../../../../components/basics/CustomSelect';
import FiltersPopover from '../../../../components/basics/FiltersPopover';

interface Props {
    search: string;
    onSearchChange: (value: string) => void;
    onClearSearch: () => void;
    sourceFilter: string;
    sourceOptions: SelectOption[];
    onSourceChange: (value: string) => void;
    postedByFilter: string;
    postedByOptions: SelectOption[];
    onPostedByChange: (value: string) => void;
    myOffersActive: boolean;
    onMyOffersToggle: () => void;
    locationFilter: string;
    onLocationChange: (value: string) => void;
    contractTypeFilter: string;
    contractTypeOptions: SelectOption[];
    onContractTypeChange: (value: string) => void;
    isInternalSource: boolean;
    sectorFilter: string;
    sectorOptions: SelectOption[];
    onSectorChange: (value: string) => void;
    activeFilter: string;
    activeFilterOptions: SelectOption[];
    onActiveFilterChange: (value: string) => void;
    activeFilterCount: number;
    onReset: () => void;
    isFetching: boolean;
    isLoading: boolean;
}

export default function OffresFiltersBar({
    search, onSearchChange, onClearSearch,
    sourceFilter, sourceOptions, onSourceChange,
    postedByFilter, postedByOptions, onPostedByChange, myOffersActive, onMyOffersToggle,
    locationFilter, onLocationChange,
    contractTypeFilter, contractTypeOptions, onContractTypeChange,
    isInternalSource, sectorFilter, sectorOptions, onSectorChange,
    activeFilter, activeFilterOptions, onActiveFilterChange,
    activeFilterCount, onReset, isFetching, isLoading,
}: Props) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('dashboard.offres.search_placeholder')}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {search && (
                    <button
                        type="button"
                        onClick={onClearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label={t('common.clear', 'Effacer')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>
            <CustomSelect
                value={sourceFilter}
                options={sourceOptions}
                onChange={onSourceChange}
                icon={<Globe className="h-4 w-4 text-slate-400" />}
                className="min-w-48"
            />
            <CustomSelect
                value={postedByFilter}
                options={postedByOptions}
                onChange={onPostedByChange}
                icon={<UserRound className="h-4 w-4 text-slate-400" />}
                className="min-w-48"
                searchable
                searchPlaceholder={t('dashboard.offres.posted_by_filter.search', 'Rechercher un conseiller…')}
                noResultsLabel={t('dashboard.offres.posted_by_filter.none', 'Aucun conseiller trouvé')}
            />
            <button
                type="button"
                onClick={onMyOffersToggle}
                aria-pressed={myOffersActive}
                title={t('dashboard.offres.posted_by_filter.mine_hint', 'Afficher uniquement les offres que j’ai déposées')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${myOffersActive
                    ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <UserCheck className="h-4 w-4" />
                {t('dashboard.offres.posted_by_filter.mine', 'Mes offres')}
            </button>
            <FiltersPopover activeCount={activeFilterCount} onReset={onReset}>
                <div className="py-3 first:pt-3 last:pb-3">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        {t('dashboard.offres.table.location')}
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={locationFilter}
                            onChange={(e) => onLocationChange(e.target.value)}
                            placeholder={t('dashboard.offres.location_placeholder', 'Ville, département...')}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="py-3 first:pt-3 last:pb-3">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        {t('dashboard.offres.table.contract')}
                    </label>
                    <CustomSelect
                        value={contractTypeFilter}
                        options={contractTypeOptions}
                        onChange={onContractTypeChange}
                        icon={<FileSignature className="h-4 w-4 text-slate-400" />}
                        className="w-full"
                    />
                </div>
                {isInternalSource && (
                    <div className="py-3 first:pt-3 last:pb-3">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                            {t('dashboard.offres.table.sector', 'Secteur')}
                        </label>
                        <CustomSelect
                            value={sectorFilter}
                            options={sectorOptions}
                            onChange={onSectorChange}
                            icon={<Layers className="h-4 w-4 text-slate-400" />}
                            className="w-full"
                        />
                    </div>
                )}
                <div className="py-3 first:pt-3 last:pb-3">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        {t('dashboard.offres.table.status')}
                    </label>
                    <CustomSelect
                        value={activeFilter}
                        options={activeFilterOptions}
                        onChange={onActiveFilterChange}
                        icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
                        className="w-full"
                    />
                </div>
            </FiltersPopover>
            {isFetching && !isLoading && (
                <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
            )}
        </div>
    );
}
