export const AUDIT_ACTION_COLORS: Record<string, string> = {
    LOGIN: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
    LOGOUT: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
    STUDENT_REGISTERED: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    STAFF_USER_CREATED: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    USER_DELETED: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
    USER_DEACTIVATED: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
    USER_REACTIVATED: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    PASSWORD_CHANGED: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
    PASSWORD_RESET: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
    EMAIL_VERIFIED: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30',
    CV_UPLOADED: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30',
    CV_VALIDATED: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    CV_REJECTED: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
    CV_DELETED: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
    CV_STATUS_UPDATED: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30',
    CV_COMMENTED: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30',
    TUTO_CREATED: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    TUTO_UPDATED: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30',
    TUTO_DELETED: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
    OTHER: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
};

export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_COLORS);

export function auditActionColor(action: string) {
    return AUDIT_ACTION_COLORS[action] ?? 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';
}
