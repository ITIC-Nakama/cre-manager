import { useState, useRef, useMemo } from 'react';
import {
    Search, Loader2, Briefcase, MapPin, FileSignature,
    ExternalLink, ChevronLeft, ChevronRight, Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useActiveJobOffers } from '../../../../hooks/useJobOffers';
import { useContractTypes } from '../../../../hooks/useApplications';
import CustomSelect from '../../../../components/basics/CustomSelect';
import type { JobOffer } from '../../../../types/models/JobOffer';

const PAGE_SIZE = 9;

const SOURCE_VALUES = ['FRANCE_TRAVAIL', 'BONNE_ALTERNANCE', 'ADZUNA'] as const;

const SOURCE_BADGE_STYLES: Record<string, string> = {
    FRANCE_TRAVAIL: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
    BONNE_ALTERNANCE: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400',
    ADZUNA: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
};

const SOURCE_LOGO_STYLES: Record<string, string> = {
    FRANCE_TRAVAIL: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
    BONNE_ALTERNANCE: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400',
    ADZUNA: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
};

function companyInitials(company: string): string {
    return company
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

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
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: contractTypes } = useContractTypes();

    const params = {
        page,
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        contractTypeId: contractTypeFilter || undefined,
        source: sourceFilter || 'EXTERNAL',
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

    const handleContractTypeChange = (value: string) => {
        setContractTypeFilter(value);
        setPage(0);
    };

    const handleSourceChange = (value: string) => {
        setSourceFilter(value);
        setPage(0);
    };

    return (
        <div className="flex flex-col gap-6">

            <p className="text-sm text-slate-500 dark:text-[#9aa0a6] -mt-4">
                {t('dashboard.offres.external.subtitle', { count: totalElements })}
            </p>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
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
                <CustomSelect
                    value={contractTypeFilter}
                    options={contractTypeOptions}
                    onChange={handleContractTypeChange}
                    icon={<FileSignature className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                />
                <CustomSelect
                    value={sourceFilter}
                    options={sourceOptions}
                    onChange={handleSourceChange}
                    icon={<Globe className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                />
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {offers.map((offer: JobOffer) => (
                        <div
                            key={offer.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-3"
                        >
                            <div className="flex items-start gap-3">
                                {offer.companyLogoUrl ? (
                                    <img
                                        src={offer.companyLogoUrl}
                                        alt={offer.company}
                                        className="h-10 w-10 rounded-lg object-contain border border-slate-200 dark:border-slate-800 bg-white shrink-0"
                                    />
                                ) : (
                                    <span
                                        className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                                            SOURCE_LOGO_STYLES[offer.source] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        {companyInitials(offer.company)}
                                    </span>
                                )}
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white">{offer.title}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{offer.company}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                        SOURCE_BADGE_STYLES[offer.source] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    <Globe className="h-3 w-3" />{sourceLabel(t, offer.source)}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                                    <FileSignature className="h-3 w-3" />{offer.contractType.label}
                                </span>
                                {offer.location && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                        <MapPin className="h-3 w-3" />{offer.location}
                                    </span>
                                )}
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 flex-1">
                                {offer.description}
                            </p>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                {offer.externalLink && (
                                    <a
                                        href={offer.externalLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        {t('dashboard.offres.external.view_offer')}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
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
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
