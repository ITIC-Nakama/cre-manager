import { Download, Shield, Smartphone } from 'lucide-react';

interface SecurityCardProps {
  onExport: () => void;
  onChangePassword: () => void;
  onDisconnectOthers: () => void;
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
        onClick={onAction}
        className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-400 cursor-pointer transition-colors shrink-0"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function SecurityCard({ onExport, onChangePassword, onDisconnectOthers }: SecurityCardProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">Données &amp; Sécurité</h2>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">

        <SettingActionRow
          icon={<Download className="h-5 w-5" />}
          title="Exporter mes données"
          subtitle="Télécharger une copie de vos données (JSON/PDF)"
          actionLabel="Exporter"
          onAction={onExport}
        />

        <SettingActionRow
          icon={<Shield className="h-5 w-5" />}
          title="Mot de passe"
          subtitle="Dernière modification il y a 3 mois"
          actionLabel="Modifier"
          onAction={onChangePassword}
        />

        {/* Active Sessions row — no divider inside, owns its own layout */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>

            <div className="flex-1 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1.5">
                Sessions actives
              </h3>

              <div className="space-y-2.5">
                {/* Current session */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Chrome sur MacOS (Actuel)</span>
                  <span className="text-emerald-600 dark:text-emerald-400">En ligne</span>
                </div>

                {/* Previous session */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 dark:text-slate-400">Safari sur iPhone 13</span>
                  <span className="text-slate-400 dark:text-slate-500">Il y a 2h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Disconnect all others */}
          <div className="flex justify-center pt-1">
            <button
              onClick={onDisconnectOthers}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline cursor-pointer transition-colors"
            >
              Déconnecter toutes les autres sessions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
