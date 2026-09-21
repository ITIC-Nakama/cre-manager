import { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRightCircle, Briefcase, ExternalLink, MapPin, Handshake, Loader2, Pencil, Save, ShieldCheck, ShieldAlert, Trash2, Users, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import StatusBadge from '../../../../components/shared/StatusBadge';
import ConfirmDialog from '../../../../components/shared/ConfirmDialog';
import DateInput from '../../../../components/basics/DateInput';
import CustomSelect from '../../../../components/basics/CustomSelect';
import CandidatureFormModal from '../../../student/candidatures/components/CandidatureFormModal';
import { useUpdateContractDates, useValidateContract, useInvalidateContract, useUpdateApplicationAsAdvisor, useDeleteApplicationAsAdvisor, useChangeApplicationStatusAsAdvisor, useApplicationStatuses } from '../../../../hooks/useApplications';
import { getApiErrorMessage } from '../../../../utils/errorHelper';
import { formatDate, formatDateTime, isActiveContract, isPendingValidation } from '../types';
import type { ApplicationRow } from '../../../../types/models/Application';

interface Props {
    app: ApplicationRow;
    onBack: () => void;
    onUpdated: (patch: Partial<ApplicationRow>) => void;
    /** Appele apres une suppression reussie (delete-as-advisor) — le parent doit retirer cette
      * candidature de sa liste et revenir a la vue precedente. */
    onDeleted?: () => void;
    /** Autres candidatures du meme etudiant (deja chargees par StudentDrawer) — sert uniquement a
      * detecter, avant meme d'essayer de valider, qu'un autre contrat est deja actif pour cet
      * etudiant (voir bandeau d'avertissement plus bas). */
    siblingApplications?: ApplicationRow[];
}

export default function ApplicationDetail({ app, onBack, onUpdated, onDeleted, siblingApplications = [] }: Props) {
    const { t } = useTranslation();
    const updateContractDatesMutation = useUpdateContractDates();
    const validateMutation = useValidateContract();
    const invalidateMutation = useInvalidateContract();
    const updateAsAdvisorMutation = useUpdateApplicationAsAdvisor();
    const deleteAsAdvisorMutation = useDeleteApplicationAsAdvisor();
    const changeStatusAsAdvisorMutation = useChangeApplicationStatusAsAdvisor();
    const { data: allStatuses } = useApplicationStatuses();
    const [startDate, setStartDate] = useState(app.startDate ?? '');
    const [endDate, setEndDate] = useState(app.endDate ?? '');
    const [dateError, setDateError] = useState<string | null>(null);
    const [invalidateConfirmOpen, setInvalidateConfirmOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [statusStagedId, setStatusStagedId] = useState(app.status.id);
    const [statusChangeAttempted, setStatusChangeAttempted] = useState(false);

    const hasChanges = startDate !== (app.startDate ?? '') || endDate !== (app.endDate ?? '');
    const conflictingActiveContract = isPendingValidation(app)
        ? siblingApplications.find((other) => other.id !== app.id && isActiveContract(other))
        : undefined;

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
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — veuillez réessayer")));
        }
    };

    const handleMarkAsEnded = async () => {
        if (!endDate) {
            setDateError(t('dashboard.candidatures.detail.end_date_required', 'Indiquez la date de fin du contrat ci-dessus'));
            return;
        }
        setDateError(null);
        try {
            const updated = await updateContractDatesMutation.mutateAsync({
                id: app.id,
                startDate: app.startDate,
                endDate,
            });
            onUpdated({ startDate: updated.startDate, endDate: updated.endDate, contractVerified: updated.contractVerified });
            const stillActiveToday = endDate >= new Date().toISOString().slice(0, 10);
            toast.success(stillActiveToday
                ? t('dashboard.candidatures.detail.contract_ended_still_active_today', { date: formatDate(endDate), defaultValue: 'Contrat marqué comme terminé — reste actif jusqu\'au {{date}} inclus' })
                : t('dashboard.candidatures.detail.contract_ended', 'Contrat marqué comme terminé'));
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — veuillez réessayer")));
        }
    };

    const handleValidate = async () => {
        try {
            const updated = await validateMutation.mutateAsync(app.id);
            onUpdated({ contractVerified: updated.contractVerified });
            toast.success(t('dashboard.candidatures.detail.contract_validated', 'Déclaration validée'));
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — veuillez réessayer")));
        }
    };

    const handleInvalidate = async () => {
        try {
            const updated = await invalidateMutation.mutateAsync(app.id);
            onUpdated({ status: updated.status, startDate: updated.startDate, endDate: updated.endDate, contractVerified: updated.contractVerified });
            toast.success(t('dashboard.candidatures.detail.contract_invalidated', 'Déclaration invalidée — statut précédent rétabli'));
            setInvalidateConfirmOpen(false);
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — veuillez réessayer")));
        }
    };

    const handleEditSave = async (payload: {
        entreprise: string; poste: string; typeContratId?: string; lienOffre?: string; contact?: string; notes?: string;
    }) => {
        const updated = await updateAsAdvisorMutation.mutateAsync({ id: app.id, payload });
        onUpdated({
            entreprise: updated.entreprise, poste: updated.poste, typeContrat: updated.typeContrat,
            lienOffre: updated.lienOffre, contact: updated.contact, notes: updated.notes,
        });
        toast.success(t('dashboard.candidatures.detail.edit_success', 'Candidature mise à jour.'));
        setEditOpen(false);
    };

    const handleDelete = async () => {
        try {
            await deleteAsAdvisorMutation.mutateAsync(app.id);
            toast.success(t('dashboard.candidatures.detail.delete_success', 'Candidature supprimée.'));
            setDeleteConfirmOpen(false);
            onDeleted?.();
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — veuillez réessayer")));
        }
    };

    const statusOptions = (allStatuses ?? [])
        .slice()
        .sort((a, b) => a.ordre - b.ordre)
        .map((s) => ({ value: s.id, label: s.nom }));
    const stagedStatus = allStatuses?.find((s) => s.id === statusStagedId);
    const hasStatusChange = statusStagedId !== app.status.id;
    const stagedIsContractStatus = hasStatusChange && !!stagedStatus?.compteCommeContrat;
    const stagedNeedsStartDate = stagedIsContractStatus && !startDate;

    const handleApplyStatusChange = async () => {
        if (!hasStatusChange) return;
        setStatusChangeAttempted(true);
        if (stagedNeedsStartDate) return;
        try {
            const updated = await changeStatusAsAdvisorMutation.mutateAsync({
                id: app.id,
                statusId: statusStagedId,
                startDate: stagedStatus?.compteCommeContrat ? startDate : undefined,
                endDate: stagedStatus?.compteCommeContrat ? (endDate || undefined) : undefined,
            });
            onUpdated({
                status: updated.status, contractVerified: updated.contractVerified,
                startDate: updated.startDate, endDate: updated.endDate,
                lastStatusModifiedByName: updated.lastStatusModifiedByName,
            });
            toast.success(t('dashboard.candidatures.detail.status_change_success', 'Statut mis à jour.'));
            setStatusStagedId(updated.status.id);
            setStatusChangeAttempted(false);
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — veuillez réessayer")));
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
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{app.poste}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{app.entreprise}</p>
                    </div>
                    {app.createdByAdvisor && (
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => setEditOpen(true)}
                                title={t('dashboard.candidatures.detail.edit_button', 'Modifier')}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => setDeleteConfirmOpen(true)}
                                title={t('dashboard.candidatures.detail.delete_button', 'Supprimer')}
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge nom={app.status.nom} couleur={app.status.couleur} />
                    {app.createdByAdvisor && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#E2762F] font-semibold">
                            <Users className="h-3.5 w-3.5" />
                            {t('dashboard.candidatures.detail.created_by_advisor_badge', 'Créée par le CRE')}
                        </span>
                    )}
                    {app.stale && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {t('dashboard.candidatures.detail.stale')}
                        </span>
                    )}
                </div>

                {app.createdByAdvisor && (
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                            <ArrowRightCircle className="h-3.5 w-3.5" />
                            {t('dashboard.candidatures.detail.change_status_label', 'Changer le statut')}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <CustomSelect
                                value={statusStagedId}
                                options={statusOptions}
                                onChange={setStatusStagedId}
                                className="min-w-48"
                            />
                            <button
                                onClick={handleApplyStatusChange}
                                disabled={!hasStatusChange || changeStatusAsAdvisorMutation.isPending}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {changeStatusAsAdvisorMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRightCircle className="h-3 w-3" />}
                                {t('dashboard.candidatures.detail.apply_button', 'Appliquer')}
                            </button>
                        </div>
                        {stagedIsContractStatus && (
                            <div className="space-y-1 min-w-0 max-w-xs">
                                <label className="block text-[11px] font-medium text-slate-400">
                                    {t('dashboard.candidatures.detail.start_date', 'Début')}
                                </label>
                                <DateInput value={startDate} onChange={setStartDate} dense />
                            </div>
                        )}
                        {statusChangeAttempted && stagedNeedsStartDate && (
                            <p className="text-xs text-rose-500">
                                {t('dashboard.candidatures.detail.start_date_required', 'Une date de début est requise pour ce statut')}
                            </p>
                        )}
                    </div>
                )}

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1 min-w-0">
                            <label className="block text-[11px] font-medium text-slate-400">
                                {t('dashboard.candidatures.detail.start_date', 'Début')}
                            </label>
                            <DateInput value={startDate} onChange={setStartDate} dense />
                        </div>
                        <div className="space-y-1 min-w-0">
                            <label className="block text-[11px] font-medium text-slate-400">
                                {t('dashboard.candidatures.detail.end_date', 'Fin')}
                            </label>
                            <DateInput value={endDate} onChange={setEndDate} dense />
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

                {conflictingActiveContract && (
                    <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-700 dark:text-rose-400">
                            <p className="font-semibold">
                                {t('dashboard.candidatures.detail.contract_conflict_title', 'Un contrat est déjà actif pour cet étudiant')}
                            </p>
                            <p className="mt-0.5">
                                {t('dashboard.candidatures.detail.contract_conflict_message', {
                                    poste: conflictingActiveContract.poste,
                                    entreprise: conflictingActiveContract.entreprise,
                                    defaultValue: '{{poste}} chez {{entreprise}}. Invalidez-le ou marquez-le comme terminé avant de valider celui-ci.',
                                })}
                            </p>
                        </div>
                    </div>
                )}

                {app.status.compteCommeContrat && (
                    <div className={`rounded-xl border p-3 space-y-2.5 ${
                        app.contractVerified
                            ? isActiveContract(app)
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                    }`}>
                        <div className="flex items-start gap-1.5">
                            {app.contractVerified ? (
                                <ShieldCheck className={`h-4 w-4 shrink-0 mt-0.5 ${isActiveContract(app) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                            ) : (
                                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                                <p className={`text-xs font-semibold ${
                                    app.contractVerified
                                        ? isActiveContract(app) ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                                        : 'text-amber-700 dark:text-amber-400'
                                }`}>
                                    {app.contractVerified
                                        ? isActiveContract(app)
                                            ? t('dashboard.candidatures.detail.contract_validated_label', 'Contrat validé par un conseiller')
                                            : t('dashboard.candidatures.detail.contract_ended_label', 'Contrat validé — terminé')
                                        : t('dashboard.candidatures.detail.contract_unvalidated_label', 'À vérifier — statut déclaré par l\'étudiant, pas encore confirmé')}
                                </p>
                                {!app.contractVerified && (
                                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                                        {t('dashboard.candidatures.detail.contract_unvalidated_hint', "L'étudiant a lui-même indiqué avoir reçu cette offre. Vérifiez l'information (contrat, e-mail de l'entreprise...) avant de valider, ou invalidez si l'offre n'a pas été reçue.")}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {!app.contractVerified && (
                                <button
                                    onClick={handleValidate}
                                    disabled={validateMutation.isPending || !!conflictingActiveContract}
                                    title={conflictingActiveContract ? t('dashboard.candidatures.detail.contract_conflict_title', 'Un contrat est déjà actif pour cet étudiant') : undefined}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {validateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                    {t('dashboard.candidatures.detail.validate_button', 'Valider')}
                                </button>
                            )}
                            {app.contractVerified && isActiveContract(app) && (
                                <button
                                    onClick={handleMarkAsEnded}
                                    disabled={updateContractDatesMutation.isPending || !endDate}
                                    title={!endDate ? t('dashboard.candidatures.detail.end_date_required', 'Indiquez la date de fin du contrat ci-dessus') : undefined}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {updateContractDatesMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Handshake className="h-3 w-3" />}
                                    {t('dashboard.candidatures.detail.end_contract_button', 'Marquer comme terminé')}
                                </button>
                            )}
                            <button
                                onClick={() => setInvalidateConfirmOpen(true)}
                                disabled={invalidateMutation.isPending}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <XCircle className="h-3 w-3" />
                                {t('dashboard.candidatures.detail.invalidate_button', 'Invalider')}
                            </button>
                            {app.contractVerified && isActiveContract(app) && !endDate && (
                                <p className="text-xs text-slate-400 basis-full">
                                    {t('dashboard.candidatures.detail.end_date_required', 'Indiquez la date de fin du contrat ci-dessus')}
                                </p>
                            )}
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
                {app.lastStatusModifiedByName && (
                    <p className="text-xs text-slate-400 text-right -mt-2">
                        {t('dashboard.candidatures.detail.last_modified_by', { name: app.lastStatusModifiedByName, defaultValue: 'Dernière modification par {{name}}' })}
                    </p>
                )}
            </div>

            <ConfirmDialog
                isOpen={invalidateConfirmOpen}
                title={t('dashboard.candidatures.detail.invalidate_confirm_title', "Invalider ce contrat")}
                message={t('dashboard.candidatures.detail.invalidate_confirm_message', { poste: app.poste, entreprise: app.entreprise, defaultValue: 'Revenir au statut précédent pour "{{poste}}" chez {{entreprise}} ? L\'XP associé sera repris.' })}
                confirmLabel={t('dashboard.candidatures.detail.invalidate_button', "Invalider")}
                loading={invalidateMutation.isPending}
                onConfirm={handleInvalidate}
                onClose={() => setInvalidateConfirmOpen(false)}
            />

            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                title={t('dashboard.candidatures.detail.delete_confirm_title', 'Supprimer cette candidature')}
                message={t('dashboard.candidatures.detail.delete_confirm_message', { poste: app.poste, entreprise: app.entreprise, defaultValue: 'Supprimer "{{poste}}" chez {{entreprise}} ? Cette action est définitive.' })}
                confirmLabel={t('dashboard.candidatures.detail.delete_button', 'Supprimer')}
                loading={deleteAsAdvisorMutation.isPending}
                onConfirm={handleDelete}
                onClose={() => setDeleteConfirmOpen(false)}
            />

            {editOpen && (
                <CandidatureFormModal
                    candidature={app}
                    saving={updateAsAdvisorMutation.isPending}
                    onClose={() => setEditOpen(false)}
                    onSave={handleEditSave}
                />
            )}
        </div>
    );
}
