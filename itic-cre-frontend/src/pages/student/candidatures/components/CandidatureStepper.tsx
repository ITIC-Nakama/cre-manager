import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import type { ApplicationStatus, Candidature } from '../../../../types/models/Application';

interface Props {
    candidature: Candidature;
    statuses: ApplicationStatus[];
    changing: boolean;
    readOnly?: boolean;
    onChangeStatus: (statusId: string) => void;
}

export default function CandidatureStepper({ candidature, statuses, changing, readOnly = false, onChangeStatus }: Props) {
    const { t } = useTranslation();
    const steps = statuses.filter((s) => s.ordre >= 2 && s.ordre <= 5).sort((a, b) => a.ordre - b.ordre);

    return (
        <ol>
            {steps.map((step, idx) => {
                const reached = candidature.reachedStatusIds.includes(step.id) || step.ordre <= candidature.status.ordre;
                const isCurrent = step.id === candidature.status.id;
                const isPrevious = !readOnly && step.ordre === candidature.status.ordre - 1;
                const isFuture = !readOnly && step.ordre > candidature.status.ordre;
                const xpPreview = step.gainXP > 0 && !reached;

                return (
                    <li key={step.id} className="relative pl-9 pb-7 last:pb-0">
                        {idx < steps.length - 1 && (
                            <span className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                        )}
                        <span
                            className={`absolute left-0 top-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isCurrent
                                    ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                                    : ''
                            } ${
                                reached
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                            }`}
                            style={isCurrent ? { boxShadow: `0 0 0 2px ${step.couleur ?? '#6366F1'}` } : undefined}
                        >
                            {reached ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                        </span>

                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold ${isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {step.nom}
                                </p>
                                {isCurrent && (
                                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-full px-2 py-0.5">
                                        {t('dashboard.candidatures.student.stepper.current_label')}
                                    </span>
                                )}
                            </div>

                            {isPrevious && (
                                <button
                                    onClick={() => onChangeStatus(step.id)}
                                    disabled={changing}
                                    className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {changing && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {t('dashboard.candidatures.student.stepper.go_back_button')}
                                </button>
                            )}

                            {isFuture && (
                                <button
                                    onClick={() => onChangeStatus(step.id)}
                                    disabled={changing}
                                    className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {changing && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {t('dashboard.candidatures.student.stepper.go_forward_button')}
                                    {xpPreview && (
                                        <span className="text-emerald-600 dark:text-emerald-400">
                                            {t('dashboard.candidatures.student.stepper.xp_preview', { xp: step.gainXP })}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
