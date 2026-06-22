import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2 } from 'lucide-react';
import type { GamificationConfig } from '../../../../types/models/Gamification';

interface ConfigRowProps {
  config: GamificationConfig;
  saving: boolean;
  onSave: (id: string, data: { valeurXP: number; active: boolean }) => void;
}

export default function ConfigRow({ config, saving, onSave }: ConfigRowProps) {
  const { t } = useTranslation();
  const [valeurXP, setValeurXP] = useState(config.valeurXP);
  const [active, setActive] = useState(config.active);

  useEffect(() => {
    setValeurXP(config.valeurXP);
    setActive(config.active);
  }, [config.valeurXP, config.active]);

  const dirty = valeurXP !== config.valeurXP || active !== config.active;

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <td className="py-4 px-6">
        <p className="font-semibold text-slate-900 dark:text-white">{t(`dashboard.gamification.action.${config.action}`)}</p>
      </td>
      <td className="py-4 px-6">
        <input
          type="number"
          min={0}
          value={valeurXP}
          onChange={(e) => setValeurXP(parseInt(e.target.value) || 0)}
          disabled={saving}
          className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60"
        />
        <span className="ml-1.5 text-xs text-slate-400">XP</span>
      </td>
      <td className="py-4 px-6">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={saving}
            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer disabled:opacity-50"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">{t('dashboard.gamification.label_active')}</span>
        </label>
      </td>
      <td className="py-4 px-6 text-right">
        <button
          onClick={() => onSave(config.id, { valeurXP, active })}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {t('dashboard.gamification.btn_save')}
        </button>
      </td>
    </tr>
  );
}
