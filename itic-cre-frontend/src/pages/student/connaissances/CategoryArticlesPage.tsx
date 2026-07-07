import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, BookOpen } from 'lucide-react';
import { useSkillTreeProgress, useStudentArticlesByCategory } from '../../../hooks/useSkills';
import Breadcrumb from './components/Breadcrumb';
import ArticleCard from './components/ArticleCard';

const emojiMap: Record<string, string> = {
  book: '📄',
  folder: '💼',
  award: '🎓',
  help: '💬',
  sparkles: '🚀',
};

export default function CategoryArticlesPage() {
  const { t } = useTranslation();
  const { categoryId = '' } = useParams<{ categoryId: string }>();

  const { data: progress } = useSkillTreeProgress();
  const { data: articles, isLoading, isError } = useStudentArticlesByCategory(categoryId);

  const node = useMemo(
    () => progress?.nodes.find((n) => n.categoryId === categoryId),
    [progress, categoryId]
  );

  const categoryName = node?.categoryName ?? articles?.[0]?.categoryNom ?? '';
  const displayIcon = node ? emojiMap[node.categoryIcon] || node.categoryIcon || '📄' : '📄';

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fadeIn">
      <Breadcrumb
        items={[
          { label: t('dashboard.connaissances.category.breadcrumb_root'), to: '/student/connaissances' },
          { label: categoryName || '…' },
        ]}
      />

      <div className="flex items-center gap-3">
        <span className="text-3xl select-none leading-none" role="img" aria-label={categoryName}>
          {displayIcon}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {categoryName}
          </h1>
          {articles && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {articles.length} {articles.length === 1 ? 'article' : 'articles'}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      ) : isError ? (
        <div className="flex justify-center py-16 text-sm text-slate-400">
          {t('dashboard.connaissances.category.load_error')}
        </div>
      ) : articles && articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="text-sm">{t('dashboard.connaissances.category.no_articles')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles?.map((article) => (
            <ArticleCard key={article.id} article={article} to={`/student/connaissances/${categoryId}/${article.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
