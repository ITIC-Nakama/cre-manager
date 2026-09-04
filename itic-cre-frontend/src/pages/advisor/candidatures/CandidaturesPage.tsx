import { useState, useRef, useMemo } from 'react';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import {
    Search, SlidersHorizontal, Loader2, AlertCircle, Briefcase,
    GraduationCap, FileSignature, Handshake, Users, Star,
    Download,
} from 'lucide-react';
import type { ContractFilter } from '../etudiants/components/EtudiantsFilters';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useApplicationGroupedListInfinite, useApplicationStatuses, useContractTypes } from '../../../hooks/useApplications';
import { usePromotions } from '../../../hooks/usePromotions';
import { useAllAdvisors } from '../../../hooks/useAdvisors';
import { exportApplicationsCsv } from '../../../api-s/requests/DashboardRequest';
import { formatPromotionLabel } from '../../../utils/promotionUtils';
import { formatStaffLabel } from '../../../utils/staffUtils';
import CustomSelect from '../../../components/basics/CustomSelect';
import FiltersPopover from '../../../components/basics/FiltersPopover';
import StudentCard from './components/StudentCard';
import StudentDrawer from './components/StudentDrawer';
import InfiniteScrollSentinel from '../../../components/shared/InfiniteScrollSentinel';
import type { StudentGroup } from './types';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';

const PAGE_SIZE = 24;

export default function CandidaturesPage() {
    const { t } = useTranslation();
    const currentUser = useUserStore((state) => state.user);
    const isAdmin = currentUser?.role === Role.ADMIN;

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [promotionFilter, setPromotionFilter] = useState('');
    const [contractTypeFilter, setContractTypeFilter] = useState('');
    // Un conseiller voit par defaut uniquement les candidatures de son portefeuille ;
    // un admin voit tout le monde par defaut, avec la possibilite de filtrer par conseiller.
    const [advisorFilter, setAdvisorFilter] = useState(() => (!isAdmin && currentUser ? String(currentUser.id) : ''));
    const [staleOnly, setStaleOnly] = useState(false);
    // Par defaut on ecarte les etudiants deja sous contrat, comme sur la liste des etudiants.
    const [contractFilter, setContractFilter] = useState<ContractFilter>('not_under_contract');
    // Id plutot que l'objet lui-meme : le drawer doit refleter les donnees a jour (ex: verification
    // d'un contrat) sans que l'utilisateur ait besoin de fermer/rouvrir — un objet fige au moment du
    // clic ne serait jamais rafraichi malgre l'invalidation React Query de la liste.
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: statuses } = useApplicationStatuses();
    const { data: promotions } = usePromotions();
    const { data: contractTypes } = useContractTypes();
    const { data: advisors = [] } = useAllAdvisors();

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const blob = await exportApplicationsCsv({
                search: debouncedSearch || undefined,
                statusId: statusFilter || undefined,
                promotionId: promotionFilter || undefined,
                typeContratId: contractTypeFilter || undefined,
                stale: staleOnly ? true : undefined,
                activeStudentsOnly: true,
                advisorId: advisorFilter || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `candidatures-export-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(t('dashboard.candidatures.toast_export_success', 'Export CSV téléchargé avec succès'));
        } catch {
            toast.error(t('dashboard.candidatures.toast_export_error', 'Erreur lors du téléchargement du CSV'));
        } finally {
            setIsExporting(false);
        }
    };

    const statusOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_statuses') },
        ...(statuses ?? []).map((s) => ({ value: s.id, label: s.nom })),
    ], [statuses, t]);

    const promotionOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_promotions') },
        ...(promotions ?? []).map((p) => ({
            value: p.id,
            label: formatPromotionLabel(p),
        })),
    ], [promotions, t]);

    const contractTypeOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_contracts') },
        ...(contractTypes ?? []).map((c) => ({ value: c.id, label: c.label })),
    ], [contractTypes, t]);

    const currentUserId = currentUser ? String(currentUser.id) : '';

    const advisorOptions = useMemo(() => [
        { value: '', label: t('dashboard.etudiants.filter_all_advisors', 'Tous les conseillers') },
        ...advisors
            .filter((a) => a.id !== currentUserId)
            .map((a) => ({ value: a.id, label: formatStaffLabel(a, t('common.admin_tag', '(Admin)')) })),
    ], [advisors, t, currentUserId]);

    const contractFilterOptions = useMemo(() => [
        { value: 'not_under_contract', label: t('dashboard.etudiants.filter_contract_not_under', 'Pas sous contrat') },
        { value: 'under_contract', label: t('dashboard.etudiants.filter_contract_under', 'Sous contrat') },
        { value: 'needs_verification', label: t('dashboard.etudiants.filter_contract_needs_verification', 'À vérifier') },
        { value: 'all', label: t('dashboard.etudiants.filter_contract_all', 'Tous') },
    ], [t]);

    const params = useMemo(() => ({
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        statusId: statusFilter || undefined,
        promotionId: promotionFilter || undefined,
        typeContratId: contractTypeFilter || undefined,
        stale: staleOnly ? true : undefined,
        activeStudentsOnly: true,
        advisorId: advisorFilter || undefined,
        underContract: contractFilter === 'under_contract' ? true : contractFilter === 'not_under_contract' ? false : undefined,
        needsContractVerification: contractFilter === 'needs_verification' ? true : undefined,
    }), [debouncedSearch, statusFilter, promotionFilter, contractTypeFilter, staleOnly, advisorFilter, contractFilter]);

    const {
        items, totalElements: totalStudents, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage,
    } = useApplicationGroupedListInfinite(params);

    const studentGroups = items as StudentGroup[];
    const selectedGroup = selectedGroupId
        ? studentGroups.find((group) => group.studentId === selectedGroupId) ?? null
        : null;

    const handleSearch = (value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
    };

    const handleStatusChange = (value: string) => {
        setStatusFilter(value);
    };

    const handlePromotionChange = (value: string) => {
        setPromotionFilter(value);
    };

    const handleContractTypeChange = (value: string) => {
        setContractTypeFilter(value);
    };

    const handleAdvisorFilterChange = (value: string) => {
        setAdvisorFilter(value);
    };

    // Filtres regroupes dans le panneau "Filtres" (tout sauf recherche/statut, restes visibles) —
    // "actif" = valeur qui s'ecarte du defaut de ce champ pour le role courant, meme principe
    // qu'EtudiantsPage.
    const activeFilterCount = [
        promotionFilter,
        contractTypeFilter,
        contractFilter !== 'not_under_contract' ? contractFilter : '',
        isAdmin ? advisorFilter : (advisorFilter !== currentUserId ? advisorFilter : ''),
        staleOnly ? 'stale' : '',
    ].filter(Boolean).length;

    const handleResetFilters = () => {
        setPromotionFilter('');
        setContractTypeFilter('');
        setContractFilter('not_under_contract');
        setAdvisorFilter(!isAdmin && currentUser ? String(currentUser.id) : '');
        setStaleOnly(false);
    };

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Briefcase className="h-7 w-7 text-[#E2762F] shrink-0" />
                        {renderTitleWithGradient(t('dashboard.candidatures.title', 'Gestion des Candidatures'), 'itic-gradient-blue')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t('dashboard.candidatures.student_count', { count: totalStudents, defaultValue: '{{count}} étudiant' })}
                        {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
                >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {t('dashboard.candidatures.export_csv', 'Exporter CSV')}
                </button>
            </div>

            {/* Filters */}
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={t('dashboard.candidatures.search_placeholder')}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <CustomSelect
                    value={statusFilter}
                    options={statusOptions}
                    onChange={handleStatusChange}
                    icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                />

                {/* Le reste des filtres regroupes dans un panneau, comme sur Offres — evite de
                  * surcharger la barre avec 6+ controles affiches en permanence. */}
                <FiltersPopover activeCount={activeFilterCount} onReset={handleResetFilters}>
                    <div className="py-3 first:pt-3 last:pb-3">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                            {t('dashboard.etudiants.filter_promotion_label', 'Promotion')}
                        </label>
                        <CustomSelect
                            value={promotionFilter}
                            options={promotionOptions}
                            onChange={handlePromotionChange}
                            icon={<GraduationCap className="h-4 w-4 text-slate-400" />}
                            className="w-full"
                            searchable
                            searchPlaceholder={t('dashboard.candidatures.promotion_search_placeholder')}
                            noResultsLabel={t('dashboard.candidatures.promotion_no_results')}
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

                    <div className="py-3 first:pt-3 last:pb-3">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                            {t('dashboard.etudiants.filter_contract_label', 'Contrat')}
                        </label>
                        <CustomSelect
                            value={contractFilter}
                            options={contractFilterOptions}
                            onChange={(value) => setContractFilter(value as ContractFilter)}
                            icon={<Handshake className="h-4 w-4 text-slate-400" />}
                            className="w-full"
                        />
                    </div>

                    <div className="py-3 first:pt-3 last:pb-3 flex flex-col gap-2.5">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={advisorFilter === currentUserId}
                                onChange={(e) => handleAdvisorFilterChange(e.target.checked ? currentUserId : '')}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <Users className="h-3.5 w-3.5 text-indigo-500" />
                            {t('dashboard.etudiants.filter_my_students', 'Mes étudiants uniquement')}
                        </label>

                        {isAdmin && (
                            <CustomSelect
                                value={advisorFilter === currentUserId ? '' : advisorFilter}
                                options={advisorOptions}
                                onChange={handleAdvisorFilterChange}
                                icon={<Users className="h-4 w-4 text-slate-400" />}
                                className={`w-full transition-opacity ${advisorFilter === currentUserId ? 'opacity-50' : ''}`}
                                searchable
                            />
                        )}
                    </div>

                    <div className="py-3 first:pt-3 last:pb-3">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={staleOnly}
                                onChange={(e) => setStaleOnly(e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            {t('dashboard.candidatures.filter_stale_only')}
                        </label>
                    </div>
                </FiltersPopover>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">{t('dashboard.candidatures.loading', 'Chargement des candidatures…')}</p>
                </div>
            ) : studentGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Star className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                    </div>
                    <p className="font-medium text-slate-600 dark:text-slate-400">{t('dashboard.candidatures.empty_title', 'Aucun étudiant actif avec des candidatures')}</p>
                    <p className="text-sm">{t('dashboard.candidatures.empty_desc', 'Modifiez vos filtres pour élargir la recherche.')}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {studentGroups.map((group) => (
                            <StudentCard
                                key={group.studentId}
                                group={group}
                                onClick={() => setSelectedGroupId(group.studentId)}
                            />
                        ))}
                    </div>

                    <InfiniteScrollSentinel
                        hasMore={!!hasNextPage}
                        isLoadingMore={isFetchingNextPage}
                        onLoadMore={fetchNextPage}
                    />
                </>
            )}

            {selectedGroup && (
                <StudentDrawer group={selectedGroup} onClose={() => setSelectedGroupId(null)} />
            )}
        </div>
    );
}
