import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useStudentArticle } from '../../../hooks/useSkills';
import Breadcrumb from './components/Breadcrumb';
import QuizSection from './components/QuizSection';
import TiptapContentStyles from '../../../components/basics/tiptap/TiptapContentStyles';

export default function ArticleReaderPage() {
  const { t } = useTranslation();
  const { categoryId = '', articleId = '' } = useParams<{ categoryId: string; articleId: string }>();
  const { data: article, isLoading, isError } = useStudentArticle(articleId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="flex justify-center py-24 text-sm text-slate-400">
        {t('dashboard.connaissances.article.load_error')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fadeIn max-w-3xl mx-auto">
      <Breadcrumb
        items={[
          { label: t('dashboard.connaissances.category.breadcrumb_root'), to: '/student/connaissances' },
          { label: article.categoryNom, to: `/student/connaissances/${categoryId}` },
          { label: article.titre },
        ]}
      />

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {article.titre}
      </h1>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <TiptapContentStyles />
        <div
          className="ql-editor-replacement"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: article.contenu }}
        />
      </div>

      {article.hasQuiz && <QuizSection articleId={article.id} />}
    </div>
  );
}
