import type { Table } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import {
    Loader2, FileText, Eye, ChevronLeft, ChevronRight,
    ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudentRow } from '../../../../types/models/Dashboard';
import { isAnonymizedStudent } from '../../../../utils/studentUtils';


function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5" />;
    if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
}

interface StudentTableProps {
    table: Table<StudentRow>;
    isLoading: boolean;
    students: StudentRow[];
    totalElements: number;
    totalPages: number;
    page: number;
    setPage: (updater: number | ((p: number) => number)) => void;
    studentCvLoading: boolean;
    viewingCvStudentId: string | null;
    setViewingCvStudentId: (id: string | null) => void;
    setViewingStudent: (student: StudentRow) => void;
}

export default function StudentTable({
    table,
    isLoading,
    students,
    totalElements,
    totalPages,
    page,
    setPage,
    studentCvLoading,
    viewingCvStudentId,
    setViewingCvStudentId,
    setViewingStudent,
}: StudentTableProps) {
    const { t } = useTranslation();
    const columnCount = table.getAllColumns().length;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id} className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {hg.headers.map((header) => (
                                    <th key={header.id} className="px-4 py-3.5">
                                        {header.column.getCanSort() ? (
                                            <button
                                                onClick={header.column.getToggleSortingHandler()}
                                                className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <SortIcon sorted={header.column.getIsSorted()} />
                                            </button>
                                        ) : (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        )}
                                    </th>
                                ))}
                                <th className="px-4 py-3.5 text-right">{t('dashboard.etudiants.table.actions')}</th>
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={columnCount + 1} className="text-center py-16">
                                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : students.length === 0 ? (
                            <tr>
                                <td colSpan={columnCount + 1} className="text-center py-16 text-slate-400">
                                    {t('dashboard.etudiants.table.empty')}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => {
                                const isAnon = isAnonymizedStudent(row.original);
                                return (
                                    <tr
                                        key={row.id}
                                        className={isAnon ? "bg-amber-50/30 dark:bg-amber-950/10 opacity-75 transition-colors" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-4 py-3.5">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center justify-end gap-1">
                                                {!isAnon && row.original.hasCv && (
                                                    <button
                                                        onClick={() => setViewingCvStudentId(row.original.id)}
                                                        disabled={studentCvLoading && viewingCvStudentId === row.original.id}
                                                        className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer disabled:opacity-50"
                                                        title={t('dashboard.etudiants.actions.view_cv', 'Voir CV')}
                                                    >
                                                        {studentCvLoading && viewingCvStudentId === row.original.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <FileText className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setViewingStudent(row.original)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                    title={t('dashboard.etudiants.actions.view')}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                        {t('dashboard.etudiants.pagination.info', { current: page + 1, total: totalPages, count: totalElements })}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${pageNum === page
                                            ? 'bg-indigo-600 text-white'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    {pageNum + 1}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}