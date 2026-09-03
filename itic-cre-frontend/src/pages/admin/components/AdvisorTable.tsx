import { useTranslation } from 'react-i18next';
import {
  Loader2, UserCog, Pencil, Trash2, UserCheck,
  Mail, Phone, KeyRound, UserX,
} from 'lucide-react';
import type { Advisor } from '../../../types/models/Advisor';
import InfiniteScrollSentinel from '../../../components/shared/InfiniteScrollSentinel';
import SortableTh, { type SortState } from '../../../components/basics/SortableTh';

interface AdvisorTableProps {
  currentList: Advisor[];
  isLoading: boolean;
  isAdminsTab: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  sort: SortState | null;
  onSort: (key: string) => void;
  onEdit: (advisor: Advisor) => void;
  onResetPassword: (advisor: Advisor) => void;
  onDeactivate: (advisor: Advisor) => void;
  onDelete: (advisor: Advisor) => void;
  onReactivate: (advisor: Advisor) => void;
}

export default function AdvisorTable({
  currentList,
  isLoading,
  isAdminsTab,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  sort,
  onSort,
  onEdit,
  onResetPassword,
  onDeactivate,
  onDelete,
  onReactivate,
}: AdvisorTableProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <SortableTh label={t('dashboard.conseillers.table.name')} sortKey="name" currentSort={sort} onSort={onSort} />
              <SortableTh label={t('dashboard.conseillers.table.contact')} sortKey="contact" currentSort={sort} onSort={onSort} />
              <th className="px-6 py-4">{t('dashboard.conseillers.table.job_title')}</th>
              <th className="px-6 py-4 text-right">{t('dashboard.conseillers.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-16">
                  <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                </td>
              </tr>
            ) : currentList.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-16 text-slate-400">
                  <UserCog className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  {isAdminsTab
                    ? t('dashboard.conseillers.empty_admins')
                    : t('dashboard.conseillers.table.empty')}
                </td>
              </tr>
            ) : (
              currentList.map((person) => {
                const isAdmin = person.role?.name === 'ADMIN';
                return (
                  <tr
                    key={person.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${!person.active ? 'opacity-60' : ''}`}
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isAdmin
                            ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                            : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        }`}>
                          {person.firstName[0]}{person.lastName[0]}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {person.firstName} {person.lastName}
                          </span>
                          {!person.active && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
                              {t('dashboard.conseillers.status.inactive')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{person.email}</span>
                        {person.phoneNumber && (
                          <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{person.phoneNumber}</span>
                        )}
                      </div>
                    </td>

                    {/* Job title */}
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {person.jobTitle || (isAdmin ? t('roles.admin') : <span className="text-slate-300 dark:text-slate-600">—</span>)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Modifier */}
                        <button
                          onClick={() => onEdit(person)}
                          className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                          title={t('dashboard.conseillers.actions.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Reset MDP — conseillers uniquement */}
                        {!isAdmin && (
                          <button
                            onClick={() => onResetPassword(person)}
                            className="inline-flex p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all cursor-pointer"
                            title={t('dashboard.conseillers.actions.reset_password')}
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        )}

                        {person.active ? (
                          <>
                            {/* Désactiver */}
                            <button
                              onClick={() => onDeactivate(person)}
                              className="inline-flex p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all cursor-pointer"
                              title={t('dashboard.conseillers.actions.deactivate')}
                            >
                              <UserX className="h-4 w-4" />
                            </button>

                            {/* Supprimer — conseillers uniquement */}
                            {!isAdmin && (
                              <button
                                onClick={() => onDelete(person)}
                                className="inline-flex p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                                title={t('dashboard.conseillers.actions.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          /* Réactiver */
                          <button
                            onClick={() => onReactivate(person)}
                            className="inline-flex p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
                            title={t('dashboard.conseillers.actions.reactivate')}
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && currentList.length > 0 && (
        <InfiniteScrollSentinel
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
          onLoadMore={onLoadMore}
        />
      )}
    </div>
  );
}
