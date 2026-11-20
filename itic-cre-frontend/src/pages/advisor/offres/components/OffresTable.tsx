import { useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table';
import {
    AlertTriangle, BellRing, Briefcase, Building2, ExternalLink, Eye, Loader2, Pencil, Sparkles, Users,
    ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TruncatedText from '../../../../components/shared/TruncatedText';
import InfiniteScrollSentinel from '../../../../components/shared/InfiniteScrollSentinel';
import type { JobOffer } from '../../../../types/models/JobOffer';
import { getApplyChannel } from '../../../../utils/applyChannel';
import DataTableFrame from '../../../../components/table/DataTableFrame';
import ColumnsMenu from '../../../../components/table/ColumnsMenu';
import { columnCellProps } from '../../../../components/table/columnMeta';
import { useColumnVisibility } from '../../../../components/table/useColumnVisibility';
import { useUserStore } from '../../../../store/UserStore';

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
    /** « Candidats suggérés » (score de rapprochement). */
    onSuggest?: (offer: JobOffer) => void;
    /** « Destinataires de l'alerte » : aperçu, sans envoi (lot 8). */
    onPreviewAlert?: (offer: JobOffer) => void;
    onViewApplicants: (offer: JobOffer) => void;
    sorting: SortingState;
    onSortingChange: (sorting: SortingState) => void;
}

export default function OffresTable({ offers, isLoading, hasNextPage, isFetchingNextPage, onLoadMore, onView, onEdit, onSuggest, onPreviewAlert, onViewApplicants, sorting, onSortingChange }: Props) {
    const { t } = useTranslation();
    const userId = useUserStore((state) => state.user?.id);
    // Colonnes affichées (bouton « Colonnes »), mémorisées par utilisateur (lot 11). L'intitulé reste toujours affiché.
    const [columnVisibility, setColumnVisibility] = useColumnVisibility('offres', userId, ['title']);

    const columns = useMemo(() => [
        col.accessor('title', {
            header: t('dashboard.offres.table.title'),
            // Identité de la ligne : figée à gauche pendant le défilement horizontal, jamais masquable (lot 11).
            enableHiding: false,
            meta: { stickyLeft: 0, stickyEdge: true },
            cell: ({ row }) => (
                <div className="flex items-start gap-2.5">
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
                        <TruncatedText text={row.original.title} className="max-w-[9rem] sm:max-w-[20rem] font-semibold text-slate-900 dark:text-white" />
                        <TruncatedText text={row.original.company} className="max-w-[9rem] sm:max-w-[20rem] text-xs text-slate-400" />
                        {row.original.draft && (
                            <span className="mt-1 mr-1 inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                title={t('dashboard.offres.draft_hint', 'Brouillon : invisible des étudiants tant qu’il n’est pas publié.')}>
                                {t('dashboard.offres.draft_badge', 'Brouillon')}
                            </span>
                        )}
                        {getApplyChannel(row.original) === 'none' && !row.original.draft && (
                            <span
                                className="mt-1 inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-900/50"
                                title={t('dashboard.offres.no_channel_hint', 'Ni lien ni adresse e-mail : les étudiants ne savent pas comment postuler.')}
                            >
                                <AlertTriangle className="h-3 w-3" />
                                {t('dashboard.offres.no_channel_badge', 'Sans moyen de postuler')}
                            </span>
                        )}
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
        col.accessor((row) => (row.programs ?? []).map((p) => p.name).join(', '), {
            id: 'formations',
            header: t('formations.column', 'Formation(s)'),
            cell: ({ row }) => {
                const list = row.original.programs ?? [];
                if (list.length === 0) return <span className="text-slate-300 dark:text-slate-600">—</span>;
                const shown = list.slice(0, 2);
                return (
                    <div className="flex items-center gap-1 whitespace-nowrap" title={list.map((p) => p.name).join(', ')}>
                        {shown.map((p) => (
                            <span key={p.id} className="inline-block max-w-[9rem] truncate px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                                {p.name}
                            </span>
                        ))}
                        {list.length > 2 && (
                            <span className="sr-only">{list.slice(2).map((p) => p.name).join(', ')}</span>
                        )}
                        {list.length > 2 && (
                            <span aria-hidden="true" className="inline-flex shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                +{list.length - 2}
                            </span>
                        )}
                    </div>
                );
            },
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
        col.accessor((row) => [row.createdByFirstName, row.createdByLastName].filter(Boolean).join(' '), {
            id: 'postedBy',
            header: t('dashboard.offres.table.posted_by', 'Déposée par'),
            // Pas de tri : les offres externes n'ont pas d'auteur (jointure qui les exclurait).
            enableSorting: false,
            cell: ({ getValue, row }) => {
                const name = getValue();
                if (row.original.source !== 'MANUAL') {
                    const sourceLabel = t(`dashboard.offres.external.sources.${row.original.source}`, row.original.source);
                    return (
                        <span className="whitespace-nowrap text-sm text-slate-400 dark:text-slate-500">
                            {t('dashboard.offres.posted_by_filter.external_author', { source: sourceLabel, defaultValue: 'Externe · {{source}}' })}
                        </span>
                    );
                }
                return name ? (
                    <TruncatedText text={name} className="max-w-[140px] text-slate-600 dark:text-slate-400 text-sm" />
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                );
            },
        }),
        col.accessor('applicationCount', {
            header: t('dashboard.offres.table.applications'),
            cell: ({ getValue, row }) => {
                const count = getValue();
                if (count === 0) {
                    return (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-slate-400 dark:text-slate-600">
                            <Users className="h-3.5 w-3.5" />{count}
                        </span>
                    );
                }
                return (
                    <button
                        type="button"
                        onClick={() => onViewApplicants(row.original)}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        title={t('dashboard.offres.applicants_modal.view_action', 'Voir les candidats')}
                    >
                        <Users className="h-3.5 w-3.5" />{count}
                    </button>
                );
            },
        }),
        col.accessor('active', {
            header: t('dashboard.offres.table.status'),
            cell: ({ getValue }) => (
                <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold ${getValue()
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                    {getValue() ? t('dashboard.offres.table.active') : t('dashboard.offres.table.inactive')}
                </span>
            ),
        }),
        col.accessor('createdAt', {
            header: t('dashboard.offres.table.created_at'),
            cell: ({ getValue }) => <span className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatDate(getValue())}</span>,
        }),
    ], [t, onViewApplicants]);

    const coreRowModel = useMemo(() => getCoreRowModel(), []);

    const table = useReactTable({
        data: offers,
        columns,
        state: { sorting, columnVisibility },
        onColumnVisibilityChange: setColumnVisibility,
        onSortingChange: (updater) => onSortingChange(typeof updater === 'function' ? updater(sorting) : updater),
        getCoreRowModel: coreRowModel,
        manualSorting: true,
    });

    const visibleCount = table.getVisibleLeafColumns().length;

    return (
        <DataTableFrame
            label={t('dashboard.offres.table.region_label', 'Tableau des offres')}
            toolbar={<ColumnsMenu table={table} className="min-w-48" />}
            footer={!isLoading && offers.length > 0 && (
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
                                    <th key={header.id} className={`px-3 sm:px-4 py-3 whitespace-nowrap ${cell.className}`} style={cell.style}>
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
                            <th className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">{t('dashboard.offres.table.actions')}</th>
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoading ? (
                        <tr>
                            <td colSpan={visibleCount + 1} className="text-center py-16">
                                <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                            </td>
                        </tr>
                    ) : offers.length === 0 ? (
                        <tr>
                            <td colSpan={visibleCount + 1} className="text-center py-16 text-slate-400">
                                <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                {t('dashboard.offres.table.empty')}
                            </td>
                        </tr>
                    ) : (
                        table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                {row.getVisibleCells().map((cell) => {
                                    const props = columnCellProps(cell.column);
                                    return (
                                        <td key={cell.id} className={`px-3 sm:px-4 py-3 ${props.className}`} style={props.style}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    );
                                })}
                                <td className="px-3 sm:px-4 py-3">
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
                                        {onSuggest && !row.original.draft && (
                                            <button
                                                onClick={() => onSuggest(row.original)}
                                                className="inline-flex p-1 rounded-lg text-[#3f74ff] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all cursor-pointer"
                                                title={t('matching.suggested_title', 'Candidats suggérés')}
                                                aria-label={t('matching.suggested_title', 'Candidats suggérés')}
                                            >
                                                <Sparkles className="h-4 w-4" />
                                            </button>
                                        )}
                                        {onPreviewAlert && !row.original.draft && (row.original.programs?.length ?? 0) > 0 && (
                                            <button
                                                onClick={() => onPreviewAlert(row.original)}
                                                className="inline-flex p-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all cursor-pointer"
                                                title={t('alerts.preview_title', 'Destinataires de l’alerte')}
                                                aria-label={t('alerts.preview_title', 'Destinataires de l’alerte')}
                                            >
                                                <BellRing className="h-4 w-4" />
                                            </button>
                                        )}
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
        </DataTableFrame>
    );
}
