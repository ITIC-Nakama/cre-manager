import { useState, useRef, useMemo } from 'react';
import {
    Search, Loader2, Briefcase, MapPin, FileSignature, Building2, Layers,
    CheckCircle2, ExternalLink, ChevronLeft, ChevronRight, UserMinus, ArrowUpRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { toast } from 'sonner';
import { useActiveJobOffers, useMyJobApplications, useApplyToJobOffer, useWithdrawJobApplication, useSectors } from '../../../hooks/useJobOffers';
import { useContractTypes } from '../../../hooks/useApplications';
import CustomSelect from '../../../components/basics/CustomSelect';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import JobOfferDetailModal from '../../../components/shared/JobOfferDetailModal';
import type { JobOffer } from '../../../types/models/JobOffer';

const PAGE_SIZE = 9;

export default function OffresPage() {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [contractTypeFilter, setContractTypeFilter] = useState('');
    const [sectorFilter, setSectorFilter] = useState('');
    const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: contractTypes } = useContractTypes();
    const { data: sectors } = useSectors();
    const { data: myApplications } = useMyJobApplications();
    const applyMutation = useApplyToJobOffer();
    const withdrawMutation = useWithdrawJobApplication();
    const [withdrawTarget, setWithdrawTarget] = useState<{ applicationId: string; title: string } | null>(null);

    const appliedApplicationByOfferId = useMemo(() => {
        const map = new Map<string, string>();
        (myApplications?.content ?? []).forEach((a) => map.set(a.jobOfferId, a.id));
        return map;
    }, [myApplications]);

    const params = {
        page,
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        contractTypeId: contractTypeFilter || undefined,
        sectorId: sectorFilter || undefined,
    };

    const { data, isLoading, isFetching } = useActiveJobOffers(params);
    const offers = data?.content ?? [];
    const totalElements = data?.totalElements ?? 0;
    const totalPages = data?.totalPages ?? 1;

    const contractTypeOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.filter_all_contracts') },
        ...(contractTypes ?? []).map((c) => ({ value: c.id, label: c.label })),
    ], [contractTypes, t]);

    const sectorOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.filter_all_sectors', 'Tous les secteurs') },
        ...(sectors ?? []).map((s) => ({ value: s.id, label: s.label })),
    ], [sectors, t]);

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

    const handleSectorChange = (value: string) => {
        setSectorFilter(value);
        setPage(0);
    };

    const handleApply = async (offerId: string) => {
        try {
            await applyMutation.mutateAsync(offerId);
            toast.success(t('dashboard.offres.toast.applied'));
        } catch (err: any) {
            if (err?.response?.status === 409) {
                toast.error(t('dashboard.offres.toast.already_applied'));
            } else {
                toast.error(t('dashboard.offres.toast.apply_error'));
            }
        }
    };

    const handleWithdrawConfirm = async () => {
        if (!withdrawTarget) return;
        try {
            await withdrawMutation.mutateAsync(withdrawTarget.applicationId);
            toast.success(t('dashboard.offres.toast.withdrawn'));
            setWithdrawTarget(null);
        } catch {
            toast.error(t('dashboard.offres.toast.withdraw_error'));
        }
    };

    return (
        <div className="flex flex-col gap-6  animate-fadeIn">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                    <Building2 className="h-7 w-7 text-[#E2762F] shrink-0" />
                    {renderTitleWithGradient(t('dashboard.student_offres.title', "Offres d'Emploi"), 'itic-gradient-blue')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
                    {t('dashboard.offres.subtitle', { count: totalElements })}
                </p>
            </div>

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
                    value={sectorFilter}
                    options={sectorOptions}
                    onChange={handleSectorChange}
                    icon={<Layers className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                />
                {isFetching && !isLoading && (
                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                )}
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : offers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Briefcase className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                    {t('dashboard.offres.table.empty')}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {offers.map((offer) => {
                        const applicationId = appliedApplicationByOfferId.get(offer.id);
                        const alreadyApplied = !!applicationId;
                        return (
                            <div
                                key={offer.id}
                                onClick={() => setSelectedOffer(offer)}
                                className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400/80 dark:hover:border-indigo-500/70 rounded-2xl p-5 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-950/40 transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col gap-3.5 cursor-pointer group"
                            >
                                {/* Top animated gradient accent */}
                                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E2762F] via-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                {/* Background subtle radiant sheen on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-violet-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                {/* Header with company avatar & arrow indicator */}
                                <div className="flex items-start justify-between gap-3 relative z-10">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-105 transition-all duration-300 flex items-center justify-center shrink-0 border border-slate-200/40 dark:border-slate-700/40 group-hover:border-indigo-200/60 dark:group-hover:border-indigo-800/60 shadow-2xs">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-base line-clamp-1 leading-snug">
                                                {offer.title}
                                            </p>
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                {offer.company}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 transition-all duration-300 flex items-center justify-center shrink-0">
                                        <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap items-center gap-2 relative z-10">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100/80 dark:border-indigo-900/30 group-hover:border-indigo-200 dark:group-hover:border-indigo-800/60 transition-colors">
                                        <FileSignature className="h-3 w-3" />{offer.contractType.label}
                                    </span>
                                    {offer.sector && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-100/80 dark:border-violet-900/30 group-hover:border-violet-200 dark:group-hover:border-violet-800/60 transition-colors">
                                            <Layers className="h-3 w-3" />{offer.sector.label}
                                        </span>
                                    )}
                                    {offer.location && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                                            <MapPin className="h-3 w-3 text-slate-400" />{offer.location}
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed flex-1 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors relative z-10">
                                    {offer.description}
                                </p>

                                {/* Actions Footer */}
                                <div
                                    className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-auto relative z-10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {alreadyApplied ? (
                                        <>
                                            <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                                <CheckCircle2 className="h-4 w-4" />{t('dashboard.offres.already_applied')}
                                            </span>
                                            <button
                                                onClick={() => setWithdrawTarget({ applicationId: applicationId!, title: offer.title })}
                                                title={t('dashboard.offres.withdraw_hint')}
                                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-200 active:scale-95 cursor-pointer"
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleApply(offer.id)}
                                            disabled={applyMutation.isPending}
                                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/25 active:scale-[0.98] text-white disabled:opacity-60"
                                        >
                                            {t('dashboard.offres.apply_button')}
                                        </button>
                                    )}
                                    {offer.externalLink && (
                                        <a
                                            href={offer.externalLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 active:scale-95"
                                            title={t('dashboard.offres.actions.view_link')}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
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
