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
    <div className="flex border-b border-slate-200 dark:border-slate-800">
      <button
        onClick={() => onSwitchTab('advisors')}
        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
          activeTab === 'advisors'
            ? 'border-[#E2762F] text-[#E2762F]'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <UserRound className="h-4 w-4" />
        {t('dashboard.conseillers.tabs.advisors')}
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
          activeTab === 'advisors'
            ? 'bg-[#E2762F]/10 text-[#E2762F]'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          {advisorTotalCount}
        </span>
      </button>

      <button
        onClick={() => onSwitchTab('admins')}
        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
          activeTab === 'admins'
            ? 'border-[#E2762F] text-[#E2762F]'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Shield className="h-4 w-4" />
        {t('dashboard.conseillers.tabs.admins')}
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
          activeTab === 'admins'
            ? 'bg-[#E2762F]/10 text-[#E2762F]'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          {adminTotalCount}
        </span>
      </button>
    </div>
  );
}
