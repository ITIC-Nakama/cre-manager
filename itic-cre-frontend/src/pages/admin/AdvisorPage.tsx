import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../utils/titleUtils';
import { Plus, Search, Loader2, Shield, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import {
  useAdvisors, useAdmins, useCreateAdvisor, useUpdateAdvisor, useDeleteAdvisor,
  useDeactivateUser, useReactivateAdvisor,
} from '../../hooks/useAdvisors';
import type { Advisor } from '../../types/models/Advisor';

import ConfirmDialog from '../../components/shared/ConfirmDialog';
import StaffModal from './components/StaffModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import AdvisorTabs, { type Tab } from './components/AdvisorTabs';
import AdvisorTable from './components/AdvisorTable';

const PAGE_SIZE = 20;

export default function AdvisorPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('advisors');
  const [advisorPage, setAdvisorPage] = useState(0);
  const [adminPage, setAdminPage] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Requête distincte pour les Conseillers
  const advisorQuery = useAdvisors({
    page: advisorPage,
    size: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  // 2. Requête distincte pour les Administrateurs
  const adminQuery = useAdmins({
    page: adminPage,
    size: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const isAdminsTab = activeTab === 'admins';
  const activeQuery = isAdminsTab ? adminQuery : advisorQuery;
  const page = isAdminsTab ? adminPage : advisorPage;
  const setPage = isAdminsTab ? setAdminPage : setAdvisorPage;

  const currentList = activeQuery.data?.content ?? [];
  const totalElements = activeQuery.data?.totalElements ?? 0;
  const totalPages = activeQuery.data?.totalPages ?? 1;
  const isLoading = activeQuery.isLoading;
  const isFetching = activeQuery.isFetching;

  const advisorTotalCount = advisorQuery.data?.totalElements ?? 0;
  const adminTotalCount = adminQuery.data?.totalElements ?? 0;

  const createMutation = useCreateAdvisor();
  const updateMutation = useUpdateAdvisor();
  const deleteMutation = useDeleteAdvisor();
  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateAdvisor();

  const [modal, setModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; advisor?: Advisor }>({
    isOpen: false, mode: 'create',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      setModal({ isOpen: true, mode: 'create' });
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean; advisor?: Advisor }>({
    isOpen: false,
  });
  const [resettingPassword, setResettingPassword] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean;
    onConfirm: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => { } });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const getRoleErrorMessage = (err: unknown): string => {
    const e = err as { response?: { data?: { messageKey?: string } } };
    const key = e?.response?.data?.messageKey;
    const map: Record<string, string> = {
      'admin-cap-reached': t('dashboard.conseillers.errors.admin_cap_reached'),
      'cannot-self-deactivate': t('dashboard.conseillers.errors.cannot_self_deactivate'),
      'last-admin-protection': t('dashboard.conseillers.errors.last_admin_protection'),
      'admin-cannot-be-deleted': t('dashboard.conseillers.errors.admin_cannot_be_deleted'),
      'admin-password-reset-forbidden': t('dashboard.conseillers.errors.admin_password_reset_forbidden'),
    };
    return key && map[key] ? map[key] : t('dashboard.conseillers.errors.generic');
  };

  const openConfirm = (
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    opts?: { confirmLabel?: string; danger?: boolean }
  ) => setConfirmDialog({ isOpen: true, title, message, onConfirm, ...opts });

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
    setAdvisorPage(0);
    setAdminPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const handleSave = async (data: {
    email: string; firstName: string; lastName: string;
    password: string; phoneNumber: string; jobTitle: string;
  }) => {
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createMutation.mutateAsync({
          email: data.email, firstName: data.firstName, lastName: data.lastName,
          password: data.password,
          role: isAdminsTab ? 'ADMIN' : 'ADVISOR',
          phoneNumber: data.phoneNumber || undefined,
          jobTitle: data.jobTitle || undefined,
        });
        toast.success(isAdminsTab ? t('dashboard.conseillers.toast_admin_created') : t('dashboard.conseillers.toast_advisor_created'));
      } else if (modal.mode === 'edit' && modal.advisor) {
        await updateMutation.mutateAsync({
          id: modal.advisor.id,
          data: {
            firstName: data.firstName, lastName: data.lastName,
            phoneNumber: data.phoneNumber || undefined,
            jobTitle: data.jobTitle || undefined,
          },
        });
        toast.success(t('dashboard.conseillers.toast_updated'));
      }
      setModal({ isOpen: false, mode: 'create' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { messageKey?: string } } };
      if (e?.response?.data?.messageKey === 'email-already-in-use') {
        toast.error(t('dashboard.conseillers.toast_email_exists'));
      } else if (e?.response?.data?.messageKey === 'admin-cap-reached') {
        toast.error(t('dashboard.conseillers.errors.admin_cap_reached'));
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
    } catch {
      toast.error(t('dashboard.conseillers.toast_password_reset_error'));
    } finally {
      setResettingPassword(false);
    }
  };

  /** DÉSACTIVER (soft) — pour conseillers ET admins */
  const handleDeactivate = (user: Advisor) => {
    const isAdmin = user.role?.name === 'ADMIN';
    const title = isAdmin
      ? t('dashboard.conseillers.confirm_deactivate_admin_title')
      : t('dashboard.conseillers.confirm_delete_title');
    const message = isAdmin
      ? t('dashboard.conseillers.confirm_deactivate_admin_message', { name: `${user.firstName} ${user.lastName}` })
      : t('dashboard.conseillers.confirm_deactivate_user_message', { name: `${user.firstName} ${user.lastName}` });

    openConfirm(
      title,
      message,
      async () => {
        try {
          await deactivateMutation.mutateAsync(user.id);
          toast.success(t('dashboard.conseillers.toast_deactivated_success'));
        } catch (err) {
          toast.error(getRoleErrorMessage(err));
        }
      },
      { confirmLabel: t('dashboard.conseillers.actions.deactivate'), danger: true }
    );
  };

  /** SUPPRIMER (hard/fallback) — conseillers uniquement */
  const handleDelete = (advisor: Advisor) => {
    openConfirm(
      t('dashboard.conseillers.confirm_delete_title'),
      t('dashboard.conseillers.confirm_delete', { name: `${advisor.firstName} ${advisor.lastName}` }),
      async () => {
        try {
          const result = await deleteMutation.mutateAsync(advisor.id);
          toast.success(result.deleted
            ? t('dashboard.conseillers.toast_deleted')
            : t('dashboard.conseillers.toast_deactivated'));
        } catch (err) {
          toast.error(getRoleErrorMessage(err));
        }
      },
      { confirmLabel: t('dashboard.conseillers.actions.delete'), danger: true }
    );
  };

  const handleReactivate = async (user: Advisor) => {
    try {
      await reactivateMutation.mutateAsync(user.id);
      toast.success(t('dashboard.conseillers.toast_reactivated'));
    } catch (err) {
      toast.error(getRoleErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-[#E2762F] shrink-0" />
            {renderTitleWithGradient(t(isAdminsTab ? 'dashboard.admins.title' : 'dashboard.advisors.title', isAdminsTab ? 'Gestion des Administrateurs' : 'Gestion des Conseillers'), 'itic-gradient-blue')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
            {t('dashboard.conseillers.subtitle', { count: totalElements })}
          </p>
        </div>
        <button
          onClick={() => setModal({ isOpen: true, mode: 'create' })}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {isAdminsTab
            ? t('dashboard.conseillers.create_admin_button')
            : t('dashboard.conseillers.create_advisor_button')}
        </button>
      </div>

      <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] flex flex-col gap-4">
        {/* ── Tabs Admin / Conseiller ── */}
        <AdvisorTabs
          activeTab={activeTab}
          advisorTotalCount={advisorTotalCount}
          adminTotalCount={adminTotalCount}
          onSwitchTab={setActiveTab}
        />

        {/* ── Info banner for admins tab ── */}
        {isAdminsTab && (
          <div className="flex items-start gap-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 px-4 py-3 text-sm text-purple-800 dark:text-purple-300">
            <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{t('dashboard.conseillers.governance_banner')}</span>
          </div>
        )}

        {/* ── Search ── */}
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
      </div>

      {/* ── Table ── */}
      <AdvisorTable
        currentList={currentList}
        isLoading={isLoading}
        isAdminsTab={isAdminsTab}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={setPage}
        onEdit={(advisor) => setModal({ isOpen: true, mode: 'edit', advisor })}
        onResetPassword={(advisor) => setResetPasswordModal({ isOpen: true, advisor })}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
        onReactivate={handleReactivate}
      />

      {/* ── Modals ── */}
      <StaffModal
        isOpen={modal.isOpen}
        mode={modal.mode}
        advisor={modal.advisor}
        targetRole={isAdminsTab ? 'ADMIN' : 'ADVISOR'}
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
        confirmLabel={confirmDialog.confirmLabel ?? t('dashboard.conseillers.actions.delete')}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}
