import { useState, useRef, useMemo } from 'react';
import {
    Search, Loader2, Briefcase, MapPin, FileSignature,
    ChevronLeft, ChevronRight, Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useActiveJobOffers } from '../../../../hooks/useJobOffers';
import { useContractTypes } from '../../../../hooks/useApplications';
import { useJobOfferApplyActions } from '../../../../hooks/useJobOfferApplyActions';
import CustomSelect from '../../../../components/basics/CustomSelect';
import FiltersPopover from '../../../../components/basics/FiltersPopover';
import ConfirmDialog from '../../../../components/shared/ConfirmDialog';
import JobOfferDetailModal from '../../../../components/shared/JobOfferDetailModal';
import OfferCard from '../../../../components/shared/OfferCard';
import type { JobOffer } from '../../../../types/models/JobOffer';

const PAGE_SIZE = 9;

const SOURCE_VALUES = ['FRANCE_TRAVAIL', 'BONNE_ALTERNANCE', 'ADZUNA'] as const;

function sourceLabel(t: TFunction, source: string): string {
    return t(`dashboard.offres.external.sources.${source}`);
}

export default function ExternalOffresTab() {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [contractTypeFilter, setContractTypeFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [debouncedLocation, setDebouncedLocation] = useState('');
    const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: contractTypes } = useContractTypes();
    const {
        appliedApplicationByOfferId,
        applyMutation,
        withdrawMutation,
        withdrawTarget,
        setWithdrawTarget,
        handleApply,
        handleWithdrawConfirm,
    } = useJobOfferApplyActions();

    const params = {
        page,
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        contractTypeId: contractTypeFilter || undefined,
        source: sourceFilter || 'EXTERNAL',
        location: debouncedLocation || undefined,
    };

    const { data, isLoading, isFetching } = useActiveJobOffers(params);
    const offers = data?.content ?? [];
    const totalElements = data?.totalElements ?? 0;
    const totalPages = data?.totalPages ?? 1;

    const contractTypeOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.filter_all_contracts') },
        ...(contractTypes ?? []).map((c) => ({ value: c.id, label: c.label })),
    ], [contractTypes, t]);

    const sourceOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.external.filter_all_sources') },
        ...SOURCE_VALUES.map((s) => ({ value: s, label: sourceLabel(t, s) })),
    ], [t]);

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(0);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
    };

    const handleLocationChange = (value: string) => {
        setLocationFilter(value);
        setPage(0);
        if (locationTimer.current) clearTimeout(locationTimer.current);
        locationTimer.current = setTimeout(() => setDebouncedLocation(value), 400);
    };

    const handleContractTypeChange = (value: string) => {
        setContractTypeFilter(value);
        setPage(0);
    };

    const handleSourceChange = (value: string) => {
        setSourceFilter(value);
        setPage(0);
    };

    const activeFilterCount = [locationFilter, contractTypeFilter, sourceFilter].filter(Boolean).length;

    const handleResetFilters = () => {
        setLocationFilter('');
        setDebouncedLocation('');
        setContractTypeFilter('');
        setSourceFilter('');
        setPage(0);
        if (locationTimer.current) clearTimeout(locationTimer.current);
    };

    return (
        <div className="flex flex-col gap-6">

            <p className="text-sm text-slate-500 dark:text-[#9aa0a6] -mt-4">
                {t('dashboard.offres.external.subtitle', { count: totalElements })}
            </p>

            {/* Filters */}
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={t('dashboard.offres.search_placeholder')}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <FiltersPopover activeCount={activeFilterCount} onReset={handleResetFilters}>
                    <div className="py-3 first:pt-3 last:pb-3">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                            {t('dashboard.offres.table.location')}
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={locationFilter}
                                onChange={(e) => handleLocationChange(e.target.value)}
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
                            onChange={handleContractTypeChange}
                            icon={<FileSignature className="h-4 w-4 text-slate-400" />}
                            className="w-full"
                        />
                    </div>
                    <div className="py-3 first:pt-3 last:pb-3">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                            {t('dashboard.offres.table.source', 'Source')}
                        </label>
                        <CustomSelect
                            value={sourceFilter}
                            options={sourceOptions}
                            onChange={handleSourceChange}
                            icon={<Globe className="h-4 w-4 text-slate-400" />}
                            className="w-full"
                        />
                    </div>
                </FiltersPopover>
                {isFetching && !isLoading && (
                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                )}
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : offers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Briefcase className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                    {t('dashboard.offres.external.empty')}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {offers.map((offer: JobOffer, index) => {
                        const applicationId = appliedApplicationByOfferId.get(offer.id);
                        return (
                            <OfferCard
                                key={offer.id}
                                offer={offer}
                                isApplied={!!applicationId}
                                applicationId={applicationId}
                                isApplying={applyMutation.isPending}
                                onSelect={() => setSelectedOffer(offer)}
                                onApply={handleApply}
                                onWithdraw={(appId, title) => setWithdrawTarget({ applicationId: appId, title })}
                                animationDelayMs={Math.min(index * 40, 400)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {t('dashboard.offres.pagination.info', { current: page + 1, total: totalPages, count: totalElements })}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>{t('common.prev')}</span>
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            <span>{t('common.next')}</span>
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedOffer && (
                <JobOfferDetailModal
                    offer={selectedOffer}
                    onClose={() => setSelectedOffer(null)}
                    isApplied={!!appliedApplicationByOfferId.get(selectedOffer.id)}
                    onApply={handleApply}
                    onWithdraw={(offer) => {
                        const appId = appliedApplicationByOfferId.get(offer.id);
                        if (appId) {
                            setWithdrawTarget({ applicationId: appId, title: offer.title });
                        }
                    }}
                    isApplying={applyMutation.isPending}
                />
            )}

            <ConfirmDialog
                isOpen={!!withdrawTarget}
                title={t('dashboard.offres.withdraw_confirm_title')}
                message={t('dashboard.offres.withdraw_confirm_message', { title: withdrawTarget?.title ?? '' })}
                confirmLabel={t('dashboard.offres.withdraw_confirm_button')}
                loading={withdrawMutation.isPending}
                onConfirm={handleWithdrawConfirm}
                onClose={() => setWithdrawTarget(null)}
            />
        </div>
    );
}
