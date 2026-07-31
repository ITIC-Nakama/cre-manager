import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AlertCircle, FileText, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudentRow } from '../../../../types/models/Dashboard';
import TruncatedText from '../../../../components/shared/TruncatedText';
import { isAnonymizedStudent } from '../../../../utils/studentUtils';

const col = createColumnHelper<StudentRow>();

export function useStudentColumns() {
    const { t } = useTranslation();

    return useMemo(() => [
        col.accessor((row) => `${row.firstName} ${row.lastName}`, {
            id: 'name',
            header: t('dashboard.etudiants.table.student'),
            cell: ({ row }) => {
                const isAnon = isAnonymizedStudent(row.original);
                return (
                    <div className="max-w-[220px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <TruncatedText
                                text={`${row.original.firstName} ${row.original.lastName}`}
                                className={isAnon ? "font-semibold text-slate-500 dark:text-slate-400" : "font-semibold text-slate-900 dark:text-white"}
                            />
                            {isAnon && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    <ShieldAlert className="h-3 w-3" />
                                    Supprimé (RGPD)
                                </span>
                            )}
                        </div>
                        <TruncatedText text={row.original.email} className="text-xs text-slate-400 font-mono" />
                    </div>
                );
            },
            enableSorting: false,
        }),
        col.accessor((row) => row.promotion?.nom ?? '', {
            id: 'promotion',
            header: t('dashboard.etudiants.table.promotion'),
            cell: ({ getValue }) => {
                const value = getValue();
                return value ? (
                    <TruncatedText text={value} className="max-w-[240px] text-slate-500 dark:text-slate-400 text-sm" />
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                );
            },
            enableSorting: false,
        }),
        col.accessor('applicationCount', {
            header: t('dashboard.etudiants.table.applications'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{row.original.applicationCount}</span>
                    {row.original.staleApplicationCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            {t('dashboard.etudiants.table.stale', { count: row.original.staleApplicationCount })}
                        </span>
                    )}
                </div>
            ),
        }),
        col.accessor('xpTotal', {
            header: t('dashboard.etudiants.table.grade_xp').split(' / ')[0],
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {row.original.grade?.nom ?? '—'}
                    </span>
                </div>
            ),
        }),
        col.accessor('hasCv', {
            header: t('dashboard.etudiants.table.cv'),
            cell: ({ getValue }) => (
                <div className="flex items-center">
                    {getValue() ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                            {t('dashboard.etudiants.table.cv_deposited')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
                            <FileText className="h-3 w-3 shrink-0" />
                            {t('dashboard.etudiants.table.cv_none')}
                        </span>
                    )}
                </div>
            ),
            enableSorting: false,
        }),
        col.accessor('isActive', {
            header: t('dashboard.etudiants.table.status'),
            cell: ({ getValue, row }) => (
                <div className="flex items-center">
                    {row.original.accountActive ? (
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${getValue()
                                ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                                : 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40'
                            }`}>
                            {getValue() ? t('dashboard.etudiants.table.active') : t('dashboard.etudiants.table.inactive')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            {t('dashboard.etudiants.table.account_disabled')}
                        </span>
                    )}
                </div>
            ),
            enableSorting: false,
        }),
        col.accessor('lastActivity', {
            header: t('dashboard.etudiants.table.last_activity'),
            cell: ({ getValue }) => {
                const val = getValue();
                if (!val) return <span className="text-xs text-slate-400">—</span>;
                const date = new Date(val);
                return (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                );
            },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [t]);
}