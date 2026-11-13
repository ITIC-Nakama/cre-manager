import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApplyFollowUp } from '../../hooks/useJobOfferApplyActions';

interface Props {
    followUp: ApplyFollowUp | null;
    isConfirming: boolean;
    onConfirm: () => void;
    onDismiss: () => void;
}

/**
 * Au retour sur la page après « Postuler » (lien ou e-mail) : l'étudiant confirme d'un clic que
 * sa candidature est partie, ce qui l'ajoute à son suivi, ou remet ça à plus tard.
 */
export default function ApplyFollowUpPrompt({ followUp, isConfirming, onConfirm, onDismiss }: Props) {
    const { t } = useTranslation();
    if (!followUp) return null;

    return (
        <div data-pwa-yield className="fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4 pointer-events-none">
            <div
                role="alertdialog"
                aria-labelledby="apply-follow-up-question"
                className="pointer-events-auto w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 animate-fadeIn"
            >
                <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Send className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p id="apply-follow-up-question" className="text-sm font-semibold text-slate-900 dark:text-white">
                            {t('dashboard.offres.follow_up.question', 'Tu as envoyé ta candidature ?')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{followUp.title}</p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3">
                    <button
                        type="button"
                        onClick={onDismiss}
                        disabled={isConfirming}
                        className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60"
                    >
                        {t('dashboard.offres.follow_up.later', 'Pas encore')}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                    >
                        {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {t('dashboard.offres.follow_up.confirm', 'Oui, marquer comme postée')}
                    </button>
                </div>
            </div>
        </div>
    );
}
