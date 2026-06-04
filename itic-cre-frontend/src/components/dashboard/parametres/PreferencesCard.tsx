import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../../basics/CustomSelect';

interface PreferencesCardProps {
  notifications: boolean;
  onToggleNotifications: () => void;
}

function SettingRow({ icon, title, subtitle, action }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-5">
      <div className="flex items-center gap-4">
        <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
          {icon}
        </div>
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{subtitle}</p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

const LANG_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

export default function PreferencesCard({ notifications, onToggleNotifications }: PreferencesCardProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language ? i18n.language.split('-')[0] : 'fr';

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">Préférences</h2>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">

        <SettingRow
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          }
          title="Langue"
          subtitle="Langue de l'interface"
          action={
            <CustomSelect
              id="pref-language"
              value={currentLang}
              options={LANG_OPTIONS}
              onChange={(val) => i18n.changeLanguage(val)}
              dropUp={false}
            />
          }
        />

        <SettingRow
          icon={<Bell className="h-5 w-5" />}
          title="Notifications"
          subtitle="Notifications de l'application"
          action={
            <button
              id="toggle-notifications"
              onClick={onToggleNotifications}
              role="switch"
              aria-checked={notifications}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                notifications ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  notifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          }
        />
      </div>
    </div>
  );
}
