import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import CustomSelect from '../../../../components/basics/CustomSelect';
import type { SkillCategory } from '../../../../types/models/Skill';

interface CategoryModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  category?: SkillCategory;
  saving: boolean;
  initialOrder: number;
  onClose: () => void;
  onSave: (data: { nom: string; description: string; ordre: number; icone: string; actif: boolean }) => void;
}

export default function CategoryModal({
  isOpen,
  mode,
  category,
  saving,
  initialOrder,
  onClose,
  onSave
}: CategoryModalProps) {
  const { t } = useTranslation();
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [ordre, setOrdre] = useState(1);
  const [icone, setIcone] = useState('📄');
  const [actif, setActif] = useState(true);

  const emojiMap: Record<string, string> = {
    'book': '📄',
    'folder': '💼',
    'award': '🎓',
    'help': '💬',
    'sparkles': '🚀'
  };

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && category) {
        setNom(category.nom);
        setDescription(category.description || '');
        setOrdre(category.ordre);
        const mappedIcon = emojiMap[category.icone] || category.icone || '📄';
        setIcone(mappedIcon);
        setActif(category.actif);
      } else {
        setNom('');
        setDescription('');
        setOrdre(initialOrder);
        setIcone('📄');
        setActif(true);
      }
    }
  }, [isOpen, mode, category, initialOrder]);

  if (!isOpen) return null;

  const categoryIcons = [
    { value: '📄', label: `${t('dashboard.formation.icon_cv')} 📄` },
    { value: '💬', label: `${t('dashboard.formation.icon_interview')} 💬` },
    { value: '💼', label: `${t('dashboard.formation.icon_search')} 💼` },
    { value: '🎯', label: `${t('dashboard.formation.icon_goals')} 🎯` },
    { value: '🎓', label: `${t('dashboard.formation.icon_skills')} 🎓` },
    { value: '💡', label: `Astuces & Conseils 💡` },
    { value: '🚀', label: `Motivation & Lancement 🚀` }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ nom, description, ordre, icone, actif });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {mode === 'create' ? t('dashboard.formation.modal_create_category') : t('dashboard.formation.modal_edit_category')}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.formation.label_name')}</label>
            <input
              type="text"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder={t('dashboard.formation.placeholder_category_name')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.formation.label_description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('dashboard.formation.placeholder_category_description')}
              rows={6}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.formation.label_order')}</label>
              <input
                type="number"
                required
                min={1}
                value={ordre}
                onChange={(e) => setOrdre(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.formation.label_icon')}</label>
              <CustomSelect
                value={icone}
                options={categoryIcons}
                onChange={(val) => setIcone(val)}
                className="w-full"
              />
            </div>
          </div>

          {mode === 'edit' && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                id="cat-active"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="cat-active" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                {t('dashboard.formation.label_active_category')}
              </label>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('dashboard.formation.btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('dashboard.formation.btn_save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
