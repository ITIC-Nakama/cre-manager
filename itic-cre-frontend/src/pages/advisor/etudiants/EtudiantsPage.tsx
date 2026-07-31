import { useState, useRef, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    type SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { useStudentList, useNotifyStudent, useDeactivateStudent, useReactivateStudent } from '../../../hooks/useDashboard';
import { usePromotions } from '../../../hooks/usePromotions';
import { exportStudentsCsv } from '../../../utils/csvExport';
import { fetchAllStudents } from '../../../api-s/requests/DashboardRequest';
import NotifyStudentModal from '../../../components/shared/NotifyStudentModal';
import StudentDetailModal from '../../../components/shared/StudentDetailModal';
import CVDetailModal from '../../../components/shared/CVDetailModal';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import type { StudentRow } from '../../../types/models/Dashboard';
import { useCVByStudent, useCVStatuts } from '../../../hooks/useCV';

import { useStudentColumns } from './hooks/useStudentTableColumn';
import StudentTable from './components/StudentTable';
import EtudiantsHeader from './components/EtudiantsHeader';
import EtudiantsFilters, { type FilterStatus } from './components/EtudiantsFilters';

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
            const all = await fetchAllStudents(params);
            exportStudentsCsv(all);
            toast.success(t('dashboard.etudiants.actions.export_success', { count: all.length }));
        } catch {
            toast.error(t('dashboard.etudiants.actions.export_error'));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Header */}
            <EtudiantsHeader
                totalElements={totalElements}
                exporting={exporting}
                onExport={handleExportCsv}
            />

            {/* Filters */}
            <EtudiantsFilters
                search={search}
                filterStatus={filterStatus}
                promotionFilter={promotionFilter}
                includeAnonymized={includeAnonymized}
                isFetching={isFetching}
                isLoading={isLoading}
                isAdmin={isAdmin}
                filterOptions={filterOptions}
                promotionOptions={promotionOptions}
                onSearchChange={handleSearch}
                onFilterChange={handleFilterChange}
                onPromotionChange={handlePromotionFilterChange}
                onIncludeAnonymizedChange={(checked) => {
                    setIncludeAnonymized(checked);
                    setPage(0);
                }}
            />

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

            {/* Modals */}
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
