import { useState, useRef, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import {
    Search, Loader2, Briefcase, Plus, Pencil, Trash2,
    Power, PowerOff, Users, ExternalLink, Eye,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    useAllJobOffers, useCreateJobOffer, useUpdateJobOffer,
    useDeactivateJobOffer, useActivateJobOffer, useDeleteJobOffer,
} from '../../hooks/useJobOffers';
import JobOfferFormModal from '../../components/shared/JobOfferFormModal';
import TruncatedText from '../../components/shared/TruncatedText';
import type { JobOffer } from '../../types/models/JobOffer';
import type { JobOfferPayload } from '../../api-s/requests/JobOfferRequest';

const PAGE_SIZE = 20;

const col = createColumnHelper<JobOffer>();

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

export default function OffresPage() {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const params = { page, size: PAGE_SIZE, search: debouncedSearch || undefined };
    const { data, isLoading, isFetching } = useAllJobOffers(params);
    const offers = data?.content ?? [];
    const totalElements = data?.totalElements ?? 0;
    const totalPages = data?.totalPages ?? 1;

    const createMutation = useCreateJobOffer();
    const updateMutation = useUpdateJobOffer();
    const deactivateMutation = useDeactivateJobOffer();
    const activateMutation = useActivateJobOffer();
    const deleteMutation = useDeleteJobOffer();

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(0);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
    };

    const handleSave = async (payload: JobOfferPayload) => {
        if (editingOffer) {
            await updateMutation.mutateAsync({ id: editingOffer.id, payload });
            toast.success(t('dashboard.offres.toast.updated'));
        } else {
            await createMutation.mutateAsync(payload);
            toast.success(t('dashboard.offres.toast.created'));
        }
    };

    const handleToggleActive = async (offer: JobOffer) => {
        try {
            if (offer.active) {
                await deactivateMutation.mutateAsync(offer.id);
                toast.success(t('dashboard.offres.toast.deactivated'));
            } else {
                await activateMutation.mutateAsync(offer.id);
                toast.success(t('dashboard.offres.toast.activated'));
            }
        } catch {
            toast.error(t('dashboard.offres.toast.action_error'));
        }
    };

    const handleDelete = async (offer: JobOffer) => {
        if (!window.confirm(t('dashboard.offres.confirm_delete', { title: offer.title }))) return;
        try {
            await deleteMutation.mutateAsync(offer.id);
            toast.success(t('dashboard.offres.toast.deleted'));
        } catch {
            toast.error(t('dashboard.offres.toast.action_error'));
        }
    };

    const columns = useMemo(() => [
        col.accessor('title', {
            header: t('dashboard.offres.table.title'),
            cell: ({ row }) => (
                <div className="max-w-[220px]">
                    <TruncatedText text={row.original.title} className="font-semibold text-slate-900 dark:text-white" />
                    <TruncatedText text={row.original.company} className="text-xs text-slate-400" />
                </div>
            ),
        }),
        col.accessor((row) => row.location ?? '', {
            id: 'location',
            header: t('dashboard.offres.table.location'),
            cell: ({ getValue }) => {
                const value = getValue();
                return value ? (
                    <TruncatedText text={value} className="max-w-[140px] text-slate-500 dark:text-slate-400 text-sm" />
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                );
            },
        }),
        col.accessor((row) => row.contractType.label, {
            id: 'contractType',
            header: t('dashboard.offres.table.contract'),
            cell: ({ getValue }) => (
                <TruncatedText text={getValue()} className="max-w-[120px] text-slate-600 dark:text-slate-400 text-sm" />
            ),
        }),
        col.accessor('applicationCount', {
            header: t('dashboard.offres.table.applications'),
            cell: ({ getValue }) => (
                <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <Users className="h-3.5 w-3.5" />{getValue()}
                </span>
            ),
        }),
        col.accessor('active', {
            header: t('dashboard.offres.table.status'),
            cell: ({ getValue }) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    getValue()
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                    {getValue() ? t('dashboard.offres.table.active') : t('dashboard.offres.table.inactive')}
                </span>
            ),
        }),
        col.accessor('createdAt', {
            header: t('dashboard.offres.table.created_at'),
            cell: ({ getValue }) => <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(getValue())}</span>,
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [t]);

    const table = useReactTable({
        data: offers,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: totalPages,
    });

    return (
        <div className="flex flex-col gap-6 pb-12 animate-fadeIn">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('dashboard.offres.title')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('dashboard.offres.subtitle', { count: totalElements })}
                    </p>
                </div>
                <button
                    onClick={() => { setEditingOffer(null); setIsReadOnly(false); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    {t('dashboard.offres.create_button')}
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
                        placeholder={t('dashboard.offres.search_placeholder')}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
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
                                    <th className="px-6 py-4 text-right">{t('dashboard.offres.table.actions')}</th>
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
                            ) : offers.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-16 text-slate-400">
                                        <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                        {t('dashboard.offres.table.empty')}
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
                                            {row.original.externalLink && (
                                                <a
                                                    href={row.original.externalLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                    title={t('dashboard.offres.actions.view_link')}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => { setEditingOffer(row.original); setIsReadOnly(true); setFormOpen(true); }}
                                                className="inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                title={t('dashboard.offres.actions.view_details', "Consulter les détails")}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => { setEditingOffer(row.original); setIsReadOnly(false); setFormOpen(true); }}
                                                className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                                                title={t('dashboard.offres.actions.edit')}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(row.original)}
                                                className={`inline-flex p-1.5 rounded-lg transition-all cursor-pointer ${
                                                    row.original.active
                                                        ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                                        : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                                }`}
                                                title={row.original.active ? t('dashboard.offres.actions.deactivate') : t('dashboard.offres.actions.activate')}
                                            >
                                                {row.original.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(row.original)}
                                                className="inline-flex p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                                                title={t('dashboard.offres.actions.delete')}
                                            >
                                                <Trash2 className="h-4 w-4" />
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
                            {t('dashboard.offres.pagination.info', { current: page + 1, total: totalPages, count: totalElements })}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-medium"
                            >
                                {t('dashboard.offres.pagination.prev')}
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-medium"
                            >
                                {t('dashboard.offres.pagination.next')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {formOpen && (
                <JobOfferFormModal
                    offer={editingOffer}
                    onClose={() => setFormOpen(false)}
                    onSave={handleSave}
                    isReadOnly={isReadOnly}
                />
            )}
        </div>
    );
}
