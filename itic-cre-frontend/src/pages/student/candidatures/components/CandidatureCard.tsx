import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import StatusBadge from '../../../../components/shared/StatusBadge';
import TruncatedText from '../../../../components/shared/TruncatedText';
import { useChangeCandidatureStatus } from '../../../../hooks/useCandidatures';
import type { ApplicationStatus, Candidature } from '../../../../types/models/Application';
import { daysAgoLabel } from '../utils';
import JobboardBadge from './JobboardBadge';
import CandidatureProgressBar from './CandidatureProgressBar';

interface Props {
    candidature: Candidature;
    statuses: ApplicationStatus[];
}

export default function CandidatureCard({ candidature, statuses }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const changeStatusMutation = useChangeCandidatureStatus();

    const nextStatus = candidature.status.ordre < 5
        ? statuses.find((s) => s.ordre === candidature.status.ordre + 1)
        : undefined;
    const nextStatusGrantsXp = !!nextStatus && nextStatus.gainXP > 0 && !candidature.reachedStatusIds.includes(nextStatus.id);

    const handleNextStep = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!nextStatus) return;
        try {
            const result = await changeStatusMutation.mutateAsync({ id: candidature.id, statusId: nextStatus.id });
            if (result.xpAwarded > 0) {
                toast.success(t('dashboard.candidatures.student.toast.status_changed_xp', { xp: result.xpAwarded }));
            } else {
                toast.success(t('dashboard.candidatures.student.toast.status_changed'));
            }
        } catch {
            toast.error(t('dashboard.candidatures.student.toast.action_error'));
        }
    };

    return (
        <div
            onClick={() => navigate(`/student/candidatures/${candidature.id}`)}
            className={`group cursor-pointer bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-3 ${
                candidature.stale ? 'border-l-2 border-l-amber-400 border-y-slate-200 border-r-slate-200 dark:border-y-slate-800 dark:border-r-slate-800' : 'border-slate-200 dark:border-slate-800'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <TruncatedText text={candidature.poste} className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                    <TruncatedText text={candidature.entreprise} className="text-sm text-slate-500 dark:text-slate-400" />
                </div>
                <StatusBadge nom={candidature.status.nom} couleur={candidature.status.couleur} className="flex-shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {candidature.typeContrat && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {candidature.typeContrat.label}
                    </span>
                )}
                {candidature.viaJobboard && <JobboardBadge />}
            </div>

            <CandidatureProgressBar candidature={candidature} statuses={statuses} />

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className={`inline-flex items-center gap-1 ${candidature.stale ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400'}`}>
                    {candidature.stale && <AlertCircle className="h-3.5 w-3.5" />}
                    {daysAgoLabel(candidature.dateModification, t, candidature.stale)}
                </span>

                {nextStatus && (
                    <button
                        onClick={handleNextStep}
                        disabled={changeStatusMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {changeStatusMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <ArrowRight className="h-3.5 w-3.5" />
                        )}
                        {t('dashboard.candidatures.student.card.next_step_button')}
                        {nextStatusGrantsXp && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                                {t('dashboard.candidatures.student.card.next_step_xp', { xp: nextStatus.gainXP })}
                            </span>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
