import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import {
    useExternalJobboardStats,
    useTriggerExternalJobboardSync,
    useToggleExternalJobboardSource,
    useUpdateExternalSourceCriteria,
    useRomeCodesReference,
    useAdzunaCategoriesReference,
} from '../../../hooks/useJobOffers';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import ExternalSourceDetail, { type CriteriaForm } from './components/ExternalSourceDetail';
import type { ExternalSourceStat } from '../../../types/models/JobOffer';

const SYNC_STATUS_STYLES: Record<string, string> = {
    SUCCESS: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
    PARTIAL: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    FAILED: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
};

function toForm(source: ExternalSourceStat): CriteriaForm {
    return {
        romeCodes: source.romeCodes ?? '',
        departments: source.departments ?? '',
        keywords: source.keywords ?? '',
        category: source.category ?? '',
        excludedEmployers: source.excludedEmployers ?? '',
    };
}

export default function ExternalSyncPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { data: stats, isLoading } = useExternalJobboardStats();
    const syncMutation = useTriggerExternalJobboardSync();
    const toggleMutation = useToggleExternalJobboardSource();
    const criteriaMutation = useUpdateExternalSourceCriteria();
    const { data: romeCodesRef = [], isLoading: romeCodesRefLoading } = useRomeCodesReference();
    const { data: adzunaCategoriesRef = [], isLoading: adzunaCategoriesRefLoading } = useAdzunaCategoriesReference();

    const [forms, setForms] = useState<Record<string, CriteriaForm>>({});
    const [disableTarget, setDisableTarget] = useState<ExternalSourceStat | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>(null);

    // Ré-initialise les formulaires locaux quand les stats arrivent/changent côté serveur,
    // sans écraser une saisie en cours pour une source déjà éditée (préservé même en changeant
    // d'onglet, puisque l'état vit ici et pas dans ExternalSourceDetail).
    useEffect(() => {
        if (!stats?.sources) return;
        setForms((prev) => {
            const next = { ...prev };
            for (const source of stats.sources) {
                if (!(source.source in next)) {
                    next[source.source] = toForm(source);
                }
            }
            return next;
        });
        setActiveTab((prev) => prev ?? stats.sources[0]?.source ?? null);
    }, [stats?.sources]);

    const syncing = syncMutation.isPending || !!stats?.syncInProgress;

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString(i18n.language, {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    const handleSync = async () => {
        try {
            await syncMutation.mutateAsync();
            toast.success(t('dashboard.admin.jobboard_external.toast_sync_started'));
        } catch {
            toast.error(t('dashboard.admin.jobboard_external.toast_sync_error'));
        }
    };

    const handleToggle = async (source: ExternalSourceStat) => {
        // Désactiver une source supprime toutes ses offres déjà en base — confirmation
        // obligatoire, contrairement à la réactivation qui est sans effet destructeur.
        if (source.enabled) {
            setDisableTarget(source);
            return;
        }
        try {
            await toggleMutation.mutateAsync(source.source);
        } catch {
            toast.error(t('dashboard.admin.jobboard_external.toast_toggle_error'));
        }
    };

    const handleConfirmDisable = async () => {
        if (!disableTarget) return;
        try {
            await toggleMutation.mutateAsync(disableTarget.source);
            setDisableTarget(null);
        } catch {
            toast.error(t('dashboard.admin.jobboard_external.toast_toggle_error'));
        }
    };

    const handleFieldChange = (sourceKey: string, field: keyof CriteriaForm, value: string) => {
        setForms((prev) => ({ ...prev, [sourceKey]: { ...prev[sourceKey], [field]: value } }));
    };

    const handleSaveCriteria = async (source: ExternalSourceStat) => {
        const form = forms[source.source] ?? toForm(source);
        try {
            await criteriaMutation.mutateAsync({ source: source.source, criteria: form });
            toast.success(t('dashboard.admin.jobboard_external.toast_criteria_saved'));
        } catch {
            toast.error(t('dashboard.admin.jobboard_external.toast_criteria_error'));
        }
    };

    const isDirty = (source: ExternalSourceStat) => {
        const form = forms[source.source];
        if (!form) return false;
        const original = toForm(source);
        return form.romeCodes !== original.romeCodes
            || form.departments !== original.departments
            || form.keywords !== original.keywords
            || form.category !== original.category
            || form.excludedEmployers !== original.excludedEmployers;
    };

    const activeSource = stats?.sources.find((s) => s.source === activeTab) ?? null;

    return (
        <div className="flex flex-col gap-5 animate-fadeIn">
            <div>
                <button
                    onClick={() => navigate('/supervisor/offres')}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer mb-2"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('dashboard.admin.jobboard_external.back_button', 'Retour aux offres')}
                </button>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Globe className="h-7 w-7 text-[#E2762F] shrink-0" />
                            {renderTitleWithGradient(t('dashboard.admin.jobboard_external.title'), 'itic-gradient-orange')}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('dashboard.admin.jobboard_external.subtitle', "Aucun critère = aucune restriction, toutes filières confondues.")}
                        </p>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed bg-[#E2762F] hover:bg-[#c9631f] text-white disabled:opacity-60"
                    >
                        {syncing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        {syncing
                            ? t('dashboard.admin.jobboard_external.syncing')
                            : t('dashboard.admin.jobboard_external.sync_now')}
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Last sync */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 -mt-2">
                        {stats?.lastSync ? (
                            <>
                                <span>
                                    {t('dashboard.admin.jobboard_external.last_sync', {
                                        date: stats.lastSync.finishedAt
                                            ? formatDate(stats.lastSync.finishedAt)
                                            : formatDate(stats.lastSync.startedAt),
                                    })}
                                </span>
                                <span
                                    className={`inline-flex px-2 py-0.5 rounded-full font-semibold ${
                                        SYNC_STATUS_STYLES[stats.lastSync.status] ??
                                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    {t(`dashboard.admin.jobboard_external.status.${stats.lastSync.status}`)}
                                </span>
                                <span className="inline-flex px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                                    {t('dashboard.admin.jobboard_external.inserted', { count: stats.lastSync.insertedCount })}
                                </span>
                                <span className="inline-flex px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    {t('dashboard.admin.jobboard_external.skipped', { count: stats.lastSync.skippedCount })}
                                </span>
                                <span className="inline-flex px-2 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                                    {t('dashboard.admin.jobboard_external.expired', { count: stats.lastSync.expiredCount })}
                                </span>
                                <span className="inline-flex px-2 py-0.5 rounded-full font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                                    {t('dashboard.admin.jobboard_external.deleted', { count: stats.lastSync.deletedCount })}
                                </span>
                            </>
                        ) : (
                            <span>{t('dashboard.admin.jobboard_external.never_synced')}</span>
                        )}
                    </div>

                    {/* Onglets — une source à la fois, pleine largeur */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 flex-wrap">
                        {(stats?.sources ?? []).map((source) => (
                            <button
                                key={source.source}
                                onClick={() => setActiveTab(source.source)}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
                                    activeTab === source.source
                                        ? 'border-[#E2762F] text-[#E2762F]'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${source.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                />
                                {source.label}
                                <span className="text-[11px] font-normal text-slate-400">
                                    ({source.activeOffers})
                                </span>
                            </button>
                        ))}
                    </div>

                    {activeSource && (
                        <ExternalSourceDetail
                            source={activeSource}
                            form={forms[activeSource.source] ?? toForm(activeSource)}
                            onFieldChange={(field, value) => handleFieldChange(activeSource.source, field, value)}
                            dirty={isDirty(activeSource)}
                            saving={criteriaMutation.isPending}
                            onSave={() => handleSaveCriteria(activeSource)}
                            onToggle={() => handleToggle(activeSource)}
                            toggling={toggleMutation.isPending}
                            romeCodesRef={romeCodesRef}
                            romeCodesRefLoading={romeCodesRefLoading}
                            adzunaCategoriesRef={adzunaCategoriesRef}
                            adzunaCategoriesRefLoading={adzunaCategoriesRefLoading}
                        />
                    )}
                </>
            )}

            <ConfirmDialog
                isOpen={!!disableTarget}
                title={t('dashboard.admin.jobboard_external.confirm_disable_title', 'Désactiver cette source ?')}
                message={t('dashboard.admin.jobboard_external.confirm_disable_message', {
                    label: disableTarget?.label ?? '',
                    count: disableTarget?.activeOffers ?? 0,
                    defaultValue: 'Toutes les offres actuellement importées depuis {{label}} ({{count}}) seront définitivement supprimées. La réactivation ne les restaure pas — une nouvelle synchronisation les récupérera à nouveau.',
                })}
                confirmLabel={t('dashboard.admin.jobboard_external.confirm_disable_button', 'Désactiver et supprimer')}
                loading={toggleMutation.isPending}
                onConfirm={handleConfirmDisable}
                onClose={() => setDisableTarget(null)}
            />
        </div>
    );
}
