import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import type { Promotion } from '../../../api-s/requests/PromotionRequest';

interface PromotionModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  promotion?: Promotion;
  saving: boolean;
  onClose: () => void;
  onSave: (data: { name: string; year: string }) => void;
}

export default function PromotionModal({ isOpen, mode, promotion, saving, onClose, onSave }: PromotionModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && promotion) {
        setName(promotion.name);
        setYear(promotion.year || '');
      } else {
        setName('');
        setYear('');
      }
    }
  }, [isOpen, mode, promotion]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, year });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {mode === 'create' ? t('dashboard.promotions.modal_create') : t('dashboard.promotions.modal_edit')}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.promotions.label_name')} <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('dashboard.promotions.placeholder_name')}
              disabled={saving}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.promotions.label_year')}</label>
            <input
              type="text"
              maxLength={20}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder={t('dashboard.promotions.placeholder_year')}
              disabled={saving}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end gap-3 mt-2 pt-6 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('dashboard.promotions.btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('dashboard.promotions.btn_save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
