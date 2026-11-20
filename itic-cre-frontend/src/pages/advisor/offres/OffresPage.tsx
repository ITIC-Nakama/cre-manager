import { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { SortingState } from '@tanstack/react-table';
import {
    useAllJobOffersInfinite, useCreateJobOffer, useUpdateJobOffer,
    useDeactivateJobOffer, useActivateJobOffer, useDeleteJobOffer, useWipeJobOffers, useSectors, useOfferAuthors,
} from '../../../hooks/useJobOffers';
import { useContractTypes } from '../../../hooks/useApplications';
import { useStudentRow } from '../../../hooks/useDashboard';
import { useStudentDetailActions } from '../../../hooks/useStudentDetailActions';
import JobOfferFormModal from '../../../components/shared/JobOfferFormModal';
import JobOfferDetailModal from '../../../components/shared/JobOfferDetailModal';
import JobOfferApplicantsModal from '../../../components/shared/JobOfferApplicantsModal';
import SuggestedCandidatesModal from '../../../components/matching/SuggestedCandidatesModal';
import StudentDetailModal from '../../../components/shared/StudentDetailModal';
import NotifyStudentModal from '../../../components/shared/NotifyStudentModal';
import DeclareContractModal from '../../../components/shared/DeclareContractModal';
import CVDetailModal from '../../../components/shared/CVDetailModal';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import ReactivateAccountDialog from '../../../components/shared/ReactivateAccountDialog';
import TypedConfirmDialog from '../../../components/shared/TypedConfirmDialog';
import DeleteAccountDialog from '../../../components/shared/DeleteAccountDialog';
import WipeOffersDialog from '../../../components/shared/WipeOffersDialog';
import OffresHeader from './components/OffresHeader';
import OffresFiltersBar from './components/OffresFiltersBar';
import OffresTable from './components/OffresTable';
import FormationsTab from './components/FormationsTab';
import AlertRecipientsModal from '../../../components/offers/AlertRecipientsModal';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import type { JobOffer } from '../../../types/models/JobOffer';
import type { JobOfferPayload } from '../../../types/models/JobOffer';

const PAGE_SIZE = 20;

/** Valeur du filtre « Déposée par » qui isole les offres externes (voir JobOfferSpecification). */
const POSTED_BY_EXTERNAL = 'EXTERNAL';
const DEFAULT_SOURCE = 'ALL';
const DEFAULT_ACTIVE = 'true';

/**
 * Filtres recopiés dans l'URL pour qu'une vue filtrée se partage par simple lien. Seules les
 * valeurs différentes des défauts y figurent ; « Toutes les offres » ('' côté état) s'écrit 'all'.
 */
function buildFilterSearch(current: string, filters: Record<string, string>): string {
    const next = new URLSearchParams(current);
    next.delete('create');
    for (const [key, value] of Object.entries(filters)) {
        if (value) next.set(key, value);
        else next.delete(key);
    }
    return next.toString();
}

const SORT_FIELD_BY_COLUMN: Record<string, string> = {
    title: 'title',
    location: 'location',
    contractType: 'contractType.label',
    sector: 'sector.label',
    applicationCount: 'applicationCount',
    active: 'active',
    createdAt: 'createdAt',
    // Tri par formation (lot 8) : ordre de l'annuaire de la première formation rattachée (sans formation : en dernier).
    formations: 'formationSort',
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
    const currentUserId = currentUser ? String(currentUser.id) : '';
    // Etat initial lu dans l'URL : un lien partage rouvre la meme vue filtree.
    const [searchParams, setSearchParams] = useSearchParams();
    const initialParam = (key: string, fallback = '') => searchParams.get(key) ?? fallback;
    const [search, setSearch] = useState(() => initialParam('q'));
    const [debouncedSearch, setDebouncedSearch] = useState(() => initialParam('q'));
    const [locationFilter, setLocationFilter] = useState(() => initialParam('location'));
    const [debouncedLocation, setDebouncedLocation] = useState(() => initialParam('location'));
    const [contractTypeFilter, setContractTypeFilter] = useState(() => initialParam('contractTypeId'));
    const [sectorFilter, setSectorFilter] = useState(() => initialParam('sectorId'));
    const [sourceFilter, setSourceFilter] = useState(() => initialParam('source', DEFAULT_SOURCE));
    // Actives par defaut — evite d'afficher d'emblee les offres desactivees accumulees.
    const [activeFilter, setActiveFilter] = useState(() => {
        const value = initialParam('active', DEFAULT_ACTIVE);
        return value === 'all' ? '' : value;
    });
    const [postedByFilter, setPostedByFilter] = useState(() => initialParam('postedBy'));
    // '' = toutes les offres, 'none' = sans lien ni adresse e-mail de candidature
    const [applyChannelFilter, setApplyChannelFilter] = useState(() => (initialParam('applyChannel') === 'none' ? 'none' : ''));
    // Lot 8 : filtre multi-formations (?formations=id1,id2) et onglet « Formations » (?vue=formations).
    const [formationFilter, setFormationFilter] = useState(() => initialParam('formations'));
    const view = searchParams.get('vue') === 'formations' ? 'formations' : 'offres';
    const [alertOffer, setAlertOffer] = useState<JobOffer | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
    const [viewingOffer, setViewingOffer] = useState<JobOffer | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
    const [applicantsOffer, setApplicantsOffer] = useState<JobOffer | null>(null);
    const [suggestOffer, setSuggestOffer] = useState<JobOffer | null>(null);
    const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
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

    useEffect(() => {
        const next = buildFilterSearch(window.location.search, {
            q: debouncedSearch.trim(),
            location: debouncedLocation.trim(),
            contractTypeId: contractTypeFilter,
            sectorId: isInternalSource ? sectorFilter : '',
            source: sourceFilter === DEFAULT_SOURCE ? '' : sourceFilter,
            active: activeFilter === DEFAULT_ACTIVE ? '' : (activeFilter || 'all'),
            postedBy: postedByFilter,
            applyChannel: applyChannelFilter,
            formations: formationFilter,
        });
        if (next !== new URLSearchParams(window.location.search).toString()) {
            setSearchParams(new URLSearchParams(next), { replace: true });
        }
    }, [debouncedSearch, debouncedLocation, contractTypeFilter, isInternalSource, sectorFilter, sourceFilter, activeFilter, postedByFilter, applyChannelFilter, formationFilter, setSearchParams]);
    // Par defaut : offres les plus demandees en premier
    const [sorting, setSorting] = useState<SortingState>([{ id: 'applicationCount', desc: true }]);

    const params = useMemo(() => ({
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        contractTypeId: contractTypeFilter || undefined,
        sectorId: isInternalSource ? (sectorFilter || undefined) : undefined,
        // « Brouillons » : filtre à part (une offre en brouillon est active, mais invisible des étudiants).
        active: activeFilter === '' || activeFilter === 'draft' ? undefined : activeFilter === 'true',
        draft: activeFilter === 'draft' ? true : undefined,
        source: sourceFilter || undefined,
        location: debouncedLocation || undefined,
        postedBy: postedByFilter || undefined,
        noApplyChannel: applyChannelFilter === 'none' ? true : undefined,
        programIds: formationFilter || undefined,
        sort: toSortParam(sorting),
    }), [debouncedSearch, contractTypeFilter, isInternalSource, sectorFilter, activeFilter, sourceFilter, debouncedLocation, postedByFilter, applyChannelFilter, formationFilter, sorting]);
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

    const { data: offerAuthors } = useOfferAuthors();
    const postedByOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.posted_by_filter.all', 'Tous les auteurs') },
        { value: POSTED_BY_EXTERNAL, label: t('dashboard.offres.posted_by_filter.external', 'Offres externes') },
        ...(offerAuthors ?? []).map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}`.trim() })),
    ], [offerAuthors, t]);

    const activeFilterOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.filter_all_statuses', 'Toutes les offres') },
        { value: 'true', label: t('dashboard.offres.table.active', 'Active') },
        { value: 'false', label: t('dashboard.offres.table.inactive', 'Inactive') },
        { value: 'draft', label: t('dashboard.offres.filter_drafts', 'Brouillons') },
    ], [t]);

    const applyChannelOptions = useMemo(() => [
        { value: '', label: t('dashboard.offres.apply_channel_filter.all', 'Tous') },
        { value: 'none', label: t('dashboard.offres.apply_channel_filter.none', 'Sans moyen de postuler') },
    ], [t]);

    const sourceOptions = useMemo(() => [
        { value: 'ALL', label: t('dashboard.offres.source_options.all', 'Toutes les offres (exclusivité ITIC PARIS + externes)') },
        { value: 'MANUAL', label: t('dashboard.offres.source_options.manual', 'Exclusivité ITIC PARIS') },
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
    const studentActions = useStudentDetailActions({ isAdmin, onAnonymizeSuccess: () => setViewingStudentId(null) });

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
        // Combinaisons sans resultat possible : on retire le filtre « Déposée par » qui contredit la source.
        const externalOnly = value !== 'ALL' && value !== 'MANUAL';
        if ((externalOnly && postedByFilter && postedByFilter !== POSTED_BY_EXTERNAL)
            || (value === 'MANUAL' && postedByFilter === POSTED_BY_EXTERNAL)) {
            setPostedByFilter('');
        }
    };

    const handlePostedByChange = (value: string) => {
        setPostedByFilter(value);
        // Meme logique dans l'autre sens : un auteur ITIC n'a pas d'offre externe, et inversement.
        const externalOnlySource = sourceFilter !== 'ALL' && sourceFilter !== 'MANUAL';
        if ((value === POSTED_BY_EXTERNAL && sourceFilter === 'MANUAL')
            || (value && value !== POSTED_BY_EXTERNAL && externalOnlySource)) {
            setSourceFilter(DEFAULT_SOURCE);
            setSectorFilter('');
        }
    };

    const handleMyOffersToggle = () => {
        handlePostedByChange(postedByFilter === currentUserId ? '' : currentUserId);
    };

    const handleActiveFilterChange = (value: string) => {
        setActiveFilter(value);
    };

    const activeFilterCount = [locationFilter, contractTypeFilter, isInternalSource ? sectorFilter : '', activeFilter !== 'true' ? activeFilter || 'all' : '', applyChannelFilter].filter(Boolean).length;

    const setView = (next: 'offres' | 'formations') => {
        const p = new URLSearchParams(window.location.search);
        if (next === 'formations') p.set('vue', 'formations');
        else p.delete('vue');
        setSearchParams(p, { replace: true });
    };

    /** Clic sur une formation (onglet Formations) : liste des offres de cette formation, mêmes filtres. */
    const showFormationOffers = (programId: string) => {
        setFormationFilter(programId);
        setSourceFilter(DEFAULT_SOURCE);
        const p = new URLSearchParams(window.location.search);
        p.delete('vue');
        p.set('formations', programId);
        p.delete('source');
        setSearchParams(p, { replace: true });
    };

    const handleResetFilters = () => {
        setLocationFilter('');
        setDebouncedLocation('');
        setContractTypeFilter('');
        setSectorFilter('');
        setActiveFilter('true');
        setApplyChannelFilter('');
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

    return (
        <div className="flex flex-col gap-6  animate-fadeIn">
            {/* Accroché en haut à partir de md ; sur mobile, la barre de filtres défile avec la page (lot 11). */}
            <div className="md:sticky md:top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-col gap-4">
                <OffresHeader
                    totalElements={totalElements}
                    isAdmin={isAdmin}
                    onExternalSyncClick={() => navigate('/supervisor/offres/synchronisation-externe')}
                    onWipeClick={() => setWipeDialogOpen(true)}
                    onCategoriesClick={() => navigate('/supervisor/offres/categories')}
                    onCreateClick={() => { setEditingOffer(null); setIsReadOnly(false); setFormOpen(true); }}
                />

                <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist">
                    {(['offres', 'formations'] as const).map((key) => (
                        <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
                            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap cursor-pointer ${view === key
                                ? 'border-[#3f74ff] text-[#3f74ff]'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                            {key === 'offres' ? t('formations.tab_offers', 'Offres') : t('formations.tab_formations', 'Formations')}
                        </button>
                    ))}
                </div>

                {view === 'offres' && <OffresFiltersBar
                    search={search}
                    onSearchChange={handleSearch}
                    onClearSearch={handleClearSearch}
                    sourceFilter={sourceFilter}
                    sourceOptions={sourceOptions}
                    onSourceChange={handleSourceChange}
                    postedByFilter={postedByFilter}
                    postedByOptions={postedByOptions}
                    onPostedByChange={handlePostedByChange}
                    myOffersActive={!!currentUserId && postedByFilter === currentUserId}
                    onMyOffersToggle={handleMyOffersToggle}
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
                    applyChannelFilter={applyChannelFilter}
                    applyChannelOptions={applyChannelOptions}
                    onApplyChannelChange={setApplyChannelFilter}
                    formationFilter={formationFilter}
                    onFormationChange={setFormationFilter}
                    activeFilterCount={activeFilterCount}
                    onReset={handleResetFilters}
                    isFetching={isFetching}
                    isLoading={isLoading}
                />}
            </div>

            {view === 'formations' && <FormationsTab onShowOffers={showFormationOffers} />}

            {view === 'offres' && <OffresTable
                offers={offers}
                isLoading={isLoading}
                sorting={sorting}
                onSortingChange={setSorting}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={fetchNextPage}
                onView={setViewingOffer}
                onEdit={(offer) => { setEditingOffer(offer); setIsReadOnly(false); setFormOpen(true); }}
                onSuggest={setSuggestOffer}
                onPreviewAlert={setAlertOffer}
                onViewApplicants={setApplicantsOffer}
            />}

            {alertOffer && <AlertRecipientsModal offer={alertOffer} onClose={() => setAlertOffer(null)} />}

            {suggestOffer && <SuggestedCandidatesModal offer={suggestOffer} onClose={() => setSuggestOffer(null)} />}

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
                    loadingStudentId={studentRowQuery.isFetching ? viewingStudentId : null}                />
            )}

            {studentRowQuery.data && viewingStudentId && (
                <StudentDetailModal
                    student={studentRowQuery.data}
                    onClose={() => setViewingStudentId(null)}
                    {...studentActions.studentDetailProps}
                />
            )}

            {studentActions.viewingCvStudentId && studentActions.studentCv && (
                <CVDetailModal
                    cv={studentActions.studentCv}
                    statuts={studentActions.cvStatuts}
                    onClose={() => studentActions.setViewingCvStudentId(null)}
                />
            )}

            {studentActions.notifyingStudent && (
                <NotifyStudentModal
                    student={studentActions.notifyingStudent}
                    onClose={studentActions.closeNotify}
                    onSend={studentActions.handleNotifyStudent}
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

            <ReactivateAccountDialog
                student={studentActions.reactivateTarget}
                loading={studentActions.reactivateLoading}
                onConfirm={studentActions.handleConfirmReactivate}
                onClose={studentActions.closeReactivateConfirm}
            />

            <DeleteAccountDialog account={studentActions.deleteAccount} onClose={studentActions.closeDeleteAccount} />

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
