import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { FileText, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudentRow } from '../../../../types/models/Dashboard';
import TruncatedText from '../../../../components/shared/TruncatedText';
import { isAnonymizedStudent } from '../../../../utils/studentUtils';

const col = createColumnHelper<StudentRow>();

interface UseStudentColumnsOptions {
    isAdmin: boolean;
}

export function useStudentColumns({ isAdmin }: UseStudentColumnsOptions) {
    const { t } = useTranslation();

    return useMemo(() => [
        ...(isAdmin ? [col.display({
            id: 'select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    ref={(el) => {
                        if (el) el.indeterminate = !table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected();
                    }}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
            ),
            cell: ({ row }) => {
                const isAnon = isAnonymizedStudent(row.original);
                return (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        disabled={isAnon}
                        onChange={row.getToggleSelectedHandler()}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                );
            },
        })] : []),
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
                                    {t('dashboard.etudiants.table.gdpr_badge', 'Supprimé (RGPD)')}
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
            cell: ({ row, getValue }) => {
                const value = getValue();
                const studyYear = row.original.studyYear;
                return value ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <TruncatedText text={value} className="max-w-[200px] text-slate-500 dark:text-slate-400 text-sm" />
                        {studyYear && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                                {t(`study_years.year_${studyYear}`, `${studyYear}e année`)}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                );
            },
            enableSorting: true,
        }),
        col.accessor((row) => row.advisor ? `${row.advisor.firstName} ${row.advisor.lastName}` : '', {
            id: 'advisor',
            header: t('dashboard.etudiants.table.advisor', 'Conseiller'),
            cell: ({ row }) => {
                const student = row.original;
                return student.advisor
                    ? <span className="text-sm text-slate-600 dark:text-slate-300">{student.advisor.firstName} {student.advisor.lastName}</span>
                    : <span className="text-slate-300 dark:text-slate-600">—</span>;
            },
            enableSorting: false,
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
    ], [t, isAdmin]);
}