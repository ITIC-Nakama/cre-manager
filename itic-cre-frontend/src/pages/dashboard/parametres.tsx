import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useUserStore } from '../../store/UserStore';
import { toast } from 'sonner';
import PreferencesCard from '../../components/dashboard/parametres/PreferencesCard';
import SecurityCard from '../../components/dashboard/parametres/SecurityCard';
import DangerZoneCard from '../../components/dashboard/parametres/DangerZoneCard';

export default function ParametresPage() {
  const { t } = useTranslation();
  const logout = useUserStore((state) => state.logout);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed, clearing local user state:', error);
      useUserStore.getState().clearUser();
    } finally {
      navigate('/');
    }
  };

  const handleExportData = () => {
    toast.success('Export de vos données lancé (JSON).');
  };

  const handleChangePassword = () => {
    toast.info('Redirection vers la modification du mot de passe.');
  };

  const handleDisconnectOthers = () => {
    toast.success('Toutes les autres sessions ont été déconnectées.');
  };

  const handleDeleteAccount = () => {
    toast.error('Demande de suppression de compte envoyée.');
  };

  return (
    <div id="parametres-page" className="space-y-6 max-w-4xl mx-auto pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">

      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {t('dashboard.pages.parametres.title', 'Paramètres')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          {t('dashboard.pages.parametres.description', 'Gérez vos préférences et la sécurité de votre compte.')}
        </p>
      </div>

      <PreferencesCard
        notifications={notifications}
        onToggleNotifications={() => setNotifications((n) => !n)}
      />

      <SecurityCard
        onExport={handleExportData}
        onChangePassword={handleChangePassword}
        onDisconnectOthers={handleDisconnectOthers}
      />

      <DangerZoneCard onDeleteAccount={handleDeleteAccount} />

      {/* Bottom logout button */}
      <button
        id="btn-logout"
        onClick={handleLogout}
        className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
      >
        <LogOut className="h-4 w-4" />
        <span>Se déconnecter</span>
      </button>
    </div>
  );
}
