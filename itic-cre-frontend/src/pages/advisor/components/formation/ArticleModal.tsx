import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminArticleById } from '../../../../api-s/requests/SkillRequest';
import TiptapEditor from '../../../../components/basics/TiptapEditor';
import CustomSelect from '../../../../components/basics/CustomSelect';
import type { SkillCategory } from '../../../../types/models/Skill';

interface ArticleModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  articleId?: string;
  categories: SkillCategory[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: { titre: string; contenu: string; categorieId: string; actif: boolean }) => void;
}

export default function ArticleModal({
  isOpen,
  mode,
  articleId,
  categories,
  saving,
  onClose,
  onSave
}: ArticleModalProps) {
  const { t } = useTranslation();
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [categorieId, setCategorieId] = useState('');
  const [actif, setActif] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize form state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'create') {
      setTitre('');
      setContenu('');
      setActif(false);
      if (categories.length > 0) {
        setCategorieId(categories[0].id);
      } else {
        setCategorieId('');
      }
    } else if (mode === 'edit' && articleId) {
      const loadArticle = async () => {
        setLoading(true);
        try {
          const art = await fetchAdminArticleById(articleId);
          setTitre(art.titre);
          setContenu(art.contenu);
          setCategorieId(art.categoryId);
          setActif(art.actif ?? true);
        } catch (err) {
          console.error(err);
          toast.error(t('dashboard.formation.toast_article_load_error'));
          onClose();
        } finally {
          setLoading(false);
        }
      };
      loadArticle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Set default category when categories list loads/changes, but only if not currently set in create mode
  useEffect(() => {
    if (isOpen && mode === 'create' && !categorieId && categories.length > 0) {
      setCategorieId(categories[0].id);
    }
  }, [isOpen, mode, categories, categorieId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) {
      toast.error(t('dashboard.formation.toast_title_required'));
      return;
    }
    if (titre.length > 150) {
      toast.error(t('dashboard.formation.toast_title_too_long', 'Le titre ne doit pas dépasser 150 caractères'));
      return;
    }
    if (!contenu.trim()) {
      toast.error(t('dashboard.formation.toast_content_required'));
      return;
    }
    if (!categorieId) {
      toast.error(t('dashboard.formation.toast_select_category'));
      return;
    }
    onSave({ titre, contenu, categorieId, actif });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-7xl w-full h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {mode === 'create' ? t('dashboard.formation.modal_create_article') : t('dashboard.formation.modal_edit_article')}
          </h3>
          <button 
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm">{t('dashboard.formation.loading')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 md:p-8 gap-6 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.formation.label_title_article')} <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder={t('dashboard.formation.placeholder_article_title')}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.formation.col_category')} <span className="text-rose-500">*</span></label>
                <CustomSelect
                  value={categorieId}
                  options={categories.map(cat => ({ value: cat.id, label: cat.nom }))}
                  onChange={(val) => setCategorieId(val)}
                  disabled={saving}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[400px]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.formation.label_content_article')} <span className="text-rose-500">*</span></label>
              <div className="flex-1 min-h-0">
                <TiptapEditor
                  value={contenu} 
                  onChange={(html) => setContenu(html)} 
                  readOnly={saving}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-6 mt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="art-active"
                  checked={actif}
                  onChange={(e) => setActif(e.target.checked)}
                  disabled={saving}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="art-active" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  {t('dashboard.formation.label_active_article')}
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
