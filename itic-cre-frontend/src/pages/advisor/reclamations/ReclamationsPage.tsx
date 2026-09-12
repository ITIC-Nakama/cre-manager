import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCircle2, Clock, GraduationCap, Loader2, Mail, MessageCircleWarning, Phone, RotateCcw, UserCog, XCircle } from 'lucide-react';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import UserAvatar from '../../../components/shared/UserAvatar';
import InfiniteScrollSentinel from '../../../components/shared/InfiniteScrollSentinel';
import CustomSelect from '../../../components/basics/CustomSelect';
import { useAdvisorReclamationsInfinite, useResolveReclamation, useRefuseReclamation, useReopenReclamation } from '../../../hooks/useReclamations';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import type { ReclamationStatus } from '../../../types/models/Reclamation';

type StatusFilter = 'all' | ReclamationStatus;

const STATUS_STYLES: Record<ReclamationStatus, string> = {
    PENDING: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    RESOLVED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    REFUSED: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
};

export default function ReclamationsPage() {
    const { t, i18n } = useTranslation();
    const isAdmin = useUserStore((state) => state.user?.role) === Role.ADMIN;
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
    const [actingId, setActingId] = useState<string | null>(null);

    const params = useMemo(() => ({
        size: 15,
        status: statusFilter === 'all' ? undefined : statusFilter,
    }), [statusFilter]);

    const {
        items: reclamations, totalElements, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage,
    } = useAdvisorReclamationsInfinite(params);

    const resolveMutation = useResolveReclamation();
    const refuseMutation = useRefuseReclamation();
    const reopenMutation = useReopenReclamation();

    const statusOptions = [
        { value: 'PENDING', label: t('dashboard.reclamations_advisor.filter_pending', 'En attente') },
        { value: 'RESOLVED', label: t('dashboard.reclamations_advisor.filter_resolved', 'Résolues') },
        { value: 'REFUSED', label: t('dashboard.reclamations_advisor.filter_refused', 'Refusées') },
        { value: 'all', label: t('dashboard.reclamations_advisor.filter_all', 'Toutes') },
    ];

    const statusLabel = (status: ReclamationStatus) => ({
        PENDING: t('dashboard.reclamations_advisor.status_pending', 'En attente'),
        RESOLVED: t('dashboard.reclamations_advisor.status_resolved', 'Résolu'),
        REFUSED: t('dashboard.reclamations_advisor.status_refused', 'Refusé'),
    })[status];

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const runAction = async (id: string, mutateAsync: (id: string) => Promise<unknown>, successKey: string, successDefault: string) => {
        setActingId(id);
        try {
            await mutateAsync(id);
            toast.success(t(successKey, successDefault));
        } catch (err: any) {
            toast.error(err?.response?.data?.message || t('dashboard.reclamations_advisor.toast_error', 'Une erreur est survenue, réessayez.'));
        } finally {
            setActingId(null);
        }
    };

    const handleResolve = (id: string) => runAction(id, resolveMutation.mutateAsync, 'dashboard.reclamations_advisor.toast_resolved', 'Signalement marqué comme résolu.');
    const handleRefuse = (id: string) => runAction(id, refuseMutation.mutateAsync, 'dashboard.reclamations_advisor.toast_refused', 'Signalement refusé.');
    const handleReopen = (id: string) => runAction(id, reopenMutation.mutateAsync, 'dashboard.reclamations_advisor.toast_reopened', 'Signalement rouvert.');

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <MessageCircleWarning className="h-7 w-7 text-[#E2762F] shrink-0" />
                        {renderTitleWithGradient(t('dashboard.reclamations_advisor.title', 'Réclamations'), 'itic-gradient-blue')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t('dashboard.reclamations_advisor.subtitle', { count: totalElements, defaultValue: '{{count}} signalement(s)' })}
                    </p>
                </div>
                <CustomSelect
                    value={statusFilter}
                    options={statusOptions}
                    onChange={(v) => setStatusFilter(v as StatusFilter)}
                    className="w-full sm:w-48"
                />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : reclamations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                    <MessageCircleWarning className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                        {t('dashboard.reclamations_advisor.empty', 'Aucun signalement.')}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {reclamations.map((r) => (
                        <div
                            key={r.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <UserAvatar
                                        profilePicture={null}
                                        firstName={r.studentFirstName}
                                        lastName={r.studentLastName}
                                        className="h-10 w-10 flex-shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                            {r.studentFirstName} {r.studentLastName}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                                            <a href={`mailto:${r.studentEmail}`} className="inline-flex items-center gap-1 hover:text-indigo-500 transition-colors">
                                                <Mail className="h-3 w-3" />
                                                {r.studentEmail}
                                            </a>
                                            {r.studentPhoneNumber && (
                                                <a href={`tel:${r.studentPhoneNumber}`} className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors">
                                                    <Phone className="h-3 w-3" />
                                                    {r.studentPhoneNumber}
                                                </a>
                                            )}
                                            {r.studentPromotionName && (
                                                <span className="inline-flex items-center gap-1">
                                                    <GraduationCap className="h-3 w-3" />
                                                    {r.studentPromotionName}
                                                </span>
                                            )}
                                            {isAdmin && r.assignedAdvisorName && (
                                                <span className="inline-flex items-center gap-1">
                                                    <UserCog className="h-3 w-3" />
                                                    {r.assignedAdvisorName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[r.status]}`}>
                                    {r.status === 'RESOLVED' && <CheckCircle2 className="h-3 w-3" />}
                                    {r.status === 'REFUSED' && <XCircle className="h-3 w-3" />}
                                    {r.status === 'PENDING' && <Clock className="h-3 w-3" />}
                                    {statusLabel(r.status)}
                                </span>
                            </div>

                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{r.message}</p>

                            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-xs text-slate-400">{formatDate(r.dateCreation)}</span>
                                <div className="flex items-center gap-2">
                                    {r.status === 'PENDING' ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleRefuse(r.id)}
                                                disabled={actingId === r.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {actingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                                {t('dashboard.reclamations_advisor.refuse_button', 'Refuser')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleResolve(r.id)}
                                                disabled={actingId === r.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-60"
                                            >
                                                {actingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                {t('dashboard.reclamations_advisor.resolve_button', 'Marquer résolu')}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleReopen(r.id)}
                                            disabled={actingId === r.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            {actingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                            {t('dashboard.reclamations_advisor.reopen_button', 'Rouvrir')}
                                        </button>
                                    )}
                                </div>
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
        </div>
    );
}
