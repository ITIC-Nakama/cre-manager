import { useState, useRef, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table';
import {
    Search, SlidersHorizontal, Mail, Eye, Loader2,
    AlertCircle, Star, FileText, ChevronUp, ChevronDown,
    ChevronsUpDown, FileSpreadsheet, ChevronLeft, ChevronRight, GraduationCap,
    UserX, UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useStudentList, useNotifyStudent, useDeactivateStudent, useReactivateStudent } from '../../hooks/useDashboard';
import { usePromotions } from '../../hooks/usePromotions';
import { exportStudentsCsv } from '../../utils/csvExport';
import { fetchAllStudents } from '../../api-s/requests/DashboardRequest';
import NotifyStudentModal from '../../components/shared/NotifyStudentModal';
import StudentDetailModal from '../../components/shared/StudentDetailModal';
import CVDetailModal from '../../components/shared/CVDetailModal';
import TruncatedText from '../../components/shared/TruncatedText';
import CustomSelect from '../../components/basics/CustomSelect';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useUserStore } from '../../store/UserStore';
import { Role } from '../../types/models/Auth';
import type { StudentRow } from '../../types/models/Dashboard';
import { useCVByStudent, useCVStatuts } from '../../hooks/useCV';

type FilterStatus = 'all' | 'active' | 'inactive' | 'stale' | 'no-cv';

const PAGE_SIZE = 20;

const col = createColumnHelper<StudentRow>();

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5" />;
    if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
}

export default function EtudiantsPage() {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [promotionFilter, setPromotionFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
    const [viewingStudent, setViewingStudent] = useState<StudentRow | null>(null);
    const [exporting, setExporting] = useState(false);
    const [viewingCvStudentId, setViewingCvStudentId] = useState<string | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const notifyMutation = useNotifyStudent();
    const deactivateMutation = useDeactivateStudent();
    const reactivateMutation = useReactivateStudent();
    const { data: promotions } = usePromotions();
    const currentUser = useUserStore((state) => state.user);
    const isAdmin = currentUser?.role === Role.ADMIN;

    const { data: studentCv, isLoading: studentCvLoading } = useCVByStudent(viewingCvStudentId);
    const { data: cvStatuts = [] } = useCVStatuts();

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => Promise<void>;
    }>({ isOpen: false, title: '', message: '', onConfirm: async () => {} });
    const [confirmLoading, setConfirmLoading] = useState(false);

    const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    const handleConfirm = async () => {
        setConfirmLoading(true);
        try {
            await confirmDialog.onConfirm();
            closeConfirm();
        } finally {
            setConfirmLoading(false);
        }
    };

    const columns = useMemo(() => [
        col.accessor((row) => `${row.firstName} ${row.lastName}`, {
            id: 'name',
            header: t('dashboard.etudiants.table.student'),
            cell: ({ row }) => (
                <div className="max-w-[200px]">
                    <TruncatedText
                        text={`${row.original.firstName} ${row.original.lastName}`}
                        className="font-semibold text-slate-900 dark:text-white"
                    />
                    <TruncatedText text={row.original.email} className="text-xs text-slate-400" />
                </div>
            ),
            enableSorting: false,
        }),
        col.accessor((row) => row.promotion?.nom ?? '', {
            id: 'promotion',
            header: t('dashboard.etudiants.table.promotion'),
            cell: ({ getValue }) => {
                const value = getValue();
                return value ? (
                    <TruncatedText text={value} className="max-w-[160px] text-slate-500 dark:text-slate-400 text-sm" />
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
                    <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />
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
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            getValue()
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

    const filterOptions = useMemo(() => [
        { value: 'all', label: t('dashboard.etudiants.filter_all') },
        { value: 'active', label: t('dashboard.etudiants.filter_active') },
        { value: 'inactive', label: t('dashboard.etudiants.filter_inactive') },
        { value: 'stale', label: t('dashboard.etudiants.filter_stale') },
        { value: 'no-cv', label: t('dashboard.etudiants.filter_no_cv') },
    ], [t]);

    const promotionOptions = useMemo(() => [
        { value: '', label: t('dashboard.etudiants.filter_all_promotions') },
        ...(promotions ?? []).map((promotion) => ({
            value: promotion.id,
            label: promotion.year ? `${promotion.name} (${promotion.year})` : promotion.name,
        })),
    ], [promotions, t]);

    const params = {
        page,
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        isActive:  filterStatus === 'active' ? true  : filterStatus === 'inactive' ? false : undefined,
        hasCv:     filterStatus === 'no-cv'  ? false : undefined,
        hasStale:  filterStatus === 'stale'  ? true  : undefined,
        promotionId: promotionFilter || undefined,
    };

    const { data, isLoading, isFetching } = useStudentList(params);
    const students = data?.content ?? [];
    const totalElements = data?.totalElements ?? 0;
    const totalPages = data?.totalPages ?? 1;

    const table = useReactTable({
        data: students,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        pageCount: totalPages,
    });

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(0);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
    };

    const handleFilterChange = (value: FilterStatus) => {
        setFilterStatus(value);
        setPage(0);
    };

    const handlePromotionFilterChange = (value: string) => {
        setPromotionFilter(value);
        setPage(0);
    };

    const handleNotify = async (student: StudentRow, message?: string): Promise<void> => {
        try {
            await notifyMutation.mutateAsync({ studentId: student.id, message });
            toast.success(t('dashboard.notify_modal.success', { name: `${student.firstName} ${student.lastName}` }));
        } catch {
            toast.error(t('dashboard.notify_modal.error', { email: student.email }));
        }
    };

    const handleDeactivateStudent = (student: StudentRow) => {
        setConfirmDialog({
            isOpen: true,
            title: t('dashboard.etudiants.confirm_deactivate_title'),
            message: t('dashboard.etudiants.confirm_deactivate', { name: `${student.firstName} ${student.lastName}` }),
            onConfirm: async () => {
                try {
                    await deactivateMutation.mutateAsync(student.id);
                    toast.success(t('dashboard.etudiants.toast_deactivated'));
                } catch (err) {
                    console.error(err);
                    toast.error(t('dashboard.etudiants.toast_deactivate_error'));
                }
            },
        });
    };

    const handleReactivateStudent = async (student: StudentRow) => {
        try {
            await reactivateMutation.mutateAsync(student.id);
            toast.success(t('dashboard.etudiants.toast_reactivated'));
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.toast_reactivate_error'));
        }
    };

    const handleExportCsv = async () => {
        setExporting(true);
        try {
            const all = await fetchAllStudents();
            exportStudentsCsv(all);
            toast.success(t('dashboard.etudiants.actions.export_success', { count: all.length }));
        } catch {
            toast.error(t('dashboard.etudiants.actions.export_error'));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-12 animate-fadeIn">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('dashboard.etudiants.title')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('dashboard.etudiants.subtitle', { count: totalElements })}
                    </p>
                </div>
                <button
                    onClick={handleExportCsv}
                    disabled={exporting}
                    className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                    {exporting
                        ? <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                        : <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    }
                    {exporting ? t('dashboard.etudiants.exporting') : t('dashboard.etudiants.export_csv')}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={t('dashboard.etudiants.search_placeholder')}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <CustomSelect
                    value={filterStatus}
                    options={filterOptions}
                    onChange={(value) => handleFilterChange(value as FilterStatus)}
                    icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                />
                <CustomSelect
                    value={promotionFilter}
                    options={promotionOptions}
                    onChange={handlePromotionFilterChange}
                    icon={<GraduationCap className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                    searchable
                    searchPlaceholder={t('dashboard.etudiants.promotion_search_placeholder')}
                    noResultsLabel={t('dashboard.etudiants.promotion_no_results')}
                />
                {isFetching && !isLoading && (
                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr key={hg.id} className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {hg.headers.map((header) => (
                                        <th key={header.id} className="px-6 py-4">
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
                                    <th className="px-6 py-4 text-right">{t('dashboard.etudiants.table.actions')}</th>
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-16">
                                        <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-16 text-slate-400">
                                        {t('dashboard.etudiants.table.empty')}
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-6 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-right space-x-1">
                                            {row.original.hasCv && (
                                                <button
                                                    onClick={() => setViewingCvStudentId(row.original.id)}
                                                    disabled={studentCvLoading && viewingCvStudentId === row.original.id}
                                                    className="inline-flex p-1.5 rounded-lg text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer disabled:opacity-50"
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
                                                className="inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                title={t('dashboard.etudiants.actions.view')}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setSelectedStudent(row.original)}
                                                className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                                                title={t('dashboard.etudiants.actions.notify')}
                                            >
                                                <Mail className="h-4 w-4" />
                                            </button>
                                            {isAdmin && (
                                                row.original.accountActive ? (
                                                    <button
                                                        onClick={() => handleDeactivateStudent(row.original)}
                                                        className="inline-flex p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                                                        title={t('dashboard.etudiants.actions.deactivate')}
                                                    >
                                                        <UserX className="h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReactivateStudent(row.original)}
                                                        className="inline-flex p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
                                                        title={t('dashboard.etudiants.actions.reactivate')}
                                                    >
                                                        <UserCheck className="h-4 w-4" />
                                                    </button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                            pageNum === page
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

            {selectedStudent && (
                <NotifyStudentModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onSend={(message) => handleNotify(selectedStudent, message)}
                />
            )}

            {viewingStudent && (
                <StudentDetailModal
                    student={viewingStudent}
                    onClose={() => setViewingStudent(null)}
                />
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={t('dashboard.etudiants.actions.deactivate')}
                loading={confirmLoading}
                onConfirm={handleConfirm}
                onClose={closeConfirm}
            />

            {viewingCvStudentId && studentCv && (
                <CVDetailModal
                    cv={studentCv}
                    statuts={cvStatuts}
                    onClose={() => setViewingCvStudentId(null)}
                />
            )}
        </div>
    );
}
