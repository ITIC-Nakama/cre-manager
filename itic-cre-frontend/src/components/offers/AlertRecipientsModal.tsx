import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BellRing, Check, Loader2, X } from 'lucide-react';
import { fetchAlertRecipients } from '../../api-s/requests/OfferAlertRequest';
import type { JobOffer } from '../../types/models/JobOffer';

/** « Aperçu des destinataires » d'une offre : nombre et liste des étudiants qui recevront l'alerte. Aucun envoi. */
export default function AlertRecipientsModal({ offer, onClose }: { offer: JobOffer; onClose: () => void }) {
    const { t } = useTranslation();
    const { data, isLoading } = useQuery({ queryKey: ['offer-alerts', 'recipients', offer.id], queryFn: () => fetchAlertRecipients(offer.id) });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true"
            aria-labelledby="alert-recipients-title">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="min-w-0">
                        <h2 id="alert-recipients-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                            <BellRing className="h-4 w-4 text-amber-500" /> {t('alerts.preview_title', 'Destinataires de l’alerte')}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{offer.title} — {offer.company}</p>
                    </div>
                    <button onClick={onClose} aria-label={t('alerts.close', 'Fermer')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto space-y-3">
                    {isLoading || !data ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                    ) : (
                        <>
                            <p className="text-sm text-slate-700 dark:text-slate-200" data-testid="recipients-count">
                                {t('alerts.preview_count', '{{count}} étudiant(s) recevront l’alerte (actifs, sans contrat, abonnés).', { count: data.count })}
                            </p>
                            {!data.alertsEnabled && (
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">
                                    {t('alerts.preview_disabled', 'Les alertes instantanées sont désactivées sur ce serveur : aucun e-mail ne partira.')}
                                </p>
                            )}
                            {data.disabledFormations.length > 0 && (
                                <p className="text-xs text-slate-500">
                                    {t('alerts.preview_disabled_formations', 'Alertes coupées pour : {{list}}', { list: data.disabledFormations.join(', ') })}
                                </p>
                            )}
                            {data.recipients.length > 0 && (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
                                    {data.recipients.map((r) => (
                                        <li key={r.studentId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                            <span className="min-w-0">
                                                <span className="font-semibold text-slate-900 dark:text-white">{r.lastName} {r.firstName}</span>
                                                <span className="block text-xs text-slate-400 truncate">{r.formation}{r.promotion ? ` · ${r.promotion}` : ''}</span>
                                            </span>
                                            {r.alreadyAlerted && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                                                    <Check className="h-3 w-3" /> {t('alerts.preview_already', 'Déjà prévenu')}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
