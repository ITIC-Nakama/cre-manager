import { X, Star, FileText, AlertCircle, Calendar, GraduationCap, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudentRow } from '../../types/models/Dashboard';

interface Props {
    student: StudentRow;
    onClose: () => void;
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function StudentDetailModal({ student, onClose }: Props) {
    const { t } = useTranslation();

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-fadeIn max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                            <p className="text-base font-bold text-slate-900 dark:text-white">
                                {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Status badges row */}
                    <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            student.isActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                        }`}>
                            {student.isActive ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                            {student.isActive ? t('dashboard.etudiants.table.active') : t('dashboard.etudiants.table.inactive')}
                        </span>

                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            student.hasCv
                                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30'
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                        }`}>
                            <FileText className="h-3.5 w-3.5" />
                            {student.hasCv ? t('dashboard.etudiants.table.cv_deposited') : t('dashboard.etudiants.table.cv_none')}
                        </span>
                    </div>

                    {/* Basic Info Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3">
                            <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                                <GraduationCap className="h-3.5 w-3.5" />
                                {t('dashboard.etudiants.table.promotion')}
                            </p>
                            <p className="text-sm font-medium text-slate-850 dark:text-slate-200">
                                {student.promotion?.nom || '—'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3">
                            <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 text-violet-400" />
                                {t('dashboard.etudiants.table.grade_xp').split(' / ')[0]}
                            </p>
                            <p className="text-sm font-medium text-slate-850 dark:text-slate-200 flex items-center gap-1">
                                <span>{student.grade?.nom || '—'}</span>
                                <span className="text-xs text-slate-400 font-normal">({student.xpTotal} XP)</span>
                            </p>
                        </div>
                    </div>

                    {/* Applications stats card */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {t('dashboard.etudiants.table.applications')}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold text-slate-805 dark:text-white">
                                    {student.applicationCount}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {t('dashboard.etudiants.detail.total_applications')}
                                </p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {student.staleApplicationCount}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                    {student.staleApplicationCount > 0 && <AlertCircle className="h-3 w-3 text-amber-500" />}
                                    {t('dashboard.etudiants.detail.stale_applications')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Activity tracking */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{t('dashboard.etudiants.detail.last_activity', { date: formatDateTime(student.lastActivity) })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
