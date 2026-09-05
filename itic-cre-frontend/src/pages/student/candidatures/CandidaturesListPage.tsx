import { useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { toast } from 'sonner';
import { Briefcase, FileSignature, Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useMyCandidaturesInfinite, useCreateCandidature } from '../../../hooks/useCandidatures';
import { useApplicationStatuses, useContractTypes } from '../../../hooks/useApplications';
import type { CandidaturePayload } from '../../../types/models/Application';
import CustomSelect from '../../../components/basics/CustomSelect';
import FiltersPopover from '../../../components/basics/FiltersPopover';
import CandidatureCard from './components/CandidatureCard';
import CandidatureFormModal from './components/CandidatureFormModal';
import InfiniteScrollSentinel from '../../../components/shared/InfiniteScrollSentinel';
import { isCompleted } from './utils';

type Tab = 'in_progress' | 'completed';
const PAGE_SIZE = 12;

export default function CandidaturesListPage() {
    const { t } = useTranslation();
    const [tab, setTab] = useState<Tab>('in_progress');
    const [formOpen, setFormOpen] = useState(false);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [contractTypeFilter, setContractTypeFilter] = useState('');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: statuses } = useApplicationStatuses();
    const { data: contractTypes } = useContractTypes();

    const params = useMemo(() => ({
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        statusId: statusFilter || undefined,
        typeContratId: contractTypeFilter || undefined,
    }), [debouncedSearch, statusFilter, contractTypeFilter]);

    const {
        items: candidatures, totalElements, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage,
    } = useMyCandidaturesInfinite(params);

    const createMutation = useCreateCandidature();

    const inProgress = useMemo(() => candidatures.filter((c) => !isCompleted(c)), [candidatures]);
    const completed = useMemo(() => candidatures.filter((c) => isCompleted(c)), [candidatures]);
    const visible = tab === 'in_progress' ? inProgress : completed;

    const statusOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_statuses', 'Tous les statuts') },
        ...(statuses ?? []).map((s) => ({ value: s.id, label: s.nom })),
    ], [statuses, t]);

    const contractTypeOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_contracts', 'Tous les contrats') },
        ...(contractTypes ?? []).map((c) => ({ value: c.id, label: c.label })),
    ], [contractTypes, t]);

    const handleSearch = (value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(value), 350);
    };

    const handleStatusChange = (val: string) => {
        setStatusFilter(val);
    };

    const handleContractTypeChange = (val: string) => {
        setContractTypeFilter(val);
    };

    const activeFilterCount = [statusFilter, contractTypeFilter].filter(Boolean).length;

    const handleResetFilters = () => {
        setStatusFilter('');
        setContractTypeFilter('');
    };

    const handleCreate = async (payload: CandidaturePayload) => {
        await createMutation.mutateAsync(payload);
        toast.success(t('dashboard.candidatures.student.toast.created'));
        setFormOpen(false);
    };

    return (
        <div className="flex flex-col gap-6 py-4 animate-fadeIn">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Briefcase className="h-7 w-7 text-[#E2762F] shrink-0" />
                        {renderTitleWithGradient(t('dashboard.candidatures.student.title', 'Mes Candidatures'), 'itic-gradient-blue')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5 flex items-center gap-2">
                        {t('dashboard.candidatures.student.subtitle', { count: totalElements, defaultValue: '{{count}} candidature(s)' })}
                        {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                    </p>
                </div>
                <button
                    onClick={() => setFormOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    <span>{t('dashboard.candidatures.student.add_button')}</span>
                </button>
            </div>

            {/* Filters Bar */}
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="relative flex-1 min-w-48 max-w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder={t('dashboard.candidatures.search_placeholder', 'Rechercher entreprise, poste...')}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <FiltersPopover activeCount={activeFilterCount} onReset={handleResetFilters}>
                        <div className="py-3 first:pt-3 last:pb-3">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                {t('dashboard.candidatures.filter_status_label', 'Statut')}
                            </label>
                            <CustomSelect
                                value={statusFilter}
                                options={statusOptions}
                                onChange={handleStatusChange}
                                icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
                                className="w-full"
                            />
                        </div>
                        <div className="py-3 first:pt-3 last:pb-3">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                {t('dashboard.candidatures.detail.contract', 'Type de contrat')}
                            </label>
                            <CustomSelect
                                value={contractTypeFilter}
                                options={contractTypeOptions}
                                onChange={handleContractTypeChange}
                                icon={<FileSignature className="h-4 w-4 text-slate-400" />}
                                className="w-full"
                            />
                        </div>
                    </FiltersPopover>
                </div>

                {/* Tabs */}
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
                    {(['in_progress', 'completed'] as Tab[]).map((tabKey) => (
                        <button
                            key={tabKey}
                            onClick={() => setTab(tabKey)}
                            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                                tab === tabKey
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {t(`dashboard.candidatures.student.tabs.${tabKey}`)}
                            <span className="ml-1.5 text-xs opacity-70">
                                ({tabKey === 'in_progress' ? inProgress.length : completed.length})
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Briefcase className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                    {t(tab === 'in_progress' ? 'dashboard.candidatures.student.empty_in_progress' : 'dashboard.candidatures.student.empty_completed')}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map((candidature) => (
                        <CandidatureCard key={candidature.id} candidature={candidature} statuses={statuses ?? []} />
                    ))}
                </div>
            )}

            {!isLoading && visible.length > 0 && (
                <InfiniteScrollSentinel
                    hasMore={!!hasNextPage}
                    isLoadingMore={isFetchingNextPage}
                    onLoadMore={fetchNextPage}
                />
            )}

            {formOpen && (
                <CandidatureFormModal
                    saving={createMutation.isPending}
                    onClose={() => setFormOpen(false)}
                    onSave={handleCreate}
                />
            )}
        </div>
    );
}
