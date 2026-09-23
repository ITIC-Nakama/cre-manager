import { useState, useRef, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    type SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { useStudentListInfinite } from '../../../hooks/useDashboard';
import { useStudentDetailActions } from '../../../hooks/useStudentDetailActions';
import { usePromotions, useAvailableStudyYears } from '../../../hooks/usePromotions';
import { useAllAdvisors, useAssignStudentsToAdvisor, useRemoveStudentsFromAdvisor } from '../../../hooks/useAdvisors';
import { exportStudentsCsv } from '../../../utils/csvExport';
import { formatPromotionLabel } from '../../../utils/promotionUtils';
import { formatStaffLabel } from '../../../utils/staffUtils';
import { fetchAllStudents } from '../../../api-s/requests/DashboardRequest';
import NotifyStudentModal from '../../../components/shared/NotifyStudentModal';
import StudentDetailModal from '../../../components/shared/StudentDetailModal';
import DeclareContractModal from '../../../components/shared/DeclareContractModal';
import CVDetailModal from '../../../components/shared/CVDetailModal';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import TypedConfirmDialog from '../../../components/shared/TypedConfirmDialog';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import type { StudentRow } from '../../../types/models/Dashboard';
import { isAnonymizedStudent } from '../../../utils/studentUtils';

import { useStudentColumns } from './hooks/useStudentTableColumn';
import StudentTable from './components/StudentTable';
import EtudiantsHeader from './components/EtudiantsHeader';
import EtudiantsFilters, { type FilterStatus, type ContractFilter, type StarredFilter } from './components/EtudiantsFilters';
import BulkAssignBar from './components/BulkAssignBar';

const PAGE_SIZE = 20;

// Traduit l'id de colonne TanStack Table vers le(s) champ(s) de tri Spring Data attendus par
// /dashboard/students. "name"/"advisor" sont des colonnes composées (prénom+nom) sans équivalent
// direct en base, on trie donc par nom de famille. "isActive" est calculé côté backend à partir de
// lastActivity (pas une colonne persistée) — lastActivity est un proxy fidèle du même ordre.
const SORT_FIELD_BY_COLUMN: Record<string, string> = {
    name: 'lastName',
    promotion: 'promotion.name',
    advisor: 'advisor.lastName',
    xpTotal: 'xpTotal',
    hasCv: 'hasCv',
    isActive: 'lastActivity',
};

function toSortParam(sorting: SortingState): string | undefined {
    const [first] = sorting;
    if (!first) return undefined;
    const field = SORT_FIELD_BY_COLUMN[first.id];
    if (!field) return undefined;
    return `${field},${first.desc ? 'desc' : 'asc'}`;
}

export default function EtudiantsPage() {
    const { t } = useTranslation();
    const currentUser = useUserStore((state) => state.user);
    const isAdmin = currentUser?.role === Role.ADMIN;

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [promotionFilter, setPromotionFilter] = useState('');
    const [studyYearFilter, setStudyYearFilter] = useState('');
    // Par defaut on ecarte les etudiants deja sous contrat (alternance/stage/CDI/CDD en cours) —
    // l'utilisateur peut choisir de les inclure ou de n'afficher qu'eux via le select.
    const [contractFilter, setContractFilter] = useState<ContractFilter>('not_under_contract');
    const [starredFilter, setStarredFilter] = useState<StarredFilter>('all');
    // Un conseiller voit par defaut uniquement ses propres etudiants ("mon portefeuille") ;
    // un admin voit tout le monde par defaut, avec la possibilite de filtrer par conseiller.
    const [advisorFilter, setAdvisorFilter] = useState(() => (!isAdmin && currentUser ? String(currentUser.id) : ''));
    const [sorting, setSorting] = useState<SortingState>([]);
    const [viewingStudent, setViewingStudent] = useState<StudentRow | null>(null);
    const [exporting, setExporting] = useState(false);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [selectingAllMatching, setSelectingAllMatching] = useState(false);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const bulkAssignAdvisorMutation = useAssignStudentsToAdvisor();
    const bulkRemoveAdvisorMutation = useRemoveStudentsFromAdvisor();
    const [includeAnonymized, setIncludeAnonymized] = useState(false);
    const { data: promotions } = usePromotions();

    const studentActions = useStudentDetailActions({ isAdmin, onAnonymizeSuccess: () => setViewingStudent(null) });
    const { data: advisors = [] } = useAllAdvisors();

    const columns = useStudentColumns({ isAdmin });

    const filterOptions = useMemo(() => [
        { value: 'all', label: t('dashboard.etudiants.filter_all') },
        { value: 'active', label: t('dashboard.etudiants.filter_active') },
        { value: 'inactive', label: t('dashboard.etudiants.filter_inactive') },
        { value: 'stale', label: t('dashboard.etudiants.filter_stale') },
        { value: 'has-cv', label: t('dashboard.etudiants.filter_has_cv') },
        { value: 'no-cv', label: t('dashboard.etudiants.filter_no_cv') },
    ], [t]);

    const promotionOptions = useMemo(() => [
        { value: '', label: t('dashboard.etudiants.filter_all_promotions') },
        ...(promotions ?? []).map((promotion) => ({
            value: promotion.id,
            label: formatPromotionLabel(promotion),
        })),
    ], [promotions, t]);

    const currentUserId = currentUser ? String(currentUser.id) : '';

    const advisorOptions = useMemo(() => [
        { value: '', label: t('dashboard.etudiants.filter_all_advisors', 'Tous les conseillers') },
        ...advisors
            .filter((a) => a.id !== currentUserId)
            .map((a) => ({ value: a.id, label: formatStaffLabel(a, t('common.admin_tag', '(Admin)')) })),
    ], [advisors, t, currentUserId]);

    const { data: systemYears } = useAvailableStudyYears();

    const selectedPromotion = useMemo(() => {
        return (promotions ?? []).find((p) => p.id === promotionFilter);
    }, [promotions, promotionFilter]);

    const availableYears = useMemo(() => {
        if (selectedPromotion?.hasYears && selectedPromotion.availableYears?.length) {
            return selectedPromotion.availableYears;
        }
        return systemYears ?? [];
    }, [selectedPromotion, systemYears]);

    const studyYearOptions = useMemo(() => [
        { value: '', label: t('dashboard.etudiants.filter_study_year_all') },
        ...availableYears.map((year) => ({
            value: String(year),
            label: t(`study_years.year_${year}`, `${year}e année`),
        })),
    ], [availableYears, t]);

    const contractFilterOptions = useMemo(() => [
        { value: 'not_under_contract', label: t('dashboard.etudiants.filter_contract_not_under', 'Pas sous contrat') },
        { value: 'under_contract', label: t('dashboard.etudiants.filter_contract_under', 'Sous contrat') },
        { value: 'needs_verification', label: t('dashboard.etudiants.filter_contract_needs_verification', 'À vérifier') },
        { value: 'all', label: t('dashboard.etudiants.filter_contract_all', 'Tous') },
    ], [t]);

    const starredFilterOptions = useMemo(() => [
        { value: 'all', label: t('dashboard.etudiants.filter_starred_all', 'Tous') },
        { value: 'starred', label: t('dashboard.etudiants.filter_starred_yes', 'Étoilés') },
        { value: 'unstarred', label: t('dashboard.etudiants.filter_starred_no', 'Non étoilés') },
    ], [t]);

    const params = useMemo(() => ({
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
        hasCv: filterStatus === 'has-cv' ? true : filterStatus === 'no-cv' ? false : undefined,
        hasStale: filterStatus === 'stale' ? true : undefined,
        promotionId: promotionFilter || undefined,
        studyYear: studyYearFilter ? Number(studyYearFilter) : undefined,
        advisorId: advisorFilter || undefined,
        underContract: contractFilter === 'under_contract' ? true : contractFilter === 'not_under_contract' ? false : undefined,
        needsContractVerification: contractFilter === 'needs_verification' ? true : undefined,
        starred: starredFilter === 'starred' ? true : starredFilter === 'unstarred' ? false : undefined,
        includeAnonymized: isAdmin ? includeAnonymized : false,
        sort: toSortParam(sorting),
    }), [debouncedSearch, filterStatus, promotionFilter, studyYearFilter, advisorFilter, contractFilter, starredFilter, isAdmin, includeAnonymized, sorting]);

    const {
        items: students, totalElements, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage,
    } = useStudentListInfinite(params);

    // Filtres regroupes dans le panneau "Filtres" (tout sauf recherche/statut, restes visibles) —
    // "actif" = valeur qui s'ecarte du defaut de ce champ pour le role courant.
    // starredFilter n'est plus compte ici : sorti du panneau "Filtres" vers sa propre pastille
    // toujours visible dans la barre, son propre select porte deja sa valeur active.
    const activeFilterCount = [
        promotionFilter,
        studyYearFilter,
        contractFilter !== 'not_under_contract' ? contractFilter : '',
        isAdmin ? advisorFilter : (advisorFilter !== currentUserId ? advisorFilter : ''),
        includeAnonymized ? 'anon' : '',
    ].filter(Boolean).length;

    const handleResetFilters = () => {
        setPromotionFilter('');
        setStudyYearFilter('');
        setContractFilter('not_under_contract');
        setStarredFilter('all');
        setAdvisorFilter(!isAdmin && currentUser ? String(currentUser.id) : '');
        setIncludeAnonymized(false);
        clearSelection();
    };

    // IMPORTANT: getCoreRowModel() doit etre memoize — l'appeler inline cree une nouvelle
    // fonction a chaque render, ce que useReactTable interprete comme un changement et
    // declenche un nouveau render, creant une boucle infinie qui bloque React.
    const coreRowModel = useMemo(() => getCoreRowModel(), []);

    const table = useReactTable({
        data: students,
        columns,
        state: { sorting, rowSelection },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getRowId: (row) => row.id,
        enableRowSelection: (row) => isAdmin && !isAnonymizedStudent(row.original),
        getCoreRowModel: coreRowModel,
        manualSorting: true,
    });

    const selectedIds = useMemo(() => Object.keys(rowSelection).filter((id) => rowSelection[id]), [rowSelection]);
    const allMatchingSelected = totalElements > 0 && selectedIds.length >= totalElements;

    const bulkAdvisorOptions = useMemo(() => {
        const me = advisors.find((a) => a.id === currentUserId);
        const others = advisors.filter((a) => a.id !== currentUserId);
        return [
            { value: '', label: t('dashboard.etudiants.bulk.pick_advisor', 'Choisir un conseiller…') },
            ...(me ? [{ value: me.id, label: t('common.me_option', 'Moi') }] : []),
            ...others.map((a) => ({ value: a.id, label: formatStaffLabel(a, t('common.admin_tag', '(Admin)')) })),
        ];
    }, [advisors, t, currentUserId]);

    const clearSelection = () => setRowSelection({});

    const handleSearch = (value: string) => {
        setSearch(value);
        clearSelection();
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
    };

    const handleClearSearch = () => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        setSearch('');
        setDebouncedSearch('');
        clearSelection();
    };

    const handleFilterChange = (value: FilterStatus) => {
        setFilterStatus(value);
        clearSelection();
    };

    const handlePromotionFilterChange = (value: string) => {
        setPromotionFilter(value);
        setStudyYearFilter('');
        clearSelection();
    };

    const handleStudyYearFilterChange = (value: string) => {
        setStudyYearFilter(value);
        clearSelection();
    };

    const handleAdvisorFilterChange = (value: string) => {
        setAdvisorFilter(value);
        clearSelection();
    };

    const handleContractFilterChange = (value: ContractFilter) => {
        setContractFilter(value);
        clearSelection();
    };

    const handleStarredFilterChange = (value: StarredFilter) => {
        setStarredFilter(value);
        clearSelection();
    };

    const handleSelectAllMatching = async () => {
        setSelectingAllMatching(true);
        try {
            const all = await fetchAllStudents(params);
            const selection: Record<string, boolean> = {};
            all.forEach((s) => {
                if (!isAnonymizedStudent(s)) selection[s.id] = true;
            });
            setRowSelection(selection);
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.bulk.select_all_error', 'Erreur lors de la sélection.'));
        } finally {
            setSelectingAllMatching(false);
        }
    };

    const handleBulkAssign = async (advisorId: string) => {
        setBulkProcessing(true);
        try {
            await bulkAssignAdvisorMutation.mutateAsync({ advisorId, studentIds: selectedIds });
            toast.success(t('dashboard.etudiants.bulk.assign_success', { count: selectedIds.length }));
            clearSelection();
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.bulk.assign_error', 'Erreur lors de l\'affectation groupée.'));
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkRemove = async () => {
        setBulkProcessing(true);
        try {
            await bulkRemoveAdvisorMutation.mutateAsync(selectedIds);
            toast.success(t('dashboard.etudiants.bulk.remove_success', { count: selectedIds.length }));
            clearSelection();
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.bulk.remove_error', 'Erreur lors du retrait groupé.'));
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleExportCsv = async () => {
        setExporting(true);
        try {
            const all = await fetchAllStudents(params);
            exportStudentsCsv(all);
            toast.success(t('dashboard.etudiants.actions.export_success', { count: all.length }));
        } catch {
            toast.error(t('dashboard.etudiants.actions.export_error'));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Header + Filters (sticky ensemble) */}
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-col gap-4">
                <EtudiantsHeader
                    totalElements={totalElements}
                    exporting={exporting}
                    onExport={handleExportCsv}
                />

                <EtudiantsFilters
                    search={search}
                    filterStatus={filterStatus}
                    promotionFilter={promotionFilter}
                    studyYearFilter={studyYearFilter}
                    advisorFilter={advisorFilter}
                    contractFilter={contractFilter}
                    starredFilter={starredFilter}
                    includeAnonymized={includeAnonymized}
                    isFetching={isFetching}
                    isLoading={isLoading}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    filterOptions={filterOptions}
                    promotionOptions={promotionOptions}
                    studyYearOptions={studyYearOptions}
                    advisorOptions={advisorOptions}
                    contractFilterOptions={contractFilterOptions}
                    starredFilterOptions={starredFilterOptions}
                    activeFilterCount={activeFilterCount}
                    onSearchChange={handleSearch}
                    onClearSearch={handleClearSearch}
                    onFilterChange={handleFilterChange}
                    onPromotionChange={handlePromotionFilterChange}
                    onStudyYearChange={handleStudyYearFilterChange}
                    onAdvisorFilterChange={handleAdvisorFilterChange}
                    onContractFilterChange={handleContractFilterChange}
                    onStarredFilterChange={handleStarredFilterChange}
                    onIncludeAnonymizedChange={(checked) => {
                        setIncludeAnonymized(checked);
                        clearSelection();
                    }}
                    onReset={handleResetFilters}
                />
            </div>

            {/* Bulk assign bar */}
            {isAdmin && selectedIds.length > 0 && (
                <BulkAssignBar
                    selectedCount={selectedIds.length}
                    totalElements={totalElements}
                    allPageRowsSelected={table.getIsAllPageRowsSelected()}
                    allMatchingSelected={allMatchingSelected}
                    advisorOptions={bulkAdvisorOptions}
                    processing={bulkProcessing}
                    selectingAllMatching={selectingAllMatching}
                    onAssign={handleBulkAssign}
                    onRemove={handleBulkRemove}
                    onClear={clearSelection}
                    onSelectAllMatching={handleSelectAllMatching}
                />
            )}

            {/* Table */}
            <StudentTable
                table={table}
                isLoading={isLoading}
                students={students}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={fetchNextPage}
                studentCvLoading={studentActions.studentCvLoading}
                viewingCvStudentId={studentActions.viewingCvStudentId}
                setViewingCvStudentId={studentActions.setViewingCvStudentId}
                setViewingStudent={setViewingStudent}
            />

            {/* Modals */}
            {studentActions.notifyingStudent && (
                <NotifyStudentModal
                    student={studentActions.notifyingStudent}
                    onClose={studentActions.closeNotify}
                    onSend={studentActions.handleNotifyStudent}
                />
            )}

            {viewingStudent && (
                <StudentDetailModal
                    student={viewingStudent}
                    onClose={() => setViewingStudent(null)}
                    {...studentActions.studentDetailProps}
                />
            )}

            {studentActions.declaringContractFor && (
                <DeclareContractModal
                    student={studentActions.declaringContractFor}
                    onClose={studentActions.closeDeclareContract}
                />
            )}

            <ConfirmDialog
                isOpen={!!studentActions.deactivateTarget}
                title={t('dashboard.etudiants.confirm_deactivate_title')}
                message={studentActions.deactivateTarget
                    ? t('dashboard.etudiants.confirm_deactivate', { name: `${studentActions.deactivateTarget.firstName} ${studentActions.deactivateTarget.lastName}` })
                    : ''}
                confirmLabel={t('dashboard.etudiants.actions.deactivate')}
                loading={studentActions.deactivateLoading}
                onConfirm={studentActions.handleConfirmDeactivate}
                onClose={studentActions.closeDeactivateConfirm}
            />

            <TypedConfirmDialog
                isOpen={!!studentActions.anonymizeTarget}
                title={t('dashboard.etudiants.confirm_anonymize_title')}
                message={studentActions.anonymizeTarget
                    ? t('dashboard.etudiants.confirm_anonymize_message', { name: `${studentActions.anonymizeTarget.firstName} ${studentActions.anonymizeTarget.lastName}` })
                    : ''}
                confirmationValue={studentActions.anonymizeTarget?.email ?? ''}
                confirmationLabel={t('dashboard.etudiants.confirm_anonymize_input_label')}
                confirmLabel={t('dashboard.etudiants.actions.anonymize')}
                loading={studentActions.anonymizing}
                onConfirm={studentActions.handleConfirmAnonymize}
                onClose={studentActions.closeAnonymize}
            />

            {studentActions.viewingCvStudentId && studentActions.studentCv && (
                <CVDetailModal
                    cv={studentActions.studentCv}
                    statuts={studentActions.cvStatuts}
                    onClose={() => studentActions.setViewingCvStudentId(null)}
                />
            )}
        </div>
    );
}
