import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SwitchLanguage from '../basics/SwitchLanguage';
import ToggleDarkMode from '../basics/ToggleDarkMode';

export default function DashboardHeader() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 w-full mb-8">
      {/* Dark Mode Toggle */}
      <ToggleDarkMode />

      {/* Language Switcher */}
      <SwitchLanguage />

      {/* Profile button */}
      <Link
        id="btn-my-account"
        to="/dashboard/profil"
        className="inline-flex items-center gap-2 rounded-full cursor-pointer border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800 focus:outline-none"
      >
        <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span>{t('dashboard.home.my_account', 'Mon Compte')}</span>
      </Link>
    </div>
  );
}
