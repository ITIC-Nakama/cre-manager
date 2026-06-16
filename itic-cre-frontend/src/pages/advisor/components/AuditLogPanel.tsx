import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuditLogs } from '../../../hooks/useAudit';

const ACTION_COLORS: Record<string, string> = {
    LOGIN: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
    LOGOUT: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
    STUDENT_REGISTERED: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    STAFF_USER_CREATED: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    USER_UPDATED: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30',
    USER_DELETED: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
    PASSWORD_CHANGED: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
    PASSWORD_RESET: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
    EMAIL_VERIFIED: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30',
    CV_UPLOADED: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30',
    CV_VALIDATED: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    CV_REJECTED: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
    CV_DELETED: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
    CV_STATUS_UPDATED: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30',
    CV_COMMENTED: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30',
};

function actionColor(action: string) {
    return ACTION_COLORS[action] ?? 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function AuditLogPanel() {
    const { data, isLoading } = useAuditLogs();
    const logs = data?.content ?? [];

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-500" />
                    Audit Logs & Activités Système
                </h2>
                {data && (
                    <span className="text-xs text-slate-400">{data.totalElements} entrée{data.totalElements > 1 ? 's' : ''}</span>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : logs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Aucun log enregistré.</p>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                        >
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${actionColor(log.action)}`}>
                                {log.action}
                            </span>
                            <span className="flex-1 text-slate-600 dark:text-slate-400 truncate px-2">
                                {log.description ?? (`${log.targetType ?? ''} ${log.targetId ?? ''}`.trim() || '—')}
                            </span>
                            <span className="text-slate-400 flex-shrink-0">{log.actorEmail ?? '—'}</span>
                            <span className="text-slate-400 font-mono flex-shrink-0">{formatDate(log.createdAt)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
