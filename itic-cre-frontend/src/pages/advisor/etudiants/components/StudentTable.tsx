import type { Table } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import {
    Loader2, FileText, Eye,
    ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudentRow } from '../../../../types/models/Dashboard';
import { isAnonymizedStudent } from '../../../../utils/studentUtils';
import InfiniteScrollSentinel from '../../../../components/shared/InfiniteScrollSentinel';
import DataTableFrame from '../../../../components/table/DataTableFrame';
import ColumnsMenu from '../../../../components/table/ColumnsMenu';
import { columnCellProps, isStickyColumn } from '../../../../components/table/columnMeta';


function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5" />;
    if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
}

interface StudentTableProps {
    table: Table<StudentRow>;
    isLoading: boolean;
    students: StudentRow[];
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    studentCvLoading: boolean;
    viewingCvStudentId: string | null;
    setViewingCvStudentId: (id: string | null) => void;
    setViewingStudent: (student: StudentRow) => void;
}

export default function StudentTable({
    table,
    isLoading,
    students,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    studentCvLoading,
    viewingCvStudentId,
    setViewingCvStudentId,
    setViewingStudent,
}: StudentTableProps) {
    const { t } = useTranslation();
    const columnCount = table.getVisibleLeafColumns().length;

    return (
        <DataTableFrame
            label={t('dashboard.etudiants.table.region_label', 'Tableau des étudiants')}
            toolbar={<ColumnsMenu table={table} className="min-w-48" />}
            footer={!isLoading && students.length > 0 && (
                <InfiniteScrollSentinel
                    hasMore={hasNextPage}
                    isLoadingMore={isFetchingNextPage}
                    onLoadMore={onLoadMore}
                />
            )}
        >
            <table className="dt-table w-full text-left border-collapse text-sm">
                <thead>
                    {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id} className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {hg.headers.map((header) => {
                                const cell = columnCellProps(header.column);
                                return (
                                    <th key={header.id} className={`px-3 sm:px-4 py-3.5 whitespace-nowrap ${cell.className}`} style={cell.style}>
                                        {header.column.getCanSort() ? (
                                            <button
                                                onClick={header.column.getToggleSortingHandler()}
                                                className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <SortIcon sorted={header.column.getIsSorted()} />
                                            </button>
                                        ) : (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        )}
                                    </th>
                                );
                            })}
                            <th className="px-3 sm:px-4 py-3.5 text-right whitespace-nowrap">{t('dashboard.etudiants.table.actions')}</th>
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
                                    className={isAnon
                                        ? 'dt-row-muted bg-amber-50/30 dark:bg-amber-950/10 transition-colors'
                                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors'}
                                >
                                    {row.getVisibleCells().map((cell) => {
                                        const props = columnCellProps(cell.column);
                                        const content = flexRender(cell.column.columnDef.cell, cell.getContext());
                                        // Ligne atténuée (compte supprimé RGPD) : l'opacité porte sur le contenu, jamais sur le
                                        // fond d'une cellule figée (sinon les colonnes qui défilent dessous apparaîtraient).
                                        const sticky = isStickyColumn(cell.column);
                                        return (
                                            <td
                                                key={cell.id}
                                                className={`px-3 sm:px-4 py-3.5 ${props.className} ${isAnon && !sticky ? 'opacity-75' : ''}`}
                                                style={props.style}
                                            >
                                                {isAnon && sticky ? <div className="opacity-75">{content}</div> : content}
                                            </td>
                                        );
                                    })}
                                    <td className={`px-3 sm:px-4 py-3.5 text-right whitespace-nowrap ${isAnon ? 'opacity-75' : ''}`}>
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
        </DataTableFrame>
    );
}
