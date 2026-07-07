import { Shield } from 'lucide-react';

interface SecurityCardProps {
  onChangePassword: () => void;
}

function SettingActionRow({ icon, title, subtitle, actionLabel, onAction }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-5">
      <div className="flex items-center gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 shrink-0">
          {icon}
        </div>
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{subtitle}</p>
        </div>
      </div>
      <button
        data-cy="btn-change-password"
        onClick={onAction}
        className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-400 cursor-pointer transition-colors shrink-0"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function SecurityCard({ onChangePassword }: SecurityCardProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">Sécurité</h2>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <SettingActionRow
          icon={<Shield className="h-5 w-5" />}
          title="Mot de passe"
          subtitle="Modifiez le mot de passe de votre compte"
          actionLabel="Modifier"
          onAction={onChangePassword}
        />
      </div>
    </div>
  );
}

