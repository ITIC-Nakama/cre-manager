import { useTranslation } from 'react-i18next';
import { User, Sliders } from 'lucide-react';

export type ParametresTab = 'profile' | 'system';

interface ParametresSubmenuProps {
  activeTab: ParametresTab;
  onTabChange: (tab: ParametresTab) => void;
  showSystemTab: boolean;
}

/**
 * Composant de sous-menu (onglets) pour séparer les paramètres de profil
 * des configurations applicatives globales (pour l'administration).
 */
export default function ParametresSubmenu({
  activeTab,
  onTabChange,
  showSystemTab,
}: ParametresSubmenuProps) {
  const { t } = useTranslation();

  if (!showSystemTab) return null;

  return (
    <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
      <button
        onClick={() => onTabChange('profile')}
        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
          activeTab === 'profile'
            ? 'border-[#E2762F] text-[#E2762F]'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <User className="h-4 w-4" />
        <span>
          {showSystemTab
            ? t('dashboard.parametres.submenus.profile_admin', 'Paramètres')
            : t('dashboard.parametres.submenus.profile', 'Paramètres du Profil')}
        </span>
      </button>

      <button
        onClick={() => onTabChange('system')}
        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
          activeTab === 'system'
            ? 'border-[#E2762F] text-[#E2762F]'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Sliders className="h-4 w-4" />
        <span>{t('dashboard.parametres.submenus.system', 'Configuration Applicative')}</span>
      </button>
    </div>
  );
}
