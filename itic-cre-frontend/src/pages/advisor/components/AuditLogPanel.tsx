import { ShieldCheck, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuditLogs } from '../../../hooks/useAudit';
import { auditActionColor } from '../../../utils/auditActionColors';

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function AuditLogPanel() {
    const { t } = useTranslation();
    const { data, isLoading } = useAuditLogs({ page: 0, size: 5 });
    const logs = data?.content ?? [];

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-500" />
                    {t('dashboard.advisor.audit.title')}
                </h2>
                {data && (
                    <span className="text-xs text-slate-400">
                        {t('dashboard.advisor.audit.showing_latest', { count: logs.length, total: data.totalElements })}
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : logs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                    {t('dashboard.advisor.audit.empty')}
                </p>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                        >
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${auditActionColor(log.action)}`}>
                                {log.action}
                            </span>
                            <span className="flex-1 text-slate-600 dark:text-slate-400 truncate px-2">
                                {log.description ?? (`${log.targetType ?? ''} ${log.targetId ?? ''}`.trim() || '—')}
                            </span>
                            <span className="text-slate-400 flex-shrink-0 max-w-[160px] truncate" title={log.actorEmail ?? undefined}>
                                {log.actorFirstName || log.actorLastName
                                    ? `${log.actorFirstName ?? ''} ${log.actorLastName ?? ''}`.trim()
                                    : (log.actorEmail ?? '—')}
                            </span>
                            <span className="text-slate-400 font-mono flex-shrink-0">{formatDate(log.createdAt)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
