import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sliders, Save, Loader2, Info, Clock, Calendar, KeyRound, History, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useAppConfigurations, useUpdateAppConfiguration } from '../../../hooks/useAppConfig';
import type { AppConfiguration } from '../../../types/models/AppConfig';

/**
 * Composant de carte pour la gestion des paramètres de configuration applicative
 * (réservé aux Administrateurs et Conseillers habilités).
 */
export default function AppConfigCard() {
  const { t } = useTranslation();
  const { data: configs, isLoading } = useAppConfigurations();
  const updateMutation = useUpdateAppConfiguration();

  // État local pour gérer les modifications des valeurs de configuration
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const handleInputChange = (id: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async (config: AppConfiguration) => {
    const val = editedValues[config.id] ?? config.value;
    try {
      await updateMutation.mutateAsync({
        id: config.id,
        payload: { value: val, description: config.description },
      });
      toast.success(t('dashboard.parametres.app_config.toast_success', 'Configuration mise à jour avec succès !'));
    } catch {
      toast.error(t('dashboard.parametres.app_config.toast_error', 'Échec de la mise à jour de la configuration.'));
    }
  };

  // Helper pour retourner une icône contextuelle en fonction de la clé de configuration
  const getConfigIcon = (key: string) => {
    if (key === 'STALE_ALERT_DAYS') return <Clock className="h-4 w-4 text-amber-500" />;
    if (key === 'PROMOTION_REMINDER_MONTHS') return <Calendar className="h-4 w-4 text-[#3B71FF]" />;
    if (key === 'GDPR_OTP_RETENTION_HOURS') return <KeyRound className="h-4 w-4 text-emerald-500" />;
    if (key === 'GDPR_AUDIT_LOG_RETENTION_DAYS') return <History className="h-4 w-4 text-[#3B71FF]" />;
    if (key === 'GDPR_INACTIVE_STUDENT_RETENTION_DAYS') return <UserX className="h-4 w-4 text-rose-500" />;
    return <Sliders className="h-4 w-4 text-[#3B71FF]" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <Loader2 className="h-6 w-6 text-[#3B71FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[#3B71FF]" />
            {t('dashboard.parametres.app_config.title', 'Configuration Applicative Système')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboard.parametres.app_config.description', 'Ajustez les seuils applicatifs globaux du backend (alertes de relance, règles de promotion).')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {configs && configs.length > 0 ? (
          configs.map((config) => {
            const currentValue = editedValues[config.id] ?? config.value;
            const hasChanged = currentValue !== config.value;

            return (
              <div
                key={config.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
              >
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    {getConfigIcon(config.key)}
                    <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">
                      {config.key}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t(`dashboard.parametres.app_config.keys.${config.key}`, { defaultValue: config.description || 'Paramètre de configuration backend' })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      value={currentValue}
                      onChange={(e) => handleInputChange(config.id, e.target.value)}
                      className="w-28 px-3 py-1.5 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3B71FF]"
                    />
                  </div>

                  <button
                    onClick={() => handleSave(config)}
                    disabled={!hasChanged || updateMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#3B71FF] hover:bg-[#2b5de5] text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>{t('dashboard.parametres.app_config.btn_save', 'Enregistrer')}</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-2 p-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
            <Info className="h-4 w-4" />
            <span>{t('dashboard.parametres.app_config.empty', 'Aucune configuration à afficher.')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
