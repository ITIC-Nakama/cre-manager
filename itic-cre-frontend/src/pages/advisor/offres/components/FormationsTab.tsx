import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { BellOff, BellRing, Link2, Loader2, ListFilter } from 'lucide-react';
import {
    fetchAlertJournal, fetchAlertSettings, fetchFormationsOverview, toggleFormationAlerts,
} from '../../../../api-s/requests/OfferAlertRequest';
import type { FormationOverview } from '../../../../api-s/requests/OfferAlertRequest';
import FormationOffersModal from './FormationOffersModal';

const FORMATIONS_KEY = ['offer-alerts', 'formations'] as const;

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Onglet « Formations » de l'écran des offres (lot 8) : une ligne par formation de l'annuaire, alertes activables,
 * clic → offres de la formation, rattachement manuel, et journal des envois.
 */
export default function FormationsTab({ onShowOffers }: { onShowOffers: (programId: string) => void }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [managing, setManaging] = useState<FormationOverview | null>(null);
    const [journalPage, setJournalPage] = useState(0);
    const { data: rows, isLoading } = useQuery({ queryKey: FORMATIONS_KEY, queryFn: fetchFormationsOverview });
    const { data: settings } = useQuery({ queryKey: ['offer-alerts', 'settings'], queryFn: fetchAlertSettings, staleTime: 5 * 60_000 });
    const { data: journal } = useQuery({ queryKey: ['offer-alerts', 'journal', journalPage], queryFn: () => fetchAlertJournal(journalPage, 20) });
    const toggle = useMutation({
        mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleFormationAlerts(id, enabled),
        onSuccess: (row) => {
            queryClient.setQueryData<FormationOverview[]>(FORMATIONS_KEY, (old) => old?.map((r) => (r.id === row.id ? row : r)));
            toast.success(row.alertsEnabled
                ? t('formations.toast_alerts_on', 'Alertes activées pour {{name}}.', { name: row.formation })
                : t('formations.toast_alerts_off', 'Alertes coupées pour {{name}}.', { name: row.formation }));
        },
        onError: () => toast.error(t('formations.toast_error', 'Action impossible. Réessayez.')),
    });

    return (
        <div className="space-y-6">
            {settings && (
                <p className={`text-sm rounded-xl px-4 py-3 ${settings.enabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'}`} data-testid="alerts-settings">
                    {settings.enabled
                        ? t('formations.settings_on', 'Alertes instantanées activées : envoi groupé sous {{window}} min, {{cap}} e-mails d’alerte par étudiant et par jour au plus (au-delà : l’e-mail du soir).', { window: settings.windowMinutes, cap: settings.dailyCap })
                        : t('formations.settings_off', 'Alertes instantanées désactivées sur ce serveur (APP_MAILING_INSTANT_OFFERS_ENABLED) : les réglages ci-dessous seront appliqués dès leur activation.')}
                </p>
            )}

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3">{t('formations.col_formation', 'Formation')}</th>
                                <th className="px-3 py-3 text-right">{t('formations.col_active_offers', 'Offres actives')}</th>
                                <th className="px-3 py-3 text-right">{t('formations.col_new_offers', 'Nouvelles (7 j)')}</th>
                                <th className="px-3 py-3 text-right">{t('formations.col_students', 'Étudiants actifs')}</th>
                                <th className="px-3 py-3 text-right">{t('formations.col_contracts', 'Sous contrat')}</th>
                                <th className="px-3 py-3">{t('formations.col_alerts', 'Alertes')}</th>
                                <th className="px-3 py-3">{t('formations.col_last_alert', 'Dernière alerte')}</th>
                                <th className="px-4 py-3 text-right">{t('formations.col_actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading || !rows ? (
                                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" /></td></tr>
                            ) : rows.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td className="px-4 py-2.5">
                                        <button type="button" onClick={() => onShowOffers(r.id)}
                                            className="font-semibold text-slate-900 dark:text-white hover:text-[#3f74ff] text-left cursor-pointer">
                                            {r.formation}
                                        </button>
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{r.activeOffers}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{r.newOffers7d}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{r.activeStudents}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{r.studentsUnderContract}</td>
                                    <td className="px-3 py-2.5">
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" role="switch" className="h-4 w-4 accent-[#3f74ff] cursor-pointer"
                                                checked={r.alertsEnabled} disabled={toggle.isPending}
                                                aria-label={t('formations.toggle_label', 'Alertes pour {{name}}', { name: r.formation })}
                                                onChange={(e) => toggle.mutate({ id: r.id, enabled: e.target.checked })} />
                                            {r.alertsEnabled
                                                ? <BellRing className="h-3.5 w-3.5 text-amber-500" />
                                                : <BellOff className="h-3.5 w-3.5 text-slate-400" />}
                                        </label>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDateTime(r.lastAlertAt)}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex justify-end gap-1">
                                            <button type="button" onClick={() => onShowOffers(r.id)}
                                                className="inline-flex p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                                title={t('formations.show_offers', 'Voir les offres de la formation')}
                                                aria-label={t('formations.show_offers', 'Voir les offres de la formation')}>
                                                <ListFilter className="h-4 w-4" />
                                            </button>
                                            <button type="button" onClick={() => setManaging(r)}
                                                className="inline-flex p-1 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                                                title={t('formations.manage_offers', 'Rattacher ou détacher des offres')}
                                                aria-label={t('formations.manage_offers', 'Rattacher ou détacher des offres')}>
                                                <Link2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <h2 className="px-5 py-3 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                    {t('alerts.journal_title', 'Journal des alertes')}
                </h2>
                {!journal ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : journal.content.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-slate-400 text-center">{t('alerts.journal_empty', 'Aucune alerte envoyée pour l’instant.')}</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs font-semibold uppercase text-slate-400">
                                    <tr>
                                        <th className="px-5 py-2">{t('alerts.journal_offer', 'Offre')}</th>
                                        <th className="px-3 py-2">{t('alerts.journal_formation', 'Formation')}</th>
                                        <th className="px-3 py-2 text-right">{t('alerts.journal_recipients', 'Destinataires')}</th>
                                        <th className="px-3 py-2 text-right">{t('alerts.journal_sent', 'Envoyés')}</th>
                                        <th className="px-3 py-2 text-right">{t('alerts.journal_failed', 'En échec')}</th>
                                        <th className="px-3 py-2 text-right">{t('alerts.journal_grouped', 'Regroupés')}</th>
                                        <th className="px-3 py-2 text-right">{t('alerts.journal_evening', 'Reportés au soir')}</th>
                                        <th className="px-3 py-2 text-right">{t('alerts.journal_pending', 'En attente')}</th>
                                        <th className="px-5 py-2">{t('alerts.journal_date', 'Date')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {journal.content.map((j) => (
                                        <tr key={`${j.offerId}-${j.programId}`}>
                                            <td className="px-5 py-2">
                                                <span className="font-semibold text-slate-900 dark:text-white">{j.offerTitle ?? '—'}</span>
                                                <span className="block text-xs text-slate-400">{j.company}</span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{j.formation ?? '—'}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{j.recipients}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{j.sent}</td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${j.failed > 0 ? 'text-rose-600 font-semibold' : ''}`}>{j.failed}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{j.grouped}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{j.evening}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{j.pending}</td>
                                            <td className="px-5 py-2 text-slate-500 whitespace-nowrap">{formatDateTime(j.lastAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {journal.totalPages > 1 && (
                            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-sm">
                                <button type="button" disabled={journalPage === 0} onClick={() => setJournalPage((p) => p - 1)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">
                                    {t('alerts.journal_prev', 'Précédent')}
                                </button>
                                <span className="text-slate-500">{journalPage + 1} / {journal.totalPages}</span>
                                <button type="button" disabled={journalPage + 1 >= journal.totalPages} onClick={() => setJournalPage((p) => p + 1)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">
                                    {t('alerts.journal_next', 'Suivant')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {managing && (
                <FormationOffersModal formation={managing} onClose={() => {
                    setManaging(null);
                    queryClient.invalidateQueries({ queryKey: ['offer-alerts'] });
                    queryClient.invalidateQueries({ queryKey: ['job-offers'] });
                }} />
            )}
        </div>
    );
}
