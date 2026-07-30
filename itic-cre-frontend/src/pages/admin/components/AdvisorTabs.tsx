import { useTranslation } from 'react-i18next';
import { UserRound, Shield } from 'lucide-react';

export type Tab = 'advisors' | 'admins';

interface AdvisorTabsProps {
  activeTab: Tab;
  advisorTotalCount: number;
  adminTotalCount: number;
  onSwitchTab: (tab: Tab) => void;
}

export default function AdvisorTabs({
  activeTab,
  advisorTotalCount,
  adminTotalCount,
  onSwitchTab,
}: AdvisorTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
      <button
        onClick={() => onSwitchTab('advisors')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
          activeTab === 'advisors'
            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <UserRound className="h-4 w-4" />
        {t('dashboard.conseillers.tabs.advisors')}
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
          activeTab === 'advisors'
            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          {advisorTotalCount}
        </span>
      </button>

      <button
        onClick={() => onSwitchTab('admins')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
          activeTab === 'admins'
            ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Shield className="h-4 w-4" />
        {t('dashboard.conseillers.tabs.admins')}
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
          activeTab === 'admins'
            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          {adminTotalCount}
        </span>
      </button>
    </div>
  );
}
