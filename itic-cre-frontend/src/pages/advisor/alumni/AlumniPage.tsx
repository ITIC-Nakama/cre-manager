import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Banknote, Briefcase, Building2, Calendar, Contact, GraduationCap, Loader2, Mail, Phone, Search, Trash2, X } from 'lucide-react';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { getApiErrorMessage } from '../../../utils/errorHelper';
import UserAvatar from '../../../components/shared/UserAvatar';
import InfiniteScrollSentinel from '../../../components/shared/InfiniteScrollSentinel';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import CustomSelect from '../../../components/basics/CustomSelect';
import { useAlumniInfinite, useDeleteAlumniContact } from '../../../hooks/useAlumni';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import { ALUMNI_STATUSES, alumniExitYears, isWorkingStatus, type AlumniContact, type AlumniStatus } from '../../../types/models/Alumni';

const PAGE_SIZE = 20;

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
    const [deleteTarget, setDeleteTarget] = useState<AlumniContact | null>(null);
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

    const deleteMutation = useDeleteAlumniContact();

    const yearOptions = useMemo(() => [
        { value: 'all', label: t('dashboard.alumni.filter_all_years', 'Toutes les années') },
        ...alumniExitYears().map((year) => ({ value: String(year), label: String(year) })),
    ], [t]);

    const statusOptions = useMemo(() => [
        { value: 'all', label: t('dashboard.alumni.filter_all_statuses', 'Toutes les situations') },
        ...ALUMNI_STATUSES.map((status) => ({ value: status, label: t(`alumni.status.${status}`, status) })),
    ], [t]);

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

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            toast.success(t('dashboard.alumni.toast_deleted', 'Fiche supprimée.'));
            setDeleteTarget(null);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t('dashboard.alumni.toast_error', 'Une erreur est survenue, réessayez.')));
        }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Contact className="h-7 w-7 text-[#E2762F] shrink-0" />
                        {renderTitleWithGradient(t('dashboard.alumni.title', 'Alumni'), 'itic-gradient-blue')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t('dashboard.alumni.subtitle', { count: totalElements, defaultValue: '{{count}} fiche(s)' })}
                    </p>
                </div>

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
                    <CustomSelect value={exitYear} options={yearOptions} onChange={setExitYear} className="w-full sm:w-48" />
                    <CustomSelect value={statusFilter} options={statusOptions} onChange={setStatusFilter} className="w-full sm:w-56" />
                </div>
            </div>

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
                    {contacts.map((c) => (
                        <div
                            key={c.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
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
                                {isWorkingStatus(c.currentStatus) && c.company && (
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
                                        {c.salaryExpectation}
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
                    ))}
                    <InfiniteScrollSentinel
                        hasMore={!!hasNextPage}
                        isLoadingMore={isFetchingNextPage}
                        onLoadMore={fetchNextPage}
                    />
                </div>
            )}

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
        </div>
    );
}
