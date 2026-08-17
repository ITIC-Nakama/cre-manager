import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Check } from 'lucide-react';
import type { Promotion, PromotionData } from '../../../types/models/Promotion';

interface PromotionModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  promotion?: Promotion;
  saving: boolean;
  onClose: () => void;
  onSave: (data: PromotionData) => void;
}

const ALL_YEARS = [1, 2, 3, 4, 5];

export default function PromotionModal({ isOpen, mode, promotion, saving, onClose, onSave }: PromotionModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [hasYears, setHasYears] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([1, 2]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && promotion) {
        setName(promotion.name);
        setYear(promotion.year || '');
        setHasYears(promotion.hasYears ?? false);
        setAvailableYears(promotion.availableYears && promotion.availableYears.length > 0 ? promotion.availableYears : [1, 2]);
      } else {
        setName('');
        setYear('');
        setHasYears(false);
        setAvailableYears([1, 2]);
      }
    }
  }, [isOpen, mode, promotion]);

  if (!isOpen) return null;

  const toggleYear = (y: number) => {
    setAvailableYears((prev) => {
      if (prev.includes(y)) {
        if (prev.length === 1) return prev; // Keep at least one year
        return prev.filter((item) => item !== y).sort((a, b) => a - b);
      }
      return [...prev, y].sort((a, b) => a - b);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      year: year.trim() || undefined,
      hasYears,
      availableYears: hasYears ? availableYears : [],
    });
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

          {/* Has Years Switch */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('dashboard.promotions.has_years_label')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('dashboard.promotions.has_years_desc')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hasYears}
                disabled={saving}
                onClick={() => setHasYears((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasYears ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                style={{ borderRadius: '9999px' }}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-md transition-transform duration-200 ease-in-out ${
                    hasYears ? 'translate-x-5' : 'translate-x-0'
                  }`}
                  style={{ backgroundColor: '#ffffff', borderRadius: '9999px' }}
                />
              </button>
            </div>

            {/* Available Years Multi-Select */}
            {hasYears && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-2 animate-fadeIn">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t('dashboard.promotions.available_years_label')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_YEARS.map((y) => {
                    const isSelected = availableYears.includes(y);
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => toggleYear(y)}
                        disabled={saving}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {t(`study_years.year_${y}`, `${y}e année`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
