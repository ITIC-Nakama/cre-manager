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
    const steps = statuses.filter((s) => s.ordre >= 1 && s.ordre <= 5).sort((a, b) => a.ordre - b.ordre);
    const isOutsidePipeline = !steps.some((s) => s.id === candidature.status.id);

    return (
        <ol className="flex flex-col">
            {steps.map((step, idx) => {
                const reached = candidature.reachedStatusIds.includes(step.id)
                    || (!isOutsidePipeline && step.ordre <= candidature.status.ordre);
                const isCurrent = !isOutsidePipeline && step.id === candidature.status.id;
                const isPrevious = !readOnly && !isOutsidePipeline && step.ordre === candidature.status.ordre - 1;
                const isFuture = !readOnly && !isOutsidePipeline && step.ordre > candidature.status.ordre;
                const xpPreview = step.gainXP > 0 && !reached;
                const dotColor = step.couleur ?? '#3B71FF';

                return (
                    <li key={step.id} className="flex gap-3 pb-6 last:pb-0">
                        {/* Colonne gauche : cercle + trait */}
                        <div className="flex flex-col items-center shrink-0">
                            {/* Cercle indicateur */}
                            <span
                                className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 shrink-0"
                                style={{
                                    borderColor: reached ? dotColor : '#CBD5E1',
                                    color: reached ? dotColor : '#94A3B8',
                                    boxShadow: isCurrent ? `0 0 0 3px ${dotColor}33` : undefined,
                                }}
                            >
                                {reached ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : idx + 1}
                            </span>
                            {/* Trait vertical connecteur */}
                            {idx < steps.length - 1 && (
                                <span className="flex-1 w-px mt-1 bg-slate-200 dark:bg-slate-800 min-h-[16px]" />
                            )}
                        </div>

                        {/* Colonne droite : texte + boutons */}
                        <div className="flex flex-col gap-1 pb-1">
                            <div className="flex items-center gap-2 h-6">
                                <p className={`text-sm font-semibold leading-none ${isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {step.nom}
                                </p>
                                {isCurrent && (
                                    <span className="text-xs font-medium text-[#3B71FF] bg-[#3B71FF]/10 dark:bg-[#3B71FF]/20 rounded-full px-2 py-0.5 leading-none">
                                        {t('dashboard.candidatures.student.stepper.current_label')}
                                    </span>
                                )}
                            </div>

                            {isPrevious && (
                                <button
                                    onClick={() => onChangeStatus(step.id)}
                                    disabled={changing}
                                    className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {changing && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {t('dashboard.candidatures.student.stepper.go_back_button')}
                                </button>
                            )}

                            {isFuture && (
                                <button
                                    onClick={() => onChangeStatus(step.id)}
                                    disabled={changing}
                                    className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer disabled:opacity-50"
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
