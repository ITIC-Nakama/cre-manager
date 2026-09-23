import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    Banknote, Briefcase, Building2, Calendar, Contact, Download,
    GraduationCap, Loader2, Mail, Phone, Search, Trash2, Users, X,
} from 'lucide-react';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { getApiErrorMessage } from '../../../utils/errorHelper';
import UserAvatar from '../../../components/shared/UserAvatar';
import InfiniteScrollSentinel from '../../../components/shared/InfiniteScrollSentinel';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import CustomSelect from '../../../components/basics/CustomSelect';
import {
    useAlumniInfinite, useAlumniExitYears, useDeleteAlumniContact, useBulkDeleteAlumni,
} from '../../../hooks/useAlumni';
import { fetchAllAlumni } from '../../../api-s/requests/AlumniRequest';
import { exportAlumniCsv } from '../../../utils/csvExport';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import {
    ALUMNI_STATUSES, isWorkingStatus, type AlumniContact, type AlumniStatus,
} from '../../../types/models/Alumni';
import AlumniBulkBar from './components/AlumniBulkBar';

function IndeterminateCheckbox({
    indeterminate,
    className = '',
    ...rest
}: { indeterminate?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof indeterminate === 'boolean' && ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    return <input type="checkbox" ref={ref} className={className} {...rest} />;
}

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<AlumniStatus, string> = {
    CDI: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    CDD: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    ALTERNANCE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    STAGE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    FREELANCE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    JOB_SEARCH: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    TRAINING: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
    OTHER: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
};

export default function AlumniPage() {
    const { t, i18n } = useTranslation();
    const isAdmin = useUserStore((state) => state.user?.role) === Role.ADMIN;

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [exitYear, setExitYear] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectingAllMatching, setSelectingAllMatching] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<AlumniContact | null>(null);
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const params = useMemo(() => ({
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        exitYear: exitYear === 'all' ? undefined : Number(exitYear),
        status: statusFilter === 'all' ? undefined : (statusFilter as AlumniStatus),
    }), [debouncedSearch, exitYear, statusFilter]);

    const {
        items: contacts, totalElements, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage,
    } = useAlumniInfinite(params);

    const { data: dbExitYears } = useAlumniExitYears();
    const deleteMutation = useDeleteAlumniContact();
    const bulkDeleteMutation = useBulkDeleteAlumni();

    // Filtre d'années dynamique basé sur les données réelles en base
    const yearOptions = useMemo(() => [
        { value: 'all', label: t('dashboard.alumni.filter_all_years', 'Toutes les années') },
        ...(dbExitYears ?? []).map((year) => ({ value: String(year), label: String(year) })),
    ], [dbExitYears, t]);

    const statusOptions = useMemo(() => [
        { value: 'all', label: t('dashboard.alumni.filter_all_statuses', 'Toutes les situations') },
        ...ALUMNI_STATUSES.map((status) => ({ value: status, label: t(`alumni.status.${status}`, status) })),
    ], [t]);

    // Statistiques rapides
    const stats = useMemo(() => {
        const total = totalElements;
        const workingCount = contacts.filter((c) => isWorkingStatus(c.currentStatus)).length;
        const jobsearchCount = contacts.filter((c) => c.currentStatus === 'JOB_SEARCH').length;
        const trainingCount = contacts.filter((c) => c.currentStatus === 'TRAINING').length;

        return {
            total,
            workingCount,
            workingPct: total > 0 ? Math.round((workingCount / contacts.length) * 100) : 0,
            jobsearchCount,
            jobsearchPct: total > 0 ? Math.round((jobsearchCount / contacts.length) * 100) : 0,
            trainingCount,
        };
    }, [totalElements, contacts]);

    const clearSelection = () => setSelectedIds([]);

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

    const handleExitYearChange = (value: string) => {
        setExitYear(value);
        clearSelection();
    };

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        clearSelection();
    };

    // Sélection de ligne
    const handleToggleRow = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const allPageRowsSelected = contacts.length > 0 && contacts.every((c) => selectedIds.includes(c.id));
    const isSomePageRowsSelected = !allPageRowsSelected && contacts.some((c) => selectedIds.includes(c.id));
    const allMatchingSelected = totalElements > 0 && selectedIds.length >= totalElements;

    const handleToggleAllPage = () => {
        if (allPageRowsSelected) {
            clearSelection();
        } else {
            setSelectedIds(contacts.map((c) => c.id));
        }
    };

    // Réinitialiser la sélection si le nombre d'IDs dépasse le total disponible
    if (selectedIds.length > 0 && totalElements > 0 && selectedIds.length > totalElements) {
        setSelectedIds([]);
    }

    const handleSelectAllMatching = async () => {
        setSelectingAllMatching(true);
        try {
            const all = await fetchAllAlumni(params);
            setSelectedIds(all.map((c) => c.id));
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.alumni.bulk.select_all_error'));
        } finally {
            setSelectingAllMatching(false);
        }
    };

    // Suppression unitaire
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            toast.success(t('dashboard.alumni.toast_deleted', 'Fiche supprimée.'));
            setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t('dashboard.alumni.toast_error', 'Une erreur est survenue, réessayez.')));
        }
    };

    // Suppression multiple
    const handleConfirmBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        try {
            await bulkDeleteMutation.mutateAsync(selectedIds);
            toast.success(t('dashboard.alumni.bulk.toast_deleted', { count: selectedIds.length, defaultValue: '{{count}} fiche(s) supprimée(s).' }));
            clearSelection();
            setBulkDeleteConfirmOpen(false);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t('dashboard.alumni.toast_error', 'Une erreur est survenue, réessayez.')));
        }
    };

    // Export CSV
    const handleExportCsv = async (onlySelected = false) => {
        setIsExporting(true);
        try {
            let dataToExport: AlumniContact[] = [];
            if (onlySelected && selectedIds.length > 0) {
                const all = await fetchAllAlumni(params);
                dataToExport = all.filter((c) => selectedIds.includes(c.id));
            } else {
                dataToExport = await fetchAllAlumni(params);
            }

            exportAlumniCsv(dataToExport);
            toast.success(t('dashboard.alumni.toast_exported', { count: dataToExport.length, defaultValue: '{{count}} fiche(s) exportée(s).' }));
        } catch {
            toast.error(t('dashboard.alumni.toast_export_error', 'Erreur lors de l\'export CSV.'));
        } finally {
            setIsExporting(false);
        }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Header + Stats */}
            <div className="lg:sticky lg:top-0 lg:z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Contact className="h-7 w-7 text-[#E2762F] shrink-0" />
                            {renderTitleWithGradient(t('dashboard.alumni.title', 'Alumni'), 'itic-gradient-blue')}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {t('dashboard.alumni.subtitle', { count: totalElements, defaultValue: '{{count}} fiche(s) au total' })}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleExportCsv(false)}
                        disabled={isExporting || totalElements === 0}
                        className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Download className="h-4 w-4 text-[#3f74ff]" />}
                        {t('dashboard.alumni.export_button', 'Exporter en CSV')}
                    </button>
                </div>

                {/* Badges / Statistiques rapides */}
                {totalElements > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col">
                            <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-slate-400" />
                                {t('dashboard.alumni.stats_total', 'Total fiches')}
                            </span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white mt-1">{stats.total}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col">
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5" />
                                {t('dashboard.alumni.stats_working', 'En activité')}
                            </span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.workingCount}</span>
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">({stats.workingPct}%)</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col">
                            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <Search className="h-3.5 w-3.5" />
                                {t('dashboard.alumni.stats_jobsearch', 'En recherche')}
                            </span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.jobsearchCount}</span>
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">({stats.jobsearchPct}%)</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col">
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <GraduationCap className="h-3.5 w-3.5" />
                                {t('dashboard.alumni.stats_training', 'En formation')}
                            </span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white mt-1">{stats.trainingCount}</span>
                        </div>
                    </div>
                )}

                {/* Filtres et recherche */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder={t('dashboard.alumni.search_placeholder', 'Nom, email, formation, entreprise, poste…')}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3f74ff] transition-colors"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                aria-label={t('dashboard.alumni.clear_search', 'Effacer la recherche')}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <CustomSelect value={exitYear} options={yearOptions} onChange={handleExitYearChange} className="w-full sm:w-48" />
                    <CustomSelect value={statusFilter} options={statusOptions} onChange={handleStatusFilterChange} className="w-full sm:w-56" />
                </div>
            </div>

            {/* Barre d'action groupée (Bulk) */}
            {selectedIds.length > 0 && (
                <AlumniBulkBar
                    selectedCount={selectedIds.length}
                    totalElements={totalElements}
                    allPageRowsSelected={allPageRowsSelected}
                    allMatchingSelected={allMatchingSelected}
                    isAdmin={isAdmin}
                    processing={bulkDeleteMutation.isPending || isExporting}
                    selectingAllMatching={selectingAllMatching}
                    onDelete={() => setBulkDeleteConfirmOpen(true)}
                    onExport={() => handleExportCsv(true)}
                    onClear={clearSelection}
                    onSelectAllMatching={handleSelectAllMatching}
                />
            )}

            {/* Liste des fiches */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                    <Contact className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                        {t('dashboard.alumni.empty', 'Aucune fiche alumni.')}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {/* Contrôle Tout sélectionner pour la page */}
                    {contacts.length > 0 && (
                        <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                <IndeterminateCheckbox
                                    checked={allPageRowsSelected}
                                    indeterminate={isSomePageRowsSelected}
                                    onChange={handleToggleAllPage}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="font-medium">
                                    {allPageRowsSelected
                                        ? t('dashboard.alumni.unselect_page')
                                        : t('dashboard.alumni.select_page')}
                                </span>
                            </label>
                            <span>
                                {selectedIds.length > 0 && (
                                    <span>
                                        {t('dashboard.alumni.selected_count', { count: selectedIds.length })}
                                    </span>
                                )}
                            </span>
                        </div>
                    )}

                    {contacts.map((c) => {
                        const isSelected = selectedIds.includes(c.id);
                        const isWorking = isWorkingStatus(c.currentStatus);

                        return (
                            <div
                                key={c.id}
                                className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
                                    isSelected
                                        ? 'border-indigo-500/80 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm'
                                        : 'border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleRow(c.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                        />
                                        <UserAvatar profilePicture={null} firstName={c.firstName} lastName={c.lastName} className="h-10 w-10 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                                {c.firstName} {c.lastName}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                                                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-indigo-500 transition-colors">
                                                    <Mail className="h-3 w-3" />
                                                    {c.email}
                                                </a>
                                                {c.phoneNumber && (
                                                    <a href={`tel:${c.phoneNumber}`} className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors">
                                                        <Phone className="h-3 w-3" />
                                                        {c.phoneNumber}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[c.currentStatus]}`}>
                                        {t(`alumni.status.${c.currentStatus}`, c.currentStatus)}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                    <span className="inline-flex items-center gap-1.5">
                                        <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                                        {c.formation}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        {t('dashboard.alumni.exit_year_value', { year: c.exitYear, defaultValue: 'Sorti en {{year}}' })}
                                    </span>
                                    {isWorking && c.company && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                            {c.company}
                                        </span>
                                    )}
                                    {c.jobTitle && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                            {c.jobTitle}
                                        </span>
                                    )}
                                    {c.salaryExpectation && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Banknote className="h-3.5 w-3.5 text-slate-400" />
                                            {isWorking ? `Actuel : ${c.salaryExpectation}` : `Souhaité : ${c.salaryExpectation}`}
                                        </span>
                                    )}
                                </div>

                                {c.jobInContinuity && c.continuityFormation && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {t('dashboard.alumni.continuity_value', { formation: c.continuityFormation, defaultValue: 'Poste dans la continuité de : {{formation}}' })}
                                    </p>
                                )}

                                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-400">
                                        {t('dashboard.alumni.submitted_on', { date: formatDate(c.createdAt), defaultValue: 'Reçue le {{date}}' })}
                                    </span>
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(c)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            {t('dashboard.alumni.delete_button', 'Supprimer')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <InfiniteScrollSentinel
                        hasMore={!!hasNextPage}
                        isLoadingMore={isFetchingNextPage}
                        onLoadMore={fetchNextPage}
                    />
                </div>
            )}

            {/* Modale de suppression unitaire */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title={t('dashboard.alumni.confirm_delete_title', 'Supprimer cette fiche ?')}
                message={t('dashboard.alumni.confirm_delete_message', {
                    name: deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : '',
                    defaultValue: 'La fiche de {{name}} sera supprimée définitivement. Cette action est irréversible.',
                })}
                confirmLabel={t('dashboard.alumni.delete_button', 'Supprimer')}
                loading={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onClose={() => setDeleteTarget(null)}
            />

            {/* Modale de suppression multiple */}
            <ConfirmDialog
                isOpen={bulkDeleteConfirmOpen}
                title={t('dashboard.alumni.bulk.confirm_title', 'Supprimer les fiches sélectionnées ?')}
                message={t('dashboard.alumni.bulk.confirm_message', {
                    count: selectedIds.length,
                    defaultValue: 'Vous êtes sur le point de supprimer {{count}} fiche(s) alumni. Cette action est irréversible.',
                })}
                confirmLabel={t('dashboard.alumni.bulk.delete_button', 'Supprimer définitivement')}
                loading={bulkDeleteMutation.isPending}
                onConfirm={handleConfirmBulkDelete}
                onClose={() => setBulkDeleteConfirmOpen(false)}
            />
        </div>
    );
}
