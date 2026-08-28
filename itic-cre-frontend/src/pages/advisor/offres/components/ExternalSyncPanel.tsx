import { useEffect, useState } from 'react';
import { Globe, Loader2, RefreshCw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    useExternalJobboardStats,
    useTriggerExternalJobboardSync,
    useToggleExternalJobboardSource,
    useUpdateExternalSourceCriteria,
} from '../../../../hooks/useJobOffers';
import ConfirmDialog from '../../../../components/shared/ConfirmDialog';
import type { ExternalSourceStat } from '../../../../types/models/JobOffer';

const SYNC_STATUS_STYLES: Record<string, string> = {
    SUCCESS: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
    PARTIAL: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    FAILED: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
};

/** ADZUNA n'a pas de taxonomie ROME (contrairement à FRANCE_TRAVAIL/BONNE_ALTERNANCE) — critères différents. */
const ROME_BASED_SOURCES = new Set(['FRANCE_TRAVAIL', 'BONNE_ALTERNANCE']);

interface CriteriaForm {
    romeCodes: string;
    departments: string;
    keywords: string;
    category: string;
    excludedEmployers: string;
}

function toForm(source: ExternalSourceStat): CriteriaForm {
    return {
        romeCodes: source.romeCodes ?? '',
        departments: source.departments ?? '',
        keywords: source.keywords ?? '',
        category: source.category ?? '',
        excludedEmployers: source.excludedEmployers ?? '',
    };
}

export default function ExternalSyncPanel() {
    const { t, i18n } = useTranslation();
    const { data: stats, isLoading } = useExternalJobboardStats();
    const syncMutation = useTriggerExternalJobboardSync();
    const toggleMutation = useToggleExternalJobboardSource();
    const criteriaMutation = useUpdateExternalSourceCriteria();

    const [forms, setForms] = useState<Record<string, CriteriaForm>>({});
    const [disableTarget, setDisableTarget] = useState<ExternalSourceStat | null>(null);

    // Ré-initialise les formulaires locaux quand les stats arrivent/changent côté serveur,
    // sans écraser une saisie en cours pour une source déjà éditée.
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

    const handleFieldChange = (source: string, field: keyof CriteriaForm, value: string) => {
        setForms((prev) => ({ ...prev, [source]: { ...prev[source], [field]: value } }));
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

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Globe className="h-5 w-5 text-indigo-500" />
                        {t('dashboard.admin.jobboard_external.title')}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {t('dashboard.admin.jobboard_external.subtitle', "Aucun critère = aucune restriction, toutes filières confondues.")}
                    </p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
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

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Last sync */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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

                    {/* Sources */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {(stats?.sources ?? []).map((source) => {
                            const form = forms[source.source] ?? toForm(source);
                            const romeBased = ROME_BASED_SOURCES.has(source.source);
                            const dirty = isDirty(source);
                            return (
                                <div
                                    key={source.source}
                                    className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {source.label}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {t('dashboard.admin.jobboard_external.active_offers', { count: source.activeOffers })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleToggle(source)}
                                            disabled={toggleMutation.isPending}
                                            role="switch"
                                            aria-checked={source.enabled}
                                            title={t(
                                                source.enabled
                                                    ? 'dashboard.admin.jobboard_external.source_enabled'
                                                    : 'dashboard.admin.jobboard_external.source_disabled'
                                            )}
                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                                                source.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    source.enabled ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Critères — ROME/départements pour France Travail & La Bonne Alternance, mots-clés/catégorie pour Adzuna */}
                                    <div className="flex flex-col gap-2">
                                        {romeBased ? (
                                            <>
                                                <div>
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                                        {t('dashboard.admin.jobboard_external.field_rome_codes', 'Codes ROME')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={form.romeCodes}
                                                        onChange={(e) => handleFieldChange(source.source, 'romeCodes', e.target.value)}
                                                        placeholder={t('dashboard.admin.jobboard_external.field_rome_codes_placeholder', 'Vide = toutes filières')}
                                                        className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                                        {t('dashboard.admin.jobboard_external.field_departments', 'Départements')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={form.departments}
                                                        onChange={(e) => handleFieldChange(source.source, 'departments', e.target.value)}
                                                        placeholder={t('dashboard.admin.jobboard_external.field_departments_placeholder', 'Ex: 75,92,93 — vide = toute la France')}
                                                        className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                                        {t('dashboard.admin.jobboard_external.field_keywords', 'Mots-clés')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={form.keywords}
                                                        onChange={(e) => handleFieldChange(source.source, 'keywords', e.target.value)}
                                                        placeholder={t('dashboard.admin.jobboard_external.field_keywords_placeholder', 'Vide = aucune restriction')}
                                                        className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                                        {t('dashboard.admin.jobboard_external.field_category', 'Catégorie')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={form.category}
                                                        onChange={(e) => handleFieldChange(source.source, 'category', e.target.value)}
                                                        placeholder={t('dashboard.admin.jobboard_external.field_category_placeholder', 'Ex: it-jobs — vide = toutes catégories')}
                                                        className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                                        {t('dashboard.admin.jobboard_external.field_location', 'Localisation')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={form.departments}
                                                        onChange={(e) => handleFieldChange(source.source, 'departments', e.target.value)}
                                                        placeholder={t('dashboard.admin.jobboard_external.field_location_placeholder', 'Ex: Paris, Lyon — vide = toute la France')}
                                                        className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                                {t('dashboard.admin.jobboard_external.field_excluded_employers', 'Employeurs exclus')}
                                            </label>
                                            <input
                                                type="text"
                                                value={form.excludedEmployers}
                                                onChange={(e) => handleFieldChange(source.source, 'excludedEmployers', e.target.value)}
                                                placeholder={t('dashboard.admin.jobboard_external.field_excluded_employers_placeholder', 'Ex: ISCOD,CFA ITIS — vide = aucune exclusion')}
                                                className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleSaveCriteria(source)}
                                            disabled={!dirty || criteriaMutation.isPending}
                                            className="self-end inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-white disabled:opacity-40"
                                        >
                                            {criteriaMutation.isPending ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Save className="h-3.5 w-3.5" />
                                            )}
                                            {t('dashboard.admin.jobboard_external.save_criteria', 'Enregistrer')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
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
