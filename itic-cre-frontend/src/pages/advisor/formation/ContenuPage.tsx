import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Folder, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useAdminArticles,
  useCreateArticle,
  useUpdateArticle,
  useDeleteArticle,
  useCreateQuizForArticle,
  useUpdateQuiz,
  useDeleteQuiz,
} from '../../../hooks/useSkills';

import type { SkillCategory, Question } from '../../../types/models/Skill';

import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import FormationHeader from './components/FormationHeader';
import ArticlesTabContent from './components/ArticlesTabContent';
import CategoriesTabContent from './components/CategoriesTabContent';
import CategoryModal from './components/CategoryModal';
import ArticleModal from './components/ArticleModal';
import QuizModal from './components/QuizModal';

export default function ContenuPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'articles' | 'categories'>('articles');

  // React Query Hooks
  const { data: categories = [], isLoading: loadingCategories } = useAdminCategories();
  const { data: articles = [], isLoading: loadingArticles } = useAdminArticles();
  const loading = loadingCategories || loadingArticles;

  // Mutations
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const createArticleMutation = useCreateArticle();
  const updateArticleMutation = useUpdateArticle();
  const deleteArticleMutation = useDeleteArticle();
  const createQuizMutation = useCreateQuizForArticle();
  const updateQuizMutation = useUpdateQuiz();
  const deleteQuizMutation = useDeleteQuiz();

  // Modals States
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    category?: SkillCategory;
  }>({ isOpen: false, mode: 'create' });

  const [articleModal, setArticleModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    articleId?: string;
  }>({ isOpen: false, mode: 'create' });

  const [quizModal, setQuizModal] = useState<{
    isOpen: boolean;
    articleId?: string;
    articleTitle?: string;
  }>({ isOpen: false });

  const [saving, setSaving] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => { } });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void>) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

  const handleConfirm = async () => {
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
      closeConfirm();
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── CATEGORY HANDLERS ──────────────────────────────────────────────────────
  const handleSaveCategory = async (data: { nom: string; description: string; ordre: number; icone: string; actif: boolean }) => {
    setSaving(true);
    try {
      if (categoryModal.mode === 'create') {
        await createCategoryMutation.mutateAsync(data);
        toast.success(t('dashboard.formation.toast_category_created'));
      } else if (categoryModal.mode === 'edit' && categoryModal.category) {
        await updateCategoryMutation.mutateAsync({ id: categoryModal.category.id, data });
        toast.success(t('dashboard.formation.toast_category_updated'));
      }
      setCategoryModal({ isOpen: false, mode: 'create' });
    } catch {
      toast.error(t('dashboard.formation.toast_category_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (categoryId: string, name: string) => {
    if (articles.some((art) => art.categoryId === categoryId)) {
      toast.error(t('dashboard.formation.toast_category_has_articles'));
      return;
    }
    openConfirm(
      t('dashboard.formation.confirm_delete_category_title'),
      t('dashboard.formation.confirm_delete_category', { name }),
      async () => {
        try {
          await deleteCategoryMutation.mutateAsync(categoryId);
          toast.success(t('dashboard.formation.toast_category_deleted'));
        } catch {
          toast.error(t('dashboard.formation.toast_category_delete_error'));
        }
      }
    );
  };

  // ── ARTICLE HANDLERS ───────────────────────────────────────────────────────
  const handleSaveArticle = async (data: { titre: string; contenu: string; categorieId: string; ordre: number; actif: boolean }) => {
    setSaving(true);
    try {
      if (articleModal.mode === 'create') {
        await createArticleMutation.mutateAsync(data);
        toast.success(t('dashboard.formation.toast_article_created'));
      } else if (articleModal.mode === 'edit' && articleModal.articleId) {
        await updateArticleMutation.mutateAsync({ id: articleModal.articleId, data });
        toast.success(t('dashboard.formation.toast_article_updated'));
      }
      setArticleModal({ isOpen: false, mode: 'create' });
    } catch {
      toast.error(t('dashboard.formation.toast_article_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = (articleId: string, title: string) => {
    openConfirm(
      t('dashboard.formation.confirm_delete_article_title'),
      t('dashboard.formation.confirm_delete_article', { title }),
      async () => {
        try {
          await deleteArticleMutation.mutateAsync(articleId);
          toast.success(t('dashboard.formation.toast_article_deleted'));
        } catch {
          toast.error(t('dashboard.formation.toast_article_delete_error'));
        }
      }
    );
  };

  // ── QUIZ HANDLERS ──────────────────────────────────────────────────────────
  const handleSaveQuiz = async (data: { scoreMinimum: number; questions: Omit<Question, 'id'>[] }, quizId?: string) => {
    if (!quizModal.articleId) return;
    setSaving(true);
    try {
      if (quizId) {
        await updateQuizMutation.mutateAsync({ id: quizId, data });
        toast.success(t('dashboard.formation.toast_quiz_updated'));
      } else {
        await createQuizMutation.mutateAsync({ articleId: quizModal.articleId, data });
        toast.success(t('dashboard.formation.toast_quiz_created'));
      }
      setQuizModal({ isOpen: false });
    } catch {
      toast.error(t('dashboard.formation.toast_quiz_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = (quizId: string) => {
    openConfirm(
      t('dashboard.formation.confirm_delete_quiz_title'),
      t('dashboard.formation.confirm_delete_quiz'),
      async () => {
        setSaving(true);
        try {
          await deleteQuizMutation.mutateAsync({ id: quizId, articleId: quizModal.articleId });
          toast.success(t('dashboard.formation.toast_quiz_deleted'));
          setQuizModal({ isOpen: false });
        } catch {
          toast.error(t('dashboard.formation.toast_quiz_delete_error'));
        } finally {
          setSaving(false);
        }
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn text-slate-800 dark:text-slate-100">
      <FormationHeader />

      {/* Tabs Selector */}
      <div className="sticky top-0 z-10 bg-slate-50 dark:bg-[#020203] py-2 flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'articles'
              ? 'border-[#E2762F] text-[#E2762F]'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
            }`}
        >
          <BookOpen className="h-4 w-4" />
          {t('dashboard.formation.tab_articles')}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'categories'
              ? 'border-[#E2762F] text-[#E2762F]'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
            }`}
        >
          <Folder className="h-4 w-4" />
          {t('dashboard.formation.tab_categories')}
        </button>
      </div>

      {/* Main Content Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm">{t('dashboard.formation.loading')}</p>
          </div>
        ) : activeTab === 'articles' ? (
          <ArticlesTabContent
            articles={articles}
            onCreateArticle={() => setArticleModal({ isOpen: true, mode: 'create' })}
            onQuizClick={(id, title) => setQuizModal({ isOpen: true, articleId: id, articleTitle: title })}
            onEditClick={(id) => setArticleModal({ isOpen: true, mode: 'edit', articleId: id })}
            onDeleteClick={handleDeleteArticle}
          />
        ) : (
          <CategoriesTabContent
            categories={categories}
            articles={articles}
            onCreateCategory={() => setCategoryModal({ isOpen: true, mode: 'create' })}
            onEditCategory={(category) => setCategoryModal({ isOpen: true, mode: 'edit', category })}
            onDeleteCategory={handleDeleteCategory}
          />
        )}
      </div>

      {/* Modals */}
      <CategoryModal
        isOpen={categoryModal.isOpen}
        mode={categoryModal.mode}
        category={categoryModal.category}
        saving={saving}
        initialOrder={categories.length > 0 ? Math.max(...categories.map((c) => c.ordre)) + 1 : 1}
        onClose={() => setCategoryModal({ isOpen: false, mode: 'create' })}
        onSave={handleSaveCategory}
      />

      <ArticleModal
        isOpen={articleModal.isOpen}
        mode={articleModal.mode}
        articleId={articleModal.articleId}
        categories={categories}
        articles={articles}
        saving={saving}
        onClose={() => setArticleModal({ isOpen: false, mode: 'create' })}
        onSave={handleSaveArticle}
      />

      <QuizModal
        isOpen={quizModal.isOpen}
        articleId={quizModal.articleId}
        articleTitle={quizModal.articleTitle}
        saving={saving}
        onClose={() => setQuizModal({ isOpen: false })}
        onSave={handleSaveQuiz}
        onDelete={handleDeleteQuiz}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}
