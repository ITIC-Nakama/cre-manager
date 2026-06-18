import { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import {
    Search, SlidersHorizontal, Loader2, FileText,
    Eye, CheckCircle, Clock, AlertTriangle,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAllCVs, useCVStatuts, useCVStats } from '../../hooks/useCV';
import CVDetailModal from '../../components/shared/CVDetailModal';
import CustomSelect from '../../components/basics/CustomSelect';
import TruncatedText from '../../components/shared/TruncatedText';
import type { CVRow } from '../../types/models/CV';

const PAGE_SIZE_LOCAL = 20;

const col = createColumnHelper<CVRow>();

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

function StatutBadge({ nom, couleur }: { nom: string; couleur: string }) {
    let icon;
    const lc = nom.toLowerCase();
    if (lc.includes('valid')) icon = <CheckCircle className="h-3 w-3" />;
    else if (lc.includes('corriger')) icon = <AlertTriangle className="h-3 w-3" />;
    else icon = <Clock className="h-3 w-3" />;

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{
                background: `${couleur}22`,
                color: couleur,
                border: `1px solid ${couleur}44`,
            }}
        >
            {icon}
            {nom}
        </span>
    );
}

export default function CVValidationPage() {
    const { t } = useTranslation();
    const [statutFilter, setStatutFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [selectedCV, setSelectedCV] = useState<CVRow | null>(null);

    const { data: statuts = [] } = useCVStatuts();
    const { data: stats = [] } = useCVStats();
    const { data, isLoading } = useAllCVs({
        page,
        size: PAGE_SIZE_LOCAL,
        statutId: statutFilter || undefined,
        search: search.trim() || undefined,
    });

    const pagedCVs = data?.content ?? [];
    const totalElements = data?.totalElements ?? 0;
    const totalPages = data?.totalPages ?? 1;
    const safePage = data?.number ?? 0;

    const statutOptions = useMemo(() => [
        { value: '', label: t('dashboard.cv.filter_all_statuts', 'Tous les statuts') },
        ...statuts.map((s) => ({ value: s.id, label: s.nom })),
    ], [statuts, t]);

    const columns = useMemo(() => [
        col.accessor((row) => row.student ? `${row.student.firstName} ${row.student.lastName}` : '—', {
            id: 'student',
            header: t('dashboard.cv.table.student', 'Étudiant'),
            cell: ({ row }) => (
                <div className="max-w-[200px]">
                    <TruncatedText
                        text={row.original.student
                            ? `${row.original.student.firstName} ${row.original.student.lastName}`
                            : '—'}
                        className="font-semibold text-slate-900 dark:text-white"
                    />
                    {row.original.student?.email && (
                        <TruncatedText text={row.original.student.email} className="text-xs text-slate-400" />
                    )}
                </div>
            ),
        }),
        col.accessor((row) => row.student?.promotion?.nom ?? '', {
            id: 'promotion',
            header: t('dashboard.cv.table.promotion', 'Promotion'),
            cell: ({ getValue }) => {
                const v = getValue();
                return v
                    ? <TruncatedText text={v} className="max-w-[140px] text-slate-500 dark:text-slate-400 text-sm" />
                    : <span className="text-slate-300 dark:text-slate-600">—</span>;
            },
        }),
        col.accessor('statut', {
            header: t('dashboard.cv.table.status', 'Statut'),
            cell: ({ getValue }) => {
                const s = getValue();
                return <StatutBadge nom={s.nom} couleur={s.couleur} />;
            },
        }),
        col.accessor('uploadedAt', {
            header: t('dashboard.cv.table.uploaded_at', 'Déposé le'),
            cell: ({ getValue }) => (
                <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(getValue())}</span>
            ),
        }),
        col.accessor('updatedAt', {
            header: t('dashboard.cv.table.updated_at', 'Mis à jour'),
            cell: ({ getValue }) => (
                <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(getValue())}</span>
            ),
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [t]);

    const table = useReactTable({
        data: pagedCVs,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: totalPages,
    });

    const handleStatutChange = (val: string) => {
        setStatutFilter(val);
        setPage(0);
    };

    const handleSearch = (val: string) => {
        setSearch(val);
        setPage(0);
    };

    return (
        <div className="flex flex-col gap-6 pb-12 animate-fadeIn">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t('dashboard.cv.title', 'Validation des CV')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {`${totalElements} CV${totalElements !== 1 ? 's' : ''} déposé${totalElements !== 1 ? 's' : ''}`}
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
                        placeholder={t('dashboard.cv.search_placeholder', 'Rechercher un étudiant…')}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <CustomSelect
                    value={statutFilter}
                    options={statutOptions}
                    onChange={handleStatutChange}
                    icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
                    className="min-w-48"
                />
                {isLoading && (
                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                )}
            </div>

            {/* Status summary chips */}
            {!isLoading && statuts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {statuts.map((s) => {
                        const stat = stats.find((st) => st.statutId === s.id);
                        const count = stat ? stat.count : 0;
                        return (
                            <button
                                key={s.id}
                                onClick={() => handleStatutChange(statutFilter === s.id ? '' : s.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                    statutFilter === s.id ? 'ring-2 ring-offset-1' : 'opacity-80 hover:opacity-100'
                                }`}
                                style={{
                                    background: `${s.couleur}18`,
                                    color: s.couleur,
                                    border: `1px solid ${s.couleur}44`,
                                }}
                            >
                                {s.nom} · {count}
                            </button>
                        );
                    })}
                </div>
            )}

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
                            ) : pagedCVs.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-16 text-slate-400">
                                        <FileText className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                        {t('dashboard.cv.table.empty', 'Aucun CV ne correspond à vos critères.')}
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-6 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedCV(row.original)}
                                                className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                                                title={t('dashboard.cv.actions.review', 'Examiner le CV')}
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
                            {`Page ${safePage + 1} sur ${totalPages} — ${totalElements} CV`}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={safePage === 0}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const pageNum = Math.max(0, Math.min(safePage - 2, totalPages - 5)) + i;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                            pageNum === safePage
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
                                disabled={safePage >= totalPages - 1}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* CV Detail Modal */}
            {selectedCV && (
                <CVDetailModal
                    cv={selectedCV}
                    statuts={statuts}
                    onClose={() => setSelectedCV(null)}
                />
            )}
        </div>
    );
}
