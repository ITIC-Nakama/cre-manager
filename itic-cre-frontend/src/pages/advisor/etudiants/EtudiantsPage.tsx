import { useState, useRef, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    type SortingState,
} from '@tanstack/react-table';
import {
    Search, SlidersHorizontal,  Loader2,
    FileSpreadsheet, GraduationCap, ShieldAlert, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import { useStudentList, useNotifyStudent, useDeactivateStudent, useReactivateStudent } from '../../../hooks/useDashboard';
import { usePromotions } from '../../../hooks/usePromotions';
import { exportStudentsCsv } from '../../../utils/csvExport';
import { fetchAllStudents } from '../../../api-s/requests/DashboardRequest';
import NotifyStudentModal from '../../../components/shared/NotifyStudentModal';
import StudentDetailModal from '../../../components/shared/StudentDetailModal';
import CVDetailModal from '../../../components/shared/CVDetailModal';
import CustomSelect from '../../../components/basics/CustomSelect';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import type { StudentRow } from '../../../types/models/Dashboard';
import { useCVByStudent, useCVStatuts } from '../../../hooks/useCV';
import { useStudentColumns } from './hooks/useStudentTableColumn';
import StudentTable from './components/StudentTable';

type FilterStatus = 'all' | 'active' | 'inactive' | 'stale' | 'no-cv';

const PAGE_SIZE = 20;


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
    const [includeAnonymized, setIncludeAnonymized] = useState(false);
    const { data: promotions } = usePromotions();
    const currentUser = useUserStore((state) => state.user);
    const isAdmin = currentUser?.role === Role.ADMIN;

    const { data: studentCv, isLoading: studentCvLoading } = useCVByStudent(viewingCvStudentId);
    const { data: cvStatuts = [] } = useCVStatuts();
    const columns = useStudentColumns();

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => Promise<void>;
    }>({ isOpen: false, title: '', message: '', onConfirm: async () => { } });
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
        isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
        hasCv: filterStatus === 'no-cv' ? false : undefined,
        hasStale: filterStatus === 'stale' ? true : undefined,
        promotionId: promotionFilter || undefined,
        includeAnonymized: isAdmin ? includeAnonymized : false,
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
        <div className="flex flex-col gap-6  animate-fadeIn">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Users className="h-7 w-7 text-[#E2762F] shrink-0" />
                        {renderTitleWithGradient(t('dashboard.etudiants.title', 'Gestion des Étudiants'), 'itic-gradient-blue')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
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
                {isAdmin && (
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input
                            type="checkbox"
                            checked={includeAnonymized}
                            onChange={(e) => {
                                setIncludeAnonymized(e.target.checked);
                                setPage(0);
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                        <span>{t('dashboard.etudiants.filter_show_anonymized')}</span>
                    </label>
                )}
                {isFetching && !isLoading && (
                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                )}
            </div>

            {/* Table */}
            <StudentTable
                table={table}
                isLoading={isLoading}
                students={students}
                totalElements={totalElements}
                totalPages={totalPages}
                page={page}
                setPage={setPage}
                studentCvLoading={studentCvLoading}
                viewingCvStudentId={viewingCvStudentId}
                setViewingCvStudentId={setViewingCvStudentId}
                setViewingStudent={setViewingStudent}
            />

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
                    onNotify={(s) => setSelectedStudent(s)}
                    onToggleActive={(s) => s.accountActive ? handleDeactivateStudent(s) : handleReactivateStudent(s)}
                    isAdmin={isAdmin}
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
