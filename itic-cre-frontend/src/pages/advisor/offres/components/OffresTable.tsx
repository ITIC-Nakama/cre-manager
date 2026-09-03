import { useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table';
import {
    Briefcase, Building2, ExternalLink, Eye, Loader2, Pencil, Users,
    ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TruncatedText from '../../../../components/shared/TruncatedText';
import InfiniteScrollSentinel from '../../../../components/shared/InfiniteScrollSentinel';
import type { JobOffer } from '../../../../types/models/JobOffer';

const col = createColumnHelper<JobOffer>();

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5" />;
    if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

interface Props {
    offers: JobOffer[];
    isLoading: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    onView: (offer: JobOffer) => void;
    onEdit: (offer: JobOffer) => void;
    sorting: SortingState;
    onSortingChange: (sorting: SortingState) => void;
}

export default function OffresTable({ offers, isLoading, hasNextPage, isFetchingNextPage, onLoadMore, onView, onEdit, sorting, onSortingChange }: Props) {
    const { t } = useTranslation();

    const columns = useMemo(() => [
        col.accessor('title', {
            header: t('dashboard.offres.table.title'),
            cell: ({ row }) => (
                <div className="flex items-start gap-2.5 max-w-[260px]">
                    {row.original.companyLogoUrl ? (
                        <img
                            src={row.original.companyLogoUrl}
                            alt={row.original.company}
                            className="h-8 w-8 rounded-lg object-contain border border-slate-200 dark:border-slate-800 bg-white shrink-0"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-slate-400" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <span className="block font-semibold text-slate-900 dark:text-white line-clamp-2" title={row.original.title}>{row.original.title}</span>
                        <TruncatedText text={row.original.company} className="text-xs text-slate-400" />
                    </div>
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
        col.accessor((row) => row.sector?.label ?? '', {
            id: 'sector',
            header: t('dashboard.offres.table.sector', 'Secteur'),
            cell: ({ getValue }) => {
                const value = getValue();
                return value ? (
                    <TruncatedText text={value} className="max-w-[140px] text-slate-600 dark:text-slate-400 text-sm" />
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                );
            },
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
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getValue()
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

    const coreRowModel = useMemo(() => getCoreRowModel(), []);

    const table = useReactTable({
        data: offers,
        columns,
        state: { sorting },
        onSortingChange: (updater) => onSortingChange(typeof updater === 'function' ? updater(sorting) : updater),
        getCoreRowModel: coreRowModel,
        manualSorting: true,
    });

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id} className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {hg.headers.map((header) => (
                                    <th key={header.id} className="px-4 py-3">
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
                                <th className="px-4 py-3 text-right">{t('dashboard.offres.table.actions')}</th>
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
                                        <td key={cell.id} className="px-4 py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-0.5 flex-nowrap">
                                            {row.original.externalLink && (
                                                <a
                                                    href={row.original.externalLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                    title={t('dashboard.offres.actions.view_link')}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => onView(row.original)}
                                                className="inline-flex p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                title={t('dashboard.offres.actions.view_details', "Consulter les détails")}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => onEdit(row.original)}
                                                className="inline-flex p-1 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                                                title={t('dashboard.offres.actions.edit')}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!isLoading && offers.length > 0 && (
                <InfiniteScrollSentinel
                    hasMore={hasNextPage}
                    isLoadingMore={isFetchingNextPage}
                    onLoadMore={onLoadMore}
                />
            )}
        </div>
    );
}
