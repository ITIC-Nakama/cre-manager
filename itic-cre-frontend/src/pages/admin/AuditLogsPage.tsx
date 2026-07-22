import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, ShieldCheck, SlidersHorizontal } from 'lucide-react';

import { useAuditLogs } from '../../hooks/useAudit';
import { AUDIT_ACTIONS, auditActionColor } from '../../utils/auditActionColors';
import CustomSelect from '../../components/basics/CustomSelect';

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isFetching } = useAuditLogs({
    page,
    size: PAGE_SIZE,
    search: debouncedSearch || undefined,
    action: actionFilter || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  });
  const logs = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const actionOptions = [
    { value: '', label: t('dashboard.audit_page.filter_all_actions') },
    ...AUDIT_ACTIONS.map((action) => ({
      value: action,
      label: t(`dashboard.audit_page.actions.${action}`, { defaultValue: action }),
    })),
  ];

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(0);
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setPage(0);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-indigo-500" />
          {t('dashboard.audit_page.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t('dashboard.audit_page.subtitle', { count: totalElements })}
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
            placeholder={t('dashboard.audit_page.search_placeholder')}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <CustomSelect
          value={actionFilter}
          options={actionOptions}
          onChange={handleActionFilterChange}
          icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
          className="min-w-56"
          searchable
        />
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <label htmlFor="audit-from" className="sr-only">{t('dashboard.audit_page.from_date')}</label>
          <input
            id="audit-from"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => handleFromDateChange(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span>{t('dashboard.audit_page.date_separator')}</span>
          <label htmlFor="audit-to" className="sr-only">{t('dashboard.audit_page.to_date')}</label>
          <input
            id="audit-to"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {isFetching && !isLoading && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4">{t('dashboard.audit_page.table.action')}</th>
                <th className="px-6 py-4">{t('dashboard.audit_page.table.description')}</th>
                <th className="px-6 py-4">{t('dashboard.audit_page.table.actor')}</th>
                <th className="px-6 py-4">{t('dashboard.audit_page.table.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-400">
                    {t('dashboard.audit_page.table.empty')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${auditActionColor(log.action)}`}>
                        {t(`dashboard.audit_page.actions.${log.action}`, { defaultValue: log.action })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-[360px]">
                      {log.description ?? (`${log.targetType ?? ''} ${log.targetId ?? ''}`.trim() || '—')}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400" title={log.actorEmail ?? undefined}>
                      {log.actorFirstName || log.actorLastName
                        ? `${log.actorFirstName ?? ''} ${log.actorLastName ?? ''}`.trim()
                        : (log.actorEmail ?? '—')}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs whitespace-nowrap">
                      {formatDate(log.createdAt)}
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
              {t('dashboard.audit_page.pagination.info', { current: page + 1, total: totalPages, count: totalElements })}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-medium"
              >
                {t('dashboard.audit_page.pagination.prev')}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-medium"
              >
                {t('dashboard.audit_page.pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
