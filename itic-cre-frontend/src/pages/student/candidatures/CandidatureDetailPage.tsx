import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, ExternalLink, Loader2, NotebookPen, Pencil, RotateCcw, Save, Trash2, XCircle } from 'lucide-react';
import StatusBadge from '../../../components/shared/StatusBadge';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import { useApplicationStatuses } from '../../../hooks/useApplications';
import {
    useCandidature, useUpdateCandidature, useChangeCandidatureStatus, useDeleteCandidature,
} from '../../../hooks/useCandidatures';
import type { CandidaturePayload } from '../../../types/models/Application';
import CandidatureStepper from './components/CandidatureStepper';
import CandidatureFormModal from './components/CandidatureFormModal';
import JobboardBadge from './components/JobboardBadge';
import { formatDateTime } from './utils';

export default function CandidatureDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [formOpen, setFormOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const { data: statuses } = useApplicationStatuses();
    const { data: candidature, isLoading } = useCandidature(id);
    const updateMutation = useUpdateCandidature();
    const changeStatusMutation = useChangeCandidatureStatus();
    const deleteMutation = useDeleteCandidature();

    // État de l'éditeur inline de notes
    const [notesValue, setNotesValue] = useState<string | null>(null);
    const notesHaveChanged = notesValue !== null && notesValue !== (candidature?.notes ?? '');

    const handleChangeStatus = async (statusId: string) => {
        if (!candidature) return;
        try {
            const result = await changeStatusMutation.mutateAsync({ id: candidature.id, statusId });
            if (result.xpAwarded > 0) {
                toast.success(t('dashboard.candidatures.student.toast.status_changed_xp', { xp: result.xpAwarded }));
            } else {
                toast.success(t('dashboard.candidatures.student.toast.status_changed'));
            }
        } catch {
            toast.error(t('dashboard.candidatures.student.toast.action_error'));
        }
    };

    const handleUpdate = async (payload: CandidaturePayload) => {
        if (!candidature) return;
        await updateMutation.mutateAsync({ id: candidature.id, payload });
        toast.success(t('dashboard.candidatures.student.toast.updated'));
        setFormOpen(false);
    };

    const handleSaveNotes = async () => {
        if (!candidature || notesValue === null) return;
        try {
            await updateMutation.mutateAsync({
                id: candidature.id,
                payload: {
                    entreprise: candidature.entreprise,
                    poste: candidature.poste,
                    typeContratId: candidature.typeContrat?.id ?? '',
                    lienOffre: candidature.lienOffre ?? '',
                    contact: candidature.contact ?? '',
                    notes: notesValue,
                },
            });
            toast.success(t('dashboard.candidatures.student.toast.updated'));
            setNotesValue(null); // Réinitialise l'état après sauvegarde
        } catch {
            toast.error(t('dashboard.candidatures.student.toast.action_error'));
        }
    };

    const handleDelete = async () => {
        if (!candidature) return;
        try {
            await deleteMutation.mutateAsync(candidature.id);
            toast.success(t('dashboard.candidatures.student.toast.deleted'));
            navigate('/student/candidatures');
        } catch {
            toast.error(t('dashboard.candidatures.student.toast.action_error'));
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
            </div>
        );
    }

    if (!candidature) {
        return (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                <p>{t('dashboard.candidatures.student.detail.not_found')}</p>
                <Link to="/student/candidatures" className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline">
                    {t('dashboard.candidatures.student.detail.back')}
                </Link>
            </div>
        );
    }

    const refusedStatus = statuses?.find((s) => s.ordre === 6);
    const postuleStatus = statuses?.find((s) => s.ordre === 2);
    const isRefused = candidature.status.ordre === 6;

    return (
        <div className="flex flex-col gap-6 pb-12 max-w-3xl animate-fadeIn">
            <Link
                to="/student/candidatures"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 w-fit"
            >
                <ArrowLeft className="h-4 w-4" />
                {t('dashboard.candidatures.student.detail.back')}
            </Link>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{candidature.poste}</h1>
                        {candidature.viaJobboard && <JobboardBadge />}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{candidature.entreprise}</p>
                </div>
                <div className="flex items-center gap-2">
                    {candidature.stale && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {t('dashboard.candidatures.student.detail.stale')}
                        </span>
                    )}
                    <StatusBadge nom={candidature.status.nom} couleur={candidature.status.couleur} />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => setFormOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('dashboard.candidatures.student.detail.edit_button')}
                </button>
                {!isRefused && refusedStatus && (
                    <button
                        onClick={() => handleChangeStatus(refusedStatus.id)}
                        disabled={changeStatusMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900 px-3 py-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <XCircle className="h-3.5 w-3.5" />
                        {t('dashboard.candidatures.student.detail.mark_refused_button')}
                    </button>
                )}
                <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('dashboard.candidatures.student.detail.delete_button')}
                </button>
            </div>

            {isRefused && (
                <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <XCircle className="h-4.5 w-4.5 text-rose-500 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                                {t('dashboard.candidatures.student.detail.refused_banner_title')}
                            </p>
                            <p className="text-xs text-rose-600/80 dark:text-rose-400/70">
                                {t('dashboard.candidatures.student.detail.refused_banner_message')}
                            </p>
                        </div>
                    </div>
                    {postuleStatus && (
                        <button
                            onClick={() => handleChangeStatus(postuleStatus.id)}
                            disabled={changeStatusMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 px-3 py-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {changeStatusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            {t('dashboard.candidatures.student.detail.reopen_button')}
                        </button>
                    )}
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <CandidatureStepper
                    candidature={candidature}
                    statuses={statuses ?? []}
                    changing={changeStatusMutation.isPending}
                    readOnly={isRefused}
                    onChangeStatus={handleChangeStatus}
                />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {t('dashboard.candidatures.student.detail.contract')}
                        </p>
                        <p className="text-slate-700 dark:text-slate-300">{candidature.typeContrat?.label ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {t('dashboard.candidatures.student.detail.contact')}
                        </p>
                        <p className="text-slate-700 dark:text-slate-300">{candidature.contact || '—'}</p>
                    </div>
                </div>

                {candidature.lienOffre && (
                    <a
                        href={candidature.lienOffre}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('dashboard.candidatures.student.detail.view_offer')}
                    </a>
                )}

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <NotebookPen className="h-3.5 w-3.5" />
                            {t('dashboard.candidatures.student.detail.notes')}
                        </p>
                        {notesHaveChanged && (
                            <button
                                onClick={handleSaveNotes}
                                disabled={updateMutation.isPending}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {updateMutation.isPending
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Save className="h-3 w-3" />}
                                {t('dashboard.candidatures.student.detail.notes_save')}
                            </button>
                        )}
                    </div>
                    <textarea
                        rows={4}
                        placeholder={t('dashboard.candidatures.student.detail.no_notes')}
                        value={notesValue ?? (candidature.notes ?? '')}
                        onChange={(e) => setNotesValue(e.target.value)}
                        className="w-full text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors placeholder:text-slate-400"
                    />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>{t('dashboard.candidatures.student.detail.created_at', { date: formatDateTime(candidature.dateCreation) })}</span>
                    <span>{t('dashboard.candidatures.student.detail.updated_at', { date: formatDateTime(candidature.dateModification) })}</span>
                </div>
            </div>

            {formOpen && (
                <CandidatureFormModal
                    candidature={candidature}
                    saving={updateMutation.isPending}
                    onClose={() => setFormOpen(false)}
                    onSave={handleUpdate}
                />
            )}

            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                title={t('dashboard.candidatures.student.detail.confirm_delete_title')}
                message={t('dashboard.candidatures.student.detail.confirm_delete_message', { poste: candidature.poste, entreprise: candidature.entreprise })}
                loading={deleteMutation.isPending}
                onConfirm={handleDelete}
                onClose={() => setDeleteConfirmOpen(false)}
            />
        </div>
    );
}
