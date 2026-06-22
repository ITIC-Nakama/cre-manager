import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import type { Grade } from '../../../../types/models/Gamification';

interface GradeModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  grade?: Grade;
  saving: boolean;
  initialOrder: number;
  onClose: () => void;
  onSave: (data: { nom: string; xpMinimum: number; ordre: number; icone: string }) => void;
}

export default function GradeModal({
  isOpen,
  mode,
  grade,
  saving,
  initialOrder,
  onClose,
  onSave
}: GradeModalProps) {
  const { t } = useTranslation();
  const [nom, setNom] = useState('');
  const [xpMinimum, setXpMinimum] = useState(0);
  const [ordre, setOrdre] = useState(1);
  const [icone, setIcone] = useState('🏅');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && grade) {
        setNom(grade.nom);
        setXpMinimum(grade.xpMinimum);
        setOrdre(grade.ordre);
        setIcone(grade.icone || '🏅');
      } else {
        setNom('');
        setXpMinimum(0);
        setOrdre(initialOrder);
        setIcone('🏅');
      }
    }
  }, [isOpen, mode, grade, initialOrder]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    onSave({ nom, xpMinimum, ordre, icone });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {mode === 'create' ? t('dashboard.gamification.modal_create_grade') : t('dashboard.gamification.modal_edit_grade')}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.gamification.label_grade_name')}</label>
            <input
              type="text"
              required
              maxLength={50}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder={t('dashboard.gamification.placeholder_grade_name')}
              disabled={saving}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.gamification.label_xp_minimum')}</label>
              <input
                type="number"
                required
                min={0}
                value={xpMinimum}
                onChange={(e) => setXpMinimum(parseInt(e.target.value) || 0)}
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.gamification.label_order')}</label>
              <input
                type="number"
                required
                min={1}
                value={ordre}
                onChange={(e) => setOrdre(parseInt(e.target.value) || 1)}
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.gamification.label_icon')}</label>
            <input
              type="text"
              maxLength={4}
              value={icone}
              onChange={(e) => setIcone(e.target.value)}
              placeholder="🏅"
              disabled={saving}
              className="w-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-2 pt-6 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('dashboard.gamification.btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('dashboard.gamification.btn_save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
