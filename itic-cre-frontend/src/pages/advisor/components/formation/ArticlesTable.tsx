import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/react-table';
import {
  Edit,
  Trash2,
  BookOpen,
  Award,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown
} from 'lucide-react';
import TruncatedText from '../../../../components/shared/TruncatedText';
import type { ArticleSummary } from '../../../../types/models/Skill';

interface ArticlesTableProps {
  articles: ArticleSummary[];
  onQuizClick: (id: string, title: string) => void;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string, title: string) => void;
}

const PAGE_SIZE = 10;
const col = createColumnHelper<ArticleSummary>();

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5" />;
  if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />;
}

export default function ArticlesTable({
  articles,
  onQuizClick,
  onEditClick,
  onDeleteClick
}: ArticlesTableProps) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const columns = useMemo(() => [
    col.accessor('titre', {
      header: t('dashboard.formation.col_title'),
      cell: ({ row }) => (
        <div className="max-w-[280px]">
          <TruncatedText text={row.original.titre} className="font-semibold text-slate-900 dark:text-white" />
        </div>
      ),
    }),
    col.accessor('categoryNom', {
      header: t('dashboard.formation.col_category'),
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 max-w-[150px]">
          <TruncatedText text={row.original.categoryNom} />
        </span>
      ),
    }),
    col.accessor('createdByEmail', {
      header: t('dashboard.formation.col_author'),
      cell: ({ getValue }) => {
        const email = getValue();
        return email ? (
          <div className="max-w-[180px]">
            <TruncatedText text={email} className="text-slate-600 dark:text-slate-300" />
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-600">—</span>
        );
      },
    }),
    col.accessor('actif', {
      header: t('dashboard.formation.col_status'),
      cell: ({ getValue }) => getValue() ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <Eye className="h-4 w-4" /> {t('dashboard.formation.status_active')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 text-sm font-medium">
          <EyeOff className="h-4 w-4" /> {t('dashboard.formation.status_inactive')}
        </span>
      ),
    }),
    col.accessor('hasQuiz', {
      header: t('dashboard.formation.col_quiz'),
      cell: ({ getValue }) => getValue() ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
          <CheckCircle2 className="h-3.5 w-3.5" /> {t('dashboard.formation.quiz_configured')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
          <HelpCircle className="h-3.5 w-3.5" /> {t('dashboard.formation.quiz_none')}
        </span>
      ),
    }),
  ], [t]);

  const table = useReactTable({
    data: articles,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/40">
        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-base font-semibold">{t('dashboard.formation.no_articles')}</p>
        <p className="text-sm">{t('dashboard.formation.no_articles_desc')}</p>
      </div>
    );
  }

  const totalElements = articles.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950/50">
                {hg.headers.map((header) => (
                  <th key={header.id} className="py-3 px-6">
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
                <th className="py-3 px-6 text-right">{t('dashboard.formation.col_actions')}</th>
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-4 px-6">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                <td className="py-4 px-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onQuizClick(row.original.id, row.original.titre)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                    >
                      <Award className="h-3.5 w-3.5" />
                      {t('dashboard.formation.btn_quiz')}
                    </button>
                    <button
                      onClick={() => onEditClick(row.original.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteClick(row.original.id, row.original.titre)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 text-sm mt-2">
          <span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">
            {t('dashboard.formation.pagination.info', {
              current: pageIndex + 1,
              total: totalPages,
              count: totalElements,
              defaultValue: 'Page {{current}} sur {{total}} — {{count}} articles'
            })}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {t('dashboard.formation.pagination.prev', 'Précédent')}
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {t('dashboard.formation.pagination.next', 'Suivant')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
