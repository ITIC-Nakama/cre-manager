import { AlertCircle, Eye, Handshake, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import StatusBadge from '../../../../components/shared/StatusBadge';
import { useValidateContract } from '../../../../hooks/useApplications';
import { getApiErrorMessage } from '../../../../utils/errorHelper';
import { formatDate, isActiveContract, isPendingValidation } from '../types';
import type { ApplicationRow } from '../../../../types/models/Application';

interface Props {
    app: ApplicationRow;
    onClick: () => void;
}

export default function ApplicationCard({ app, onClick }: Props) {
    const { t } = useTranslation();
    const validateMutation = useValidateContract();
    const needsVerification = isPendingValidation(app);
    const isCurrentContract = isActiveContract(app);
    const isEndedContract = app.status.compteCommeContrat && app.contractVerified && !isCurrentContract;

    // Action rapide directement depuis la liste, pour eviter le detour Candidatures -> etudiant ->
    // candidature juste pour un oui/non rapide — la vue detaillee (dates, contexte) reste disponible
    // via un clic normal sur la carte pour les cas ou le conseiller veut verifier avant de confirmer.
    const handleQuickValidate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await validateMutation.mutateAsync(app.id);
            toast.success(t('dashboard.candidatures.detail.contract_validated', 'Déclaration validée'));
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t('dashboard.candidatures.detail.contract_dates_error', "Impossible d'enregistrer — veuillez réessayer")));
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
            className={`relative overflow-hidden w-full text-left p-4 rounded-xl border transition-all hover:shadow-md group cursor-pointer ${
                isCurrentContract
                    ? 'bg-white dark:bg-slate-900 border-indigo-200/60 dark:border-indigo-900/50 hover:shadow-indigo-500/10 dark:hover:shadow-indigo-950/40'
                    : needsVerification
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 hover:border-amber-400'
                    : app.stale
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 hover:border-amber-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
        >
            {isCurrentContract && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E2762F] via-indigo-500 to-violet-500" />
            )}

            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{app.poste}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{app.entreprise}</p>
                </div>
                <Eye className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge nom={app.status.nom} couleur={app.status.couleur} />
                {needsVerification && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                        <ShieldAlert className="h-3 w-3" />
                        {t('dashboard.candidatures.detail.contract_needs_verification_badge', 'À vérifier')}
                    </span>
                )}
                {isCurrentContract && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                        <Handshake className="h-3 w-3" />
                        {t('dashboard.candidatures.detail.current_contract_badge', 'Contrat actuel')}
                    </span>
                )}
                {isEndedContract && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <ShieldCheck className="h-3 w-3" />
                        {t('dashboard.candidatures.detail.contract_ended_badge', 'Contrat terminé')}
                    </span>
                )}
                {app.stale && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {t('dashboard.candidatures.detail.stale', 'En retard')}
                    </span>
                )}
                {app.typeContrat && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">{app.typeContrat.label}</span>
                )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t('dashboard.candidatures.detail.updated_at', { date: formatDate(app.dateModification), defaultValue: 'Mis à jour le {{date}}' })}
                </p>
                {needsVerification && (
                    <button
                        type="button"
                        onClick={handleQuickValidate}
                        disabled={validateMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                        {validateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                        {t('dashboard.candidatures.detail.validate_button', 'Valider')}
                    </button>
                )}
            </div>
        </div>
    );
}
