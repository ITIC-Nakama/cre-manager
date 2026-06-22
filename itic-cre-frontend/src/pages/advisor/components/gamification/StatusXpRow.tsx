

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2 } from 'lucide-react';

interface StatusLike {
  id: string;
  nom: string;
  couleur: string | null;
  gainXP: number;
}

interface StatusXpRowProps {
  status: StatusLike;
  saving: boolean;
  onSave: (id: string, data: { gainXP: number }) => void;
}

export default function StatusXpRow({ status, saving, onSave }: StatusXpRowProps) {
  const { t } = useTranslation();
  const [gainXP, setGainXP] = useState(status.gainXP);

  useEffect(() => {
    setGainXP(status.gainXP);
  }, [status.gainXP]);

  const dirty = gainXP !== status.gainXP;

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <td className="py-4 px-6">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: status.couleur || '#94a3b8' }}
          />
          <span className="font-semibold text-slate-900 dark:text-white">{status.nom}</span>
        </span>
      </td>
      <td className="py-4 px-6">
        <input
          type="number"
          min={0}
          value={gainXP}
          onChange={(e) => setGainXP(parseInt(e.target.value) || 0)}
          disabled={saving}
          className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60"
        />
        <span className="ml-1.5 text-xs text-slate-400">XP</span>
      </td>
      <td className="py-4 px-6 text-right">
        <button
          onClick={() => onSave(status.id, { gainXP })}
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
