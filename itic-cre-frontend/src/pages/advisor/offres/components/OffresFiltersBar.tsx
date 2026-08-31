import { FileSignature, Globe, Layers, Loader2, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomSelect, { type SelectOption } from '../../../../components/basics/CustomSelect';
import FiltersPopover from '../../../../components/basics/FiltersPopover';

interface Props {
    search: string;
    onSearchChange: (value: string) => void;
    sourceFilter: string;
    sourceOptions: SelectOption[];
    onSourceChange: (value: string) => void;
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
    search, onSearchChange,
    sourceFilter, sourceOptions, onSourceChange,
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
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <CustomSelect
                value={sourceFilter}
                options={sourceOptions}
                onChange={onSourceChange}
                icon={<Globe className="h-4 w-4 text-slate-400" />}
                className="min-w-48"
            />
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
