import { Globe, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    useExternalJobboardStats,
    useTriggerExternalJobboardSync,
    useToggleExternalJobboardSource,
} from '../../../../hooks/useJobOffers';
import type { ExternalSourceStat } from '../../../../types/models/JobOffer';

const SYNC_STATUS_STYLES: Record<string, string> = {
    SUCCESS: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
    PARTIAL: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    FAILED: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
};

export default function JobboardExternalPanel() {
    const { t, i18n } = useTranslation();
    const { data: stats, isLoading } = useExternalJobboardStats();
    const syncMutation = useTriggerExternalJobboardSync();
    const toggleMutation = useToggleExternalJobboardSource();

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
        try {
            await toggleMutation.mutateAsync(source.source);
        } catch {
            toast.error(t('dashboard.admin.jobboard_external.toast_toggle_error'));
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-500" />
                    {t('dashboard.admin.jobboard_external.title')}
                </h2>
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
                            </>
                        ) : (
                            <span>{t('dashboard.admin.jobboard_external.never_synced')}</span>
                        )}
                    </div>

                    {/* Sources */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(stats?.sources ?? []).map((source) => (
                            <div
                                key={source.source}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                            >
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
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
