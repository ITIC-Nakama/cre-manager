import { useState } from 'react';
import { AlertCircle, ArrowLeft, Briefcase, ExternalLink, MapPin, Handshake, Loader2, Save, ShieldCheck, ShieldAlert, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import StatusBadge from '../../../../components/shared/StatusBadge';
import ConfirmDialog from '../../../../components/shared/ConfirmDialog';
import { useUpdateContractDates, useVerifyContract, useRejectContract } from '../../../../hooks/useApplications';
import { formatDateTime } from '../types';
import type { ApplicationRow } from '../../../../types/models/Application';

interface Props {
    app: ApplicationRow;
    onBack: () => void;
    onUpdated: (patch: Partial<ApplicationRow>) => void;
}

export default function ApplicationDetail({ app, onBack, onUpdated }: Props) {
    const { t } = useTranslation();
    const updateContractDatesMutation = useUpdateContractDates();
    const verifyMutation = useVerifyContract();
    const rejectMutation = useRejectContract();
    const [startDate, setStartDate] = useState(app.startDate ?? '');
    const [endDate, setEndDate] = useState(app.endDate ?? '');
    const [dateError, setDateError] = useState<string | null>(null);
    const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

    const hasChanges = startDate !== (app.startDate ?? '') || endDate !== (app.endDate ?? '');

    const handleSaveContractDates = async () => {
        if (startDate && endDate && endDate < startDate) {
            setDateError(t('dashboard.candidatures.detail.invalid_dates', 'La date de fin doit être postérieure à la date de début'));
            return;
        }
        setDateError(null);
        try {
            const updated = await updateContractDatesMutation.mutateAsync({
                id: app.id,
                startDate: startDate || null,
                endDate: endDate || null,
            });
            onUpdated({ startDate: updated.startDate, endDate: updated.endDate, contractVerified: updated.contractVerified });
            toast.success(t('dashboard.candidatures.detail.contract_dates_saved', 'Dates du contrat enregistrées'));
        } catch {
            toast.error(t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — cet étudiant n'est peut-être pas dans votre portefeuille"));
        }
    };

    const handleVerify = async () => {
        try {
            const updated = await verifyMutation.mutateAsync(app.id);
            onUpdated({ contractVerified: updated.contractVerified });
            toast.success(t('dashboard.candidatures.detail.contract_verified', 'Déclaration confirmée'));
        } catch {
            toast.error(t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — cet étudiant n'est peut-être pas dans votre portefeuille"));
        }
    };

    const handleReject = async () => {
        try {
            const updated = await rejectMutation.mutateAsync(app.id);
            onUpdated({ status: updated.status, startDate: updated.startDate, endDate: updated.endDate, contractVerified: updated.contractVerified });
            toast.success(t('dashboard.candidatures.detail.contract_rejected', 'Déclaration refusée — statut précédent rétabli'));
            setRejectConfirmOpen(false);
        } catch {
            toast.error(t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — cet étudiant n'est peut-être pas dans votre portefeuille"));
        }
    };

    return (
        <div className="flex flex-col h-full">
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-4 cursor-pointer"
            >
                <ArrowLeft className="h-4 w-4" />
                {t('dashboard.candidatures.detail.back')}
            </button>

            <div className={`flex-1 overflow-y-auto space-y-4 rounded-xl border p-4 ${
                app.stale
                    ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
            }`}>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{app.poste}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{app.entreprise}</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge nom={app.status.nom} couleur={app.status.couleur} />
                    {app.stale && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {t('dashboard.candidatures.detail.stale')}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1">{t('dashboard.candidatures.detail.contract')}</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{app.typeContrat?.label ?? '—'}</p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1">{t('dashboard.candidatures.detail.contact')}</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{app.contact || '—'}</p>
                    </div>
                </div>

                {app.status.compteCommeContrat && (
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <Handshake className="h-3.5 w-3.5" />
                        {t('dashboard.candidatures.detail.contract_dates', 'Dates du contrat')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-[11px] font-medium text-slate-400">
                                {t('dashboard.candidatures.detail.start_date', 'Début')}
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[11px] font-medium text-slate-400">
                                {t('dashboard.candidatures.detail.end_date', 'Fin')}
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    {dateError && <p className="text-xs text-rose-500">{dateError}</p>}
                    {hasChanges && (
                        <button
                            onClick={handleSaveContractDates}
                            disabled={updateContractDatesMutation.isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {updateContractDatesMutation.isPending
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Save className="h-3 w-3" />}
                            {t('dashboard.candidatures.detail.save', 'Enregistrer')}
                        </button>
                    )}
                </div>
                )}

                {app.status.compteCommeContrat && (
                    <div className={`rounded-xl border p-3 space-y-2.5 ${
                        app.contractVerified
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                    }`}>
                        <div className="flex items-start gap-1.5">
                            {app.contractVerified ? (
                                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                                <p className={`text-xs font-semibold ${app.contractVerified ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                    {app.contractVerified
                                        ? t('dashboard.candidatures.detail.contract_verified_label', 'Contrat vérifié par un conseiller')
                                        : t('dashboard.candidatures.detail.contract_unverified_label', 'À vérifier — statut déclaré par l\'étudiant, pas encore confirmé')}
                                </p>
                                {!app.contractVerified && (
                                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                                        {t('dashboard.candidatures.detail.contract_unverified_hint', "L'étudiant a lui-même indiqué avoir reçu cette offre. Vérifiez l'information (contrat, e-mail de l'entreprise...) avant de confirmer, ou refusez si l'offre n'a pas été reçue.")}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {!app.contractVerified && (
                                <button
                                    onClick={handleVerify}
                                    disabled={verifyMutation.isPending}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {verifyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                    {t('dashboard.candidatures.detail.verify_button', 'Marquer comme vérifié')}
                                </button>
                            )}
                            <button
                                onClick={() => setRejectConfirmOpen(true)}
                                disabled={rejectMutation.isPending}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <XCircle className="h-3 w-3" />
                                {t('dashboard.candidatures.detail.reject_button', "Refuser l'offre")}
                            </button>
                        </div>
                    </div>
                )}

                {app.lienOffre && (
                    <a
                        href={app.lienOffre}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('dashboard.candidatures.detail.view_offer')}
                    </a>
                )}

                {(app.offreDescription || app.offreLocation) && (
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {app.offreCompanyLogoUrl ? (
                                <img
                                    src={app.offreCompanyLogoUrl}
                                    alt={app.entreprise}
                                    className="h-5 w-5 rounded object-contain border border-slate-200 dark:border-slate-800 bg-white"
                                />
                            ) : (
                                <Briefcase className="h-4 w-4 text-indigo-500" />
                            )}
                            <h3>{t('dashboard.candidatures.detail.offer_snapshot', "Détails de l'offre")}</h3>
                            {app.offreLocation && (
                                <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium normal-case text-slate-500 dark:text-slate-400">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                    {app.offreLocation}
                                </span>
                            )}
                        </div>
                        {app.offreDescription && (
                            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300 break-words">
                                {app.offreDescription}
                            </p>
                        )}
                    </div>
                )}

                {app.notes && (
                    <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1">{t('dashboard.candidatures.detail.notes')}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                            {app.notes}
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>{t('dashboard.candidatures.detail.created_at', { date: formatDateTime(app.dateCreation) })}</span>
                    <span>{t('dashboard.candidatures.detail.updated_at', { date: formatDateTime(app.dateModification) })}</span>
                </div>
            </div>

            <ConfirmDialog
                isOpen={rejectConfirmOpen}
                title={t('dashboard.candidatures.detail.reject_confirm_title', "Refuser l'offre reçue")}
                message={t('dashboard.candidatures.detail.reject_confirm_message', { poste: app.poste, entreprise: app.entreprise, defaultValue: 'Revenir au statut précédent pour "{{poste}}" chez {{entreprise}} ? L\'XP associé sera repris.' })}
                confirmLabel={t('dashboard.candidatures.detail.reject_button', "Refuser l'offre")}
                loading={rejectMutation.isPending}
                onConfirm={handleReject}
                onClose={() => setRejectConfirmOpen(false)}
            />
        </div>
    );
}
