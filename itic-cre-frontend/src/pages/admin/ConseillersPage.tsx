import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Loader2, UserCog, Pencil, Trash2, Mail, Phone, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { useAdvisors, useCreateAdvisor, useUpdateAdvisor, useDeleteAdvisor } from '../../hooks/useAdvisors';
import type { Advisor } from '../../types/models/Advisor';

import ConfirmDialog from '../../components/shared/ConfirmDialog';
import AdvisorModal from './components/AdvisorModal';
import ResetPasswordModal from './components/ResetPasswordModal';

const PAGE_SIZE = 20;

export default function ConseillersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isFetching } = useAdvisors({ page, size: PAGE_SIZE, search: debouncedSearch || undefined });
  const advisors = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const createMutation = useCreateAdvisor();
  const updateMutation = useUpdateAdvisor();
  const deleteMutation = useDeleteAdvisor();

  const [modal, setModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; advisor?: Advisor }>({
    isOpen: false,
    mode: 'create',
  });
  const [saving, setSaving] = useState(false);

  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean; advisor?: Advisor }>({
    isOpen: false,
  });
  const [resettingPassword, setResettingPassword] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void>) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };
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

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const handleSave = async (data: { email: string; firstName: string; lastName: string; password: string; phoneNumber: string; jobTitle: string }) => {
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createMutation.mutateAsync({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password,
          phoneNumber: data.phoneNumber || undefined,
          jobTitle: data.jobTitle || undefined,
        });
        toast.success(t('dashboard.conseillers.toast_created'));
      } else if (modal.mode === 'edit' && modal.advisor) {
        await updateMutation.mutateAsync({
          id: modal.advisor.id,
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber || undefined,
            jobTitle: data.jobTitle || undefined,
          },
        });
        toast.success(t('dashboard.conseillers.toast_updated'));
      }
      setModal({ isOpen: false, mode: 'create' });
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.messageKey === 'email-already-in-use') {
        toast.error(t('dashboard.conseillers.toast_email_exists'));
      } else {
        toast.error(t('dashboard.conseillers.toast_save_error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!resetPasswordModal.advisor) return;
    setResettingPassword(true);
    try {
      await updateMutation.mutateAsync({ id: resetPasswordModal.advisor.id, data: { password } });
      toast.success(t('dashboard.conseillers.toast_password_reset'));
      setResetPasswordModal({ isOpen: false });
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.conseillers.toast_password_reset_error'));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDelete = (advisor: Advisor) => {
    openConfirm(
      t('dashboard.conseillers.confirm_delete_title'),
      t('dashboard.conseillers.confirm_delete', { name: `${advisor.firstName} ${advisor.lastName}` }),
      async () => {
        try {
          await deleteMutation.mutateAsync(advisor.id);
          toast.success(t('dashboard.conseillers.toast_deleted'));
        } catch (err) {
          console.error(err);
          toast.error(t('dashboard.conseillers.toast_delete_error'));
        }
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('dashboard.conseillers.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('dashboard.conseillers.subtitle', { count: totalElements })}
          </p>
        </div>
        <button
          onClick={() => setModal({ isOpen: true, mode: 'create' })}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.conseillers.create_button')}
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('dashboard.conseillers.search_placeholder')}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <th className="px-6 py-4">{t('dashboard.conseillers.table.name')}</th>
                <th className="px-6 py-4">{t('dashboard.conseillers.table.contact')}</th>
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
              ) : advisors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-400">
                    <UserCog className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    {t('dashboard.conseillers.table.empty')}
                  </td>
                </tr>
              ) : (
                advisors.map((advisor) => (
                  <tr key={advisor.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                          {advisor.firstName[0]}{advisor.lastName[0]}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{advisor.firstName} {advisor.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{advisor.email}</span>
                        {advisor.phoneNumber && (
                          <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{advisor.phoneNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {advisor.jobTitle || <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => setModal({ isOpen: true, mode: 'edit', advisor })}
                        className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                        title={t('dashboard.conseillers.actions.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setResetPasswordModal({ isOpen: true, advisor })}
                        className="inline-flex p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all cursor-pointer"
                        title={t('dashboard.conseillers.actions.reset_password')}
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(advisor)}
                        className="inline-flex p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                        title={t('dashboard.conseillers.actions.delete')}
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
              {t('dashboard.conseillers.pagination.info', { current: page + 1, total: totalPages, count: totalElements })}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-medium"
              >
                {t('dashboard.conseillers.pagination.prev')}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-xs font-medium"
              >
                {t('dashboard.conseillers.pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      <AdvisorModal
        isOpen={modal.isOpen}
        mode={modal.mode}
        advisor={modal.advisor}
        saving={saving}
        onClose={() => setModal({ isOpen: false, mode: 'create' })}
        onSave={handleSave}
      />

      <ResetPasswordModal
        isOpen={resetPasswordModal.isOpen}
        advisor={resetPasswordModal.advisor}
        saving={resettingPassword}
        onClose={() => setResetPasswordModal({ isOpen: false })}
        onConfirm={handleResetPassword}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}
