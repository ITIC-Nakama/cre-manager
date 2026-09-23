import { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { SortingState } from '@tanstack/react-table';
import {
    useAllJobOffersInfinite, useCreateJobOffer, useUpdateJobOffer,
    useDeactivateJobOffer, useActivateJobOffer, useDeleteJobOffer, useWipeJobOffers, useSectors,
} from '../../../hooks/useJobOffers';
import { useContractTypes } from '../../../hooks/useApplications';
import {
    useStudentRow, useNotifyStudent, useDeactivateStudent, useReactivateStudent, useAnonymizeStudent,
} from '../../../hooks/useDashboard';
import { useCVByStudent, useCVStatuts } from '../../../hooks/useCV';
import JobOfferFormModal from '../../../components/shared/JobOfferFormModal';
import JobOfferDetailModal from '../../../components/shared/JobOfferDetailModal';
import JobOfferApplicantsModal from '../../../components/shared/JobOfferApplicantsModal';
import StudentDetailModal from '../../../components/shared/StudentDetailModal';
import NotifyStudentModal from '../../../components/shared/NotifyStudentModal';
import DeclareContractModal from '../../../components/shared/DeclareContractModal';
import CVDetailModal from '../../../components/shared/CVDetailModal';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import TypedConfirmDialog from '../../../components/shared/TypedConfirmDialog';
import WipeOffersDialog from '../../../components/shared/WipeOffersDialog';
import OffresHeader from './components/OffresHeader';
import OffresFiltersBar from './components/OffresFiltersBar';
import OffresTable from './components/OffresTable';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import type { JobOffer } from '../../../types/models/JobOffer';
import type { JobOfferPayload } from '../../../types/models/JobOffer';
import type { StudentRow } from '../../../types/models/Dashboard';

const PAGE_SIZE = 20;

const SORT_FIELD_BY_COLUMN: Record<string, string> = {
    title: 'title',
    location: 'location',
    contractType: 'contractType.label',
    sector: 'sector.label',
    applicationCount: 'applicationCount',
    active: 'active',
    createdAt: 'createdAt',
};

function toSortParam(sorting: SortingState): string | undefined {
    const [first] = sorting;
    if (!first) return undefined;
    const field = SORT_FIELD_BY_COLUMN[first.id];
    if (!field) return undefined;
    return `${field},${first.desc ? 'desc' : 'asc'}`;
}

export default function OffresPage() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const currentUser = useUserStore((state) => state.user);
    const isAdmin = currentUser?.role === Role.ADMIN;
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [debouncedLocation, setDebouncedLocation] = useState('');
    const [contractTypeFilter, setContractTypeFilter] = useState('');
    const [sectorFilter, setSectorFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    // Actives par defaut — evite d'afficher d'emblee les offres desactivees accumulees.
    const [activeFilter, setActiveFilter] = useState('true');
    const [formOpen, setFormOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
    const [viewingOffer, setViewingOffer] = useState<JobOffer | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
    const [applicantsOffer, setApplicantsOffer] = useState<JobOffer | null>(null);
    const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
    const [notifyingStudent, setNotifyingStudent] = useState<StudentRow | null>(null);
    const [declaringContractFor, setDeclaringContractFor] = useState<StudentRow | null>(null);
    const [anonymizeTarget, setAnonymizeTarget] = useState<StudentRow | null>(null);
    const [anonymizing, setAnonymizing] = useState(false);
    const [viewingCvStudentId, setViewingCvStudentId] = useState<string | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (location.state?.openCreateModal || new URLSearchParams(location.search).get('create') === 'true') {
            setEditingOffer(null);
            setIsReadOnly(false);
            setFormOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const isInternalSource = sourceFilter === 'MANUAL';
    const [sorting, setSorting] = useState<SortingState>([]);

    const params = useMemo(() => ({
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        contractTypeId: contractTypeFilter || undefined,
        sectorId: isInternalSource ? (sectorFilter || undefined) : undefined,
        active: activeFilter === '' ? undefined : activeFilter === 'true',
        source: sourceFilter || undefined,
        location: debouncedLocation || undefined,
        sort: toSortParam(sorting),
    }), [debouncedSearch, contractTypeFilter, isInternalSource, sectorFilter, activeFilter, sourceFilter, debouncedLocation, sorting]);
    const { items: offers, totalElements, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useAllJobOffersInfinite(params);

    const { data: contractTypes } = useContractTypes();
    const contractTypeOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.filter_all_contracts') },
        ...(contractTypes ?? []).map((c) => ({ value: c.id, label: c.label })),
    ], [contractTypes, t]);

    const { data: sectors } = useSectors();
    const sectorOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.filter_all_sectors', 'Tous les secteurs') },
        ...(sectors ?? []).map((s) => ({ value: s.id, label: s.label })),
    ], [sectors, t]);

    const activeFilterOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.filter_all_statuses', 'Toutes les offres') },
        { value: 'true', label: t('dashboard.offres.table.active', 'Active') },
        { value: 'false', label: t('dashboard.offres.table.inactive', 'Inactive') },
    ], [t]);

    const sourceOptions = useMemo(() => [
        { value: 'ALL', label: t('dashboard.offres.source_options.all', 'Toutes les offres (internes + externes)') },
        { value: 'MANUAL', label: t('dashboard.offres.source_options.manual', 'Offres internes (manuelles)') },
        { value: 'EXTERNAL', label: t('dashboard.offres.source_options.external', 'Offres externes (toutes)') },
        { value: 'FRANCE_TRAVAIL', label: t('dashboard.offres.source_options.france_travail', 'France Travail') },
        { value: 'BONNE_ALTERNANCE', label: t('dashboard.offres.source_options.bonne_alternance', 'La Bonne Alternance') },
        { value: 'ADZUNA', label: t('dashboard.offres.source_options.adzuna', 'Adzuna') },
    ], [t]);

    const createMutation = useCreateJobOffer();
    const updateMutation = useUpdateJobOffer();
    const deactivateMutation = useDeactivateJobOffer();
    const activateMutation = useActivateJobOffer();
    const deleteMutation = useDeleteJobOffer();
    const wipeMutation = useWipeJobOffers();

    const studentRowQuery = useStudentRow(viewingStudentId);
    const notifyMutation = useNotifyStudent();
    const deactivateStudentMutation = useDeactivateStudent();
    const reactivateStudentMutation = useReactivateStudent();
    const anonymizeMutation = useAnonymizeStudent();
    const { data: studentCv } = useCVByStudent(viewingCvStudentId);
    const { data: cvStatuts = [] } = useCVStatuts();

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel?: string;
        onConfirm: () => Promise<void>;
    }>({ isOpen: false, title: '', message: '', onConfirm: async () => { } });
    const [confirmLoading, setConfirmLoading] = useState(false);

    const openConfirm = (title: string, message: string, onConfirm: () => Promise<void>, confirmLabel?: string) => {
        setConfirmDialog({ isOpen: true, title, message, onConfirm, confirmLabel });
    };

    const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

    const handleConfirm = async () => {
        setConfirmLoading(true);
        try {
            await confirmDialog.onConfirm();
            closeConfirm();
        } finally {
            setConfirmLoading(false);
        }
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
    };

    const handleClearSearch = () => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        setSearch('');
        setDebouncedSearch('');
    };

    const handleLocationChange = (value: string) => {
        setLocationFilter(value);
        if (locationTimer.current) clearTimeout(locationTimer.current);
        locationTimer.current = setTimeout(() => setDebouncedLocation(value), 400);
    };

    const handleContractTypeChange = (value: string) => {
        setContractTypeFilter(value);
    };

    const handleSectorChange = (value: string) => {
        setSectorFilter(value);
    };

    const handleSourceChange = (value: string) => {
        setSourceFilter(value);
        if (value !== 'MANUAL') {
            setSectorFilter('');
        }
    };

    const handleActiveFilterChange = (value: string) => {
        setActiveFilter(value);
    };

    const activeFilterCount = [locationFilter, contractTypeFilter, isInternalSource ? sectorFilter : '', activeFilter !== 'true' ? activeFilter || 'all' : ''].filter(Boolean).length;

    const handleResetFilters = () => {
        setLocationFilter('');
        setDebouncedLocation('');
        setContractTypeFilter('');
        setSectorFilter('');
        setActiveFilter('true');
        if (locationTimer.current) clearTimeout(locationTimer.current);
    };

    const handleSave = async (payload: JobOfferPayload) => {
        if (editingOffer) {
            await updateMutation.mutateAsync({ id: editingOffer.id, payload });
            toast.success(t('dashboard.offres.toast.updated'));
        } else {
            await createMutation.mutateAsync(payload);
            toast.success(t('dashboard.offres.toast.created'));
        }
    };

    const handleToggleActive = async (offer: JobOffer) => {
        try {
            if (offer.active) {
                await deactivateMutation.mutateAsync(offer.id);
                toast.success(t('dashboard.offres.toast.deactivated'));
            } else {
                await activateMutation.mutateAsync(offer.id);
                toast.success(t('dashboard.offres.toast.activated'));
            }
        } catch {
            toast.error(t('dashboard.offres.toast.action_error'));
        }
    };

    const handleDelete = (offer: JobOffer) => {
        openConfirm(
            t('dashboard.offres.confirm_delete_title'),
            t('dashboard.offres.confirm_delete', { title: offer.title }),
            async () => {
                try {
                    await deleteMutation.mutateAsync(offer.id);
                    toast.success(t('dashboard.offres.toast.deleted'));
                } catch {
                    toast.error(t('dashboard.offres.toast.action_error'));
                }
            }
        );
    };

    const handleWipeConfirm = async (scope: 'MANUAL' | 'EXTERNAL' | 'ALL') => {
        try {
            await wipeMutation.mutateAsync(scope);
            toast.success(t('dashboard.offres.wipe_dialog.toast_success', 'Offres supprimées avec succès.'));
            setWipeDialogOpen(false);
        } catch {
            toast.error(t('dashboard.offres.toast.action_error'));
        }
    };

    const handleNotifyStudent = async (message?: string) => {
        if (!notifyingStudent) return;
        try {
            await notifyMutation.mutateAsync({ studentId: notifyingStudent.id, message });
            toast.success(t('dashboard.notify_modal.success', { name: `${notifyingStudent.firstName} ${notifyingStudent.lastName}` }));
        } catch {
            toast.error(t('dashboard.notify_modal.error', { email: notifyingStudent.email }));
        }
    };

    const handleDeactivateStudent = (student: StudentRow) => {
        openConfirm(
            t('dashboard.etudiants.confirm_deactivate_title'),
            t('dashboard.etudiants.confirm_deactivate', { name: `${student.firstName} ${student.lastName}` }),
            async () => {
                try {
                    await deactivateStudentMutation.mutateAsync(student.id);
                    toast.success(t('dashboard.etudiants.toast_deactivated'));
                } catch (err) {
                    console.error(err);
                    toast.error(t('dashboard.etudiants.toast_deactivate_error'));
                }
            },
            t('dashboard.etudiants.actions.deactivate'),
        );
    };

    const handleReactivateStudent = async (student: StudentRow) => {
        try {
            await reactivateStudentMutation.mutateAsync(student.id);
            toast.success(t('dashboard.etudiants.toast_reactivated'));
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.toast_reactivate_error'));
        }
    };

    const handleAnonymizeStudent = (student: StudentRow) => {
        setAnonymizeTarget(student);
    };

    const handleConfirmAnonymize = async () => {
        if (!anonymizeTarget) return;
        setAnonymizing(true);
        try {
            await anonymizeMutation.mutateAsync(anonymizeTarget.id);
            toast.success(t('dashboard.etudiants.toast_anonymized'));
            setAnonymizeTarget(null);
            setViewingStudentId(null);
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.toast_anonymize_error'));
        } finally {
            setAnonymizing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6  animate-fadeIn">
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-col gap-4">
                <OffresHeader
                    totalElements={totalElements}
                    isAdmin={isAdmin}
                    onExternalSyncClick={() => navigate('/supervisor/offres/synchronisation-externe')}
                    onWipeClick={() => setWipeDialogOpen(true)}
                    onCategoriesClick={() => navigate('/supervisor/offres/categories')}
                    onCreateClick={() => { setEditingOffer(null); setIsReadOnly(false); setFormOpen(true); }}
                />

                <OffresFiltersBar
                    search={search}
                    onSearchChange={handleSearch}
                    onClearSearch={handleClearSearch}
                    sourceFilter={sourceFilter}
                    sourceOptions={sourceOptions}
                    onSourceChange={handleSourceChange}
                    locationFilter={locationFilter}
                    onLocationChange={handleLocationChange}
                    contractTypeFilter={contractTypeFilter}
                    contractTypeOptions={contractTypeOptions}
                    onContractTypeChange={handleContractTypeChange}
                    isInternalSource={isInternalSource}
                    sectorFilter={sectorFilter}
                    sectorOptions={sectorOptions}
                    onSectorChange={handleSectorChange}
                    activeFilter={activeFilter}
                    activeFilterOptions={activeFilterOptions}
                    onActiveFilterChange={handleActiveFilterChange}
                    activeFilterCount={activeFilterCount}
                    onReset={handleResetFilters}
                    isFetching={isFetching}
                    isLoading={isLoading}
                />
            </div>

            <OffresTable
                offers={offers}
                isLoading={isLoading}
                sorting={sorting}
                onSortingChange={setSorting}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={fetchNextPage}
                onView={setViewingOffer}
                onEdit={(offer) => { setEditingOffer(offer); setIsReadOnly(false); setFormOpen(true); }}
                onViewApplicants={setApplicantsOffer}
            />

            {viewingOffer && (
                <JobOfferDetailModal
                    offer={viewingOffer}
                    onClose={() => setViewingOffer(null)}
                    showAdminActions={true}
                    onEdit={(offer) => {
                        setViewingOffer(null);
                        setEditingOffer(offer);
                        setIsReadOnly(false);
                        setFormOpen(true);
                    }}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                    onViewApplicants={setApplicantsOffer}
                />
            )}

            {applicantsOffer && (
                <JobOfferApplicantsModal
                    offer={applicantsOffer}
                    onClose={() => setApplicantsOffer(null)}
                    onViewStudent={setViewingStudentId}
                    loadingStudentId={studentRowQuery.isFetching ? viewingStudentId : null}
                />
            )}

            {studentRowQuery.data && viewingStudentId && (
                <StudentDetailModal
                    student={studentRowQuery.data}
                    onClose={() => setViewingStudentId(null)}
                    onNotify={(s) => setNotifyingStudent(s)}
                    onToggleActive={(s) => (s.accountActive ? handleDeactivateStudent(s) : handleReactivateStudent(s))}
                    onDeclareContract={(s) => setDeclaringContractFor(s)}
                    onAnonymize={isAdmin ? handleAnonymizeStudent : undefined}
                    onViewCv={(s) => setViewingCvStudentId(s.id)}
                />
            )}

            {viewingCvStudentId && studentCv && (
                <CVDetailModal
                    cv={studentCv}
                    statuts={cvStatuts}
                    onClose={() => setViewingCvStudentId(null)}
                />
            )}

            {notifyingStudent && (
                <NotifyStudentModal
                    student={notifyingStudent}
                    onClose={() => setNotifyingStudent(null)}
                    onSend={(message) => handleNotifyStudent(message)}
                />
            )}

            {declaringContractFor && (
                <DeclareContractModal
                    student={declaringContractFor}
                    onClose={() => setDeclaringContractFor(null)}
                />
            )}

            <TypedConfirmDialog
                isOpen={!!anonymizeTarget}
                title={t('dashboard.etudiants.confirm_anonymize_title')}
                message={anonymizeTarget
                    ? t('dashboard.etudiants.confirm_anonymize_message', { name: `${anonymizeTarget.firstName} ${anonymizeTarget.lastName}` })
                    : ''}
                confirmationValue={anonymizeTarget?.email ?? ''}
                confirmationLabel={t('dashboard.etudiants.confirm_anonymize_input_label')}
                confirmLabel={t('dashboard.etudiants.actions.anonymize')}
                loading={anonymizing}
                onConfirm={handleConfirmAnonymize}
                onClose={() => setAnonymizeTarget(null)}
            />

            {formOpen && (
                <JobOfferFormModal
                    offer={editingOffer}
                    onClose={() => setFormOpen(false)}
                    onSave={handleSave}
                    isReadOnly={isReadOnly}
                />
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                loading={confirmLoading}
                onConfirm={handleConfirm}
                onClose={closeConfirm}
            />

            <WipeOffersDialog
                isOpen={wipeDialogOpen}
                loading={wipeMutation.isPending}
                onConfirm={handleWipeConfirm}
                onClose={() => setWipeDialogOpen(false)}
            />
        </div>
    );
}
