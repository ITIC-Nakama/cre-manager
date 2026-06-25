import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, BookOpen, Folder, Loader2 } from 'lucide-react';
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
  useDeleteQuiz
} from '../../hooks/useSkills';

import type { SkillCategory, Question } from '../../types/models/Skill';

// Subcomponents
import CategoryCard from '../../components/shared/CategoryCard';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import CategoryModal from './components/formation/CategoryModal';
import ArticleModal from './components/formation/ArticleModal';
import QuizModal from './components/formation/QuizModal';
import ArticlesTable from './components/formation/ArticlesTable';

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
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => {} });
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
        await createCategoryMutation.mutateAsync({
          nom: data.nom,
          description: data.description,
          ordre: data.ordre,
          icone: data.icone
        });
        toast.success(t('dashboard.formation.toast_category_created'));
      } else if (categoryModal.mode === 'edit' && categoryModal.category) {
        await updateCategoryMutation.mutateAsync({
          id: categoryModal.category.id,
          data: data
        });
        toast.success(t('dashboard.formation.toast_category_updated'));
      }
      setCategoryModal({ isOpen: false, mode: 'create' });
    } catch (err) {
      console.error(err);
      toast.error(t('dashboard.formation.toast_category_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (categoryId: string, name: string) => {
    const hasArticles = articles.some(art => art.categoryId === categoryId);
    if (hasArticles) {
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
        } catch (err: any) {
          console.error(err);
          if (err.response?.data?.messageKey === 'category-has-articles') {
            toast.error(t('dashboard.formation.toast_category_has_articles'));
          } else {
            toast.error(t('dashboard.formation.toast_category_delete_error'));
          }
        }
      }
    );
  };

  // ── ARTICLE HANDLERS ───────────────────────────────────────────────────────

  const handleSaveArticle = async (data: { titre: string; contenu: string; categorieId: string; actif: boolean }) => {
    setSaving(true);
    try {
      if (articleModal.mode === 'create') {
        await createArticleMutation.mutateAsync({
          titre: data.titre,
          contenu: data.contenu,
          categorieId: data.categorieId,
          actif: data.actif
        });
        toast.success(t('dashboard.formation.toast_article_created'));
      } else if (articleModal.mode === 'edit' && articleModal.articleId) {
        await updateArticleMutation.mutateAsync({
          id: articleModal.articleId,
          data: data
        });
        toast.success(t('dashboard.formation.toast_article_updated'));
      }
      setArticleModal({ isOpen: false, mode: 'create' });
    } catch (err) {
      console.error(err);
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
        } catch (err: any) {
          console.error(err);
          if (err.response?.data?.messageKey === 'article-has-quiz') {
            toast.error(t('dashboard.formation.toast_article_has_quiz'));
          } else {
            toast.error(t('dashboard.formation.toast_article_delete_error'));
          }
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
        await updateQuizMutation.mutateAsync({
          id: quizId,
          data
        });
        toast.success(t('dashboard.formation.toast_quiz_updated'));
      } else {
        await createQuizMutation.mutateAsync({
          articleId: quizModal.articleId,
          data
        });
        toast.success(t('dashboard.formation.toast_quiz_created'));
      }
      setQuizModal({ isOpen: false });
    } catch (err) {
      console.error(err);
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
          await deleteQuizMutation.mutateAsync({
            id: quizId,
            articleId: quizModal.articleId
          });
          toast.success(t('dashboard.formation.toast_quiz_deleted'));
          setQuizModal({ isOpen: false });
        } catch (err: any) {
          console.error(err);
          if (err.response?.data?.messageKey === 'quiz-has-validations') {
            toast.error(t('dashboard.formation.toast_quiz_has_validations'));
          } else {
            toast.error(t('dashboard.formation.toast_quiz_delete_error'));
          }
        } finally {
          setSaving(false);
        }
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            {t('dashboard.formation.title')}
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
              {t('dashboard.formation.badge')}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.formation.subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'articles'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          {t('dashboard.formation.tab_articles')}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
          }`}
        >
          <Folder className="h-4 w-4" />
          {t('dashboard.formation.tab_categories')}
        </button>
      </div>

      {/* Content Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm p-6">
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm">{t('dashboard.formation.loading')}</p>
          </div>
        )}

        {!loading && activeTab === 'articles' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.formation.articles_list')}</h2>
              <button
                onClick={() => setArticleModal({ isOpen: true, mode: 'create' })}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {t('dashboard.formation.create_article')}
              </button>
            </div>

            <ArticlesTable 
              articles={articles}
              onQuizClick={(id, title) => setQuizModal({ isOpen: true, articleId: id, articleTitle: title })}
              onEditClick={(id) => setArticleModal({ isOpen: true, mode: 'edit', articleId: id })}
              onDeleteClick={handleDeleteArticle}
            />
          </div>
        )}

        {!loading && activeTab === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.formation.categories_list')}</h2>
              <button
                onClick={() => setCategoryModal({ isOpen: true, mode: 'create' })}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {t('dashboard.formation.create_category')}
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <Folder className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-base font-semibold">{t('dashboard.formation.no_categories')}</p>
                <p className="text-sm">{t('dashboard.formation.no_categories_desc')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => {
                  const articlesCount = articles.filter(art => art.categoryId === cat.id).length;
                  return (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      articlesCount={articlesCount}
                      onEdit={(category) => setCategoryModal({ isOpen: true, mode: 'edit', category })}
                      onDelete={handleDeleteCategory}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODALS */}
      <CategoryModal
        isOpen={categoryModal.isOpen}
        mode={categoryModal.mode}
        category={categoryModal.category}
        saving={saving}
        initialOrder={categories.length > 0 ? Math.max(...categories.map(c => c.ordre)) + 1 : 1}
        onClose={() => setCategoryModal({ isOpen: false, mode: 'create' })}
        onSave={handleSaveCategory}
      />

      <ArticleModal
        isOpen={articleModal.isOpen}
        mode={articleModal.mode}
        articleId={articleModal.articleId}
        categories={categories}
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
