import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../utils/titleUtils';
import { useNavigate } from 'react-router-dom';
import { LogOut, X, ShieldAlert, Eye, EyeOff, Settings } from 'lucide-react';
import { useUserStore } from '../../store/UserStore';
import { toast } from 'sonner';
import ProfileCard from '../../components/dashboard/parametres/ProfileCard';
import PreferencesCard from '../../components/dashboard/parametres/PreferencesCard';
import SecurityCard from '../../components/dashboard/parametres/SecurityCard';
import GdprCard from '../../components/dashboard/parametres/GdprCard';
import AppConfigCard from '../../components/dashboard/parametres/AppConfigCard';
import ParametresSubmenu, { type ParametresTab } from '../../components/dashboard/parametres/ParametresSubmenu';
import { useUpdatePassword } from '../../hooks/useAuth';
import { Role } from '../../types/models/Auth';

export default function ParametresPage() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const navigate = useNavigate();
  const { mutate: updatePassword, isPending } = useUpdatePassword();

  // Onglet actif : 'profile' (mon profil) ou 'system' (configuration applicative)
  const [activeTab, setActiveTab] = useState<ParametresTab>('profile');

  const isAdmin = user?.role === Role.ADMIN;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed, clearing local user state:', error);
      useUserStore.getState().clearUser();
    } finally {
      navigate('/login');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('dashboard.parametres.password_modal.toast_fill_all'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('dashboard.parametres.password_modal.toast_min_length'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('dashboard.parametres.password_modal.toast_mismatch'));
      return;
    }

    updatePassword(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success(t('dashboard.parametres.password_modal.toast_success'));
          setModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.message || t('dashboard.parametres.password_modal.toast_error');
          toast.error(errMsg);
        }
      }
    );
  };

  return (
    <div id="parametres-page" className="flex flex-col gap-6 animate-fadeIn">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-[#E2762F] shrink-0" />
          {renderTitleWithGradient(t('dashboard.pages.parametres.title', 'Paramètres du Compte'), 'itic-gradient-blue')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
          {t('dashboard.pages.parametres.description')}
        </p>
      </div>

      {/* Sous-menu / Onglets pour basculer entre le profil et la configuration système */}
      <ParametresSubmenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSystemTab={isAdmin}
      />

      {activeTab === 'profile' ? (
        <>
          <ProfileCard />

          <PreferencesCard />

          <SecurityCard onChangePassword={() => setModalOpen(true)} />

          <GdprCard />

          {/* Bottom logout button */}
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <LogOut className="h-4 w-4" />
            <span>{t('dashboard.parametres.logout')}</span>
          </button>
        </>
      ) : (
        <AppConfigCard />
      )}

      {/* Modal Overlay for Password Change */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 animate-fadeIn">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-xl p-6 overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-500" />
                {t('dashboard.parametres.password_modal.title')}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">

              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('dashboard.parametres.password_modal.label_current')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-450 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('dashboard.parametres.password_modal.label_new')}
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-450 hover:text-slate-600 cursor-pointer"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('dashboard.parametres.password_modal.label_confirm')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-450 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  {t('dashboard.parametres.password_modal.btn_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending
                    ? t('dashboard.parametres.password_modal.btn_saving')
                    : t('dashboard.parametres.password_modal.btn_save')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
