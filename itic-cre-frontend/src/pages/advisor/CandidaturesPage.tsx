import { useState, useRef, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import {
    Search, SlidersHorizontal, Loader2, AlertCircle,
    Briefcase, GraduationCap, FileSignature, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApplicationList, useApplicationStatuses, useContractTypes } from '../../hooks/useApplications';
import { usePromotions } from '../../hooks/usePromotions';
import CustomSelect from '../../components/basics/CustomSelect';
import StatusBadge from '../../components/shared/StatusBadge';
import TruncatedText from '../../components/shared/TruncatedText';
import ApplicationDetailModal from '../../components/shared/ApplicationDetailModal';
import type { ApplicationRow } from '../../types/models/Application';

const PAGE_SIZE = 20;

const col = createColumnHelper<ApplicationRow>();

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

export default function CandidaturesPage() {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [promotionFilter, setPromotionFilter] = useState('');
    const [contractTypeFilter, setContractTypeFilter] = useState('');
    const [staleOnly, setStaleOnly] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<ApplicationRow | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: statuses } = useApplicationStatuses();
    const { data: promotions } = usePromotions();
    const { data: contractTypes } = useContractTypes();

    const columns = useMemo(() => [
        col.accessor((row) => `${row.student.firstName} ${row.student.lastName}`, {
            id: 'student',
            header: t('dashboard.candidatures.table.student'),
            cell: ({ row }) => (
                <div className="max-w-[200px]">
                    <TruncatedText
                        text={`${row.original.student.firstName} ${row.original.student.lastName}`}
                        className="font-semibold text-slate-900 dark:text-white"
                    />
                    <TruncatedText text={row.original.student.email} className="text-xs text-slate-400" />
                </div>
            ),
        }),
        col.accessor((row) => row.student.promotion?.nom ?? '', {
            id: 'promotion',
            header: t('dashboard.candidatures.table.promotion'),
            cell: ({ getValue }) => {
                const value = getValue();
                return value ? (
                    <TruncatedText text={value} className="max-w-[140px] text-slate-500 dark:text-slate-400 text-sm" />
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                );
            },
        }),
        col.accessor('entreprise', {
            header: t('dashboard.candidatures.table.entreprise'),
            cell: ({ getValue }) => (
                <TruncatedText text={getValue()} className="max-w-[160px] font-medium text-slate-700 dark:text-slate-300" />
            ),
        }),
        col.accessor('poste', {
            header: t('dashboard.candidatures.table.poste'),
            cell: ({ getValue }) => (
                <TruncatedText text={getValue()} className="max-w-[180px] text-slate-600 dark:text-slate-400 text-sm" />
            ),
        }),
        col.accessor((row) => row.typeContrat?.label ?? '', {
            id: 'typeContrat',
            header: t('dashboard.candidatures.table.contract'),
            cell: ({ getValue }) => {
                const value = getValue();
                return value ? (
                    <TruncatedText text={value} className="max-w-[120px] text-slate-500 dark:text-slate-400 text-sm" />
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                );
            },
        }),
        col.accessor('status', {
            header: t('dashboard.candidatures.table.status'),
            cell: ({ getValue }) => {
                const status = getValue();
                return <StatusBadge nom={status.nom} couleur={status.couleur} />;
            },
        }),
        col.accessor('dateModification', {
            header: t('dashboard.candidatures.table.last_update'),
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    {row.original.stale && <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                    <span className={`text-sm ${row.original.stale ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                        {formatDate(row.original.dateModification)}
                    </span>
                </div>
            ),
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [t]);

    const statusOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_statuses') },
        ...(statuses ?? []).map((s) => ({ value: s.id, label: s.nom })),
    ], [statuses, t]);

    const promotionOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_promotions') },
        ...(promotions ?? []).map((p) => ({
            value: p.id,
            label: p.year ? `${p.name} (${p.year})` : p.name,
        })),
    ], [promotions, t]);

    const contractTypeOptions = useMemo(() => [
        { value: '', label: t('dashboard.candidatures.filter_all_contracts') },
        ...(contractTypes ?? []).map((c) => ({ value: c.id, label: c.label })),
    ], [contractTypes, t]);

    const params = {
        page,
        size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        statusId: statusFilter || undefined,
        promotionId: promotionFilter || undefined,
        typeContratId: contractTypeFilter || undefined,
        stale: staleOnly ? true : undefined,
    };

    const { data, isLoading, isFetching } = useApplicationList(params);
    const applications = data?.content ?? [];
    const totalElements = data?.totalElements ?? 0;
    const totalPages = data?.totalPages ?? 1;

    const table = useReactTable({
        data: applications,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: totalPages,
    });

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(0);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
    };

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        setPage(0);
    };

    const handlePromotionFilterChange = (value: string) => {
        setPromotionFilter(value);
        setPage(0);
    };

    const handleContractTypeFilterChange = (value: string) => {
        setContractTypeFilter(value);
        setPage(0);
    };

    const handleStaleToggle = () => {
        setStaleOnly((prev) => !prev);
        setPage(0);
    };

    return (
        <div className="flex flex-col gap-6 pb-12 animate-fadeIn">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t('dashboard.candidatures.title')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('dashboard.candidatures.subtitle', { count: totalElements })}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={t('dashboard.candidatures.search_placeholder')}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <CustomSelect
                    value={statusFilter}
                    options={statusOptions}
                    onChange={handleStatusFilterChange}
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
                    searchPlaceholder={t('dashboard.candidatures.promotion_search_placeholder')}
                    noResultsLabel={t('dashboard.candidatures.promotion_no_results')}
                />
                <CustomSelect
                    value={contractTypeFilter}
                    options={contractTypeOptions}
                    onChange={handleContractTypeFilterChange}
                    icon={<FileSignature className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                />
                <button
                    onClick={handleStaleToggle}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        staleOnly
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    <AlertCircle className="h-4 w-4" />
                    {t('dashboard.candidatures.filter_stale_only')}
                </button>
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
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-right">{t('dashboard.offres.table.actions', 'Actions')}</th>
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
                            ) : applications.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-16 text-slate-400">
                                        <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                        {t('dashboard.candidatures.table.empty')}
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => setSelectedApplication(row.original)}
                                        className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                                            row.original.stale ? 'border-l-2 border-l-amber-400' : ''
                                        }`}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-6 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setSelectedApplication(row.original)}
                                                className="inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                title={t('dashboard.etudiants.actions.view', "Consulter les détails")}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
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
                            {t('dashboard.candidatures.pagination.info', { current: page + 1, total: totalPages, count: totalElements })}
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

            {selectedApplication && (
                <ApplicationDetailModal
                    application={selectedApplication}
                    onClose={() => setSelectedApplication(null)}
                />
            )}
        </div>
    );
}
