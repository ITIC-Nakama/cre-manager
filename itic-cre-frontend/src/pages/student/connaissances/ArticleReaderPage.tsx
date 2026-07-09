import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  User,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSkillTreeProgress, useStudentArticle, useStudentArticlesByCategory } from '../../../hooks/useSkills';
import Breadcrumb from './components/Breadcrumb';
import QuizSection from './components/QuizSection';
import TiptapContentStyles from '../../../components/basics/tiptap/TiptapContentStyles';

const emojiMap: Record<string, string> = {
  book: '📄',
  folder: '💼',
  award: '🎓',
  help: '💬',
  sparkles: '🚀',
};

const WORDS_PER_MINUTE = 200;

function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export default function ArticleReaderPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { categoryId = '', articleId = '' } = useParams<{ categoryId: string; articleId: string }>();
  const { data: article, isLoading, isError } = useStudentArticle(articleId);
  const { data: progress } = useSkillTreeProgress();
  const { data: categoryArticles } = useStudentArticlesByCategory(categoryId);

  const [readProgress, setReadProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Articles sans quiz : le backend crée un ArticleRead au premier GET → invalider le cache de progression
  useEffect(() => {
    if (article && !article.hasQuiz) {
      queryClient.invalidateQueries({ queryKey: ['skill-tree-progress'] });
      queryClient.invalidateQueries({ queryKey: ['student-articles', categoryId] });
    }
  }, [article?.id, article?.hasQuiz, categoryId, queryClient]);

  useEffect(() => {
    const scrollEl = contentRef.current?.closest('main');
    if (!scrollEl) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = scrollEl.scrollHeight - scrollEl.clientHeight;
        setReadProgress(max > 0 ? Math.min(100, Math.max(0, (scrollEl.scrollTop / max) * 100)) : 100);
        ticking = false;
      });
    };

    handleScroll();
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [articleId]);

  const node = useMemo(
    () => progress?.nodes.find((n) => n.categoryId === categoryId),
    [progress, categoryId]
  );
  const displayIcon = node ? emojiMap[node.categoryIcon] || node.categoryIcon || '📄' : '📄';

  const sortedArticles = useMemo(
    () => (categoryArticles ? [...categoryArticles].sort((a, b) => a.ordre - b.ordre) : []),
    [categoryArticles]
  );
  const currentIndex = sortedArticles.findIndex((a) => a.id === articleId);
  const prevArticle = currentIndex > 0 ? sortedArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex >= 0 && currentIndex < sortedArticles.length - 1 ? sortedArticles[currentIndex + 1] : null;

  const readingMinutes = useMemo(() => (article ? estimateReadingMinutes(article.contenu) : 0), [article]);
  const authorName = article ? [article.createdByFirstName, article.createdByLastName].filter(Boolean).join(' ').trim() : '';
  const updatedDate = article?.dateModification
    ? new Date(article.dateModification).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

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
    <div ref={contentRef} className="flex flex-col gap-6 pb-16 max-w-3xl mx-auto">
      {/* Reading progress bar, pinned to the top of the scrollable content area */}
      <div className="sticky top-0 -mt-8 z-30 h-1 w-full bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-[width] duration-150 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      <div className="animate-fade-in-up flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t('dashboard.connaissances.category.breadcrumb_root'), to: '/student/connaissances' },
            { label: article.categoryNom, to: `/student/connaissances/${categoryId}` },
            { label: article.titre },
          ]}
        />

        {/* Header card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/20 p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="text-4xl select-none leading-none flex-shrink-0" role="img" aria-label={article.categoryNom}>
              {displayIcon}
            </span>
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {article.completed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('dashboard.connaissances.article.completed_badge')}
                  </span>
                )}
                {article.hasQuiz && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {t('dashboard.connaissances.category.quiz_available')}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                {article.titre}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t('dashboard.connaissances.article.reading_time', { min: readingMinutes })}
                </span>
                {authorName && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {t('dashboard.connaissances.article.by_author', { name: authorName })}
                  </span>
                )}
                {updatedDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t('dashboard.connaissances.article.updated_at', { date: updatedDate })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="animate-fade-in-up anim-delay-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <TiptapContentStyles />
        <div
          className="ql-editor-replacement"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: article.contenu }}
        />
      </div>

      {/* Quiz inline */}
      {article.hasQuiz && (
        <div className="animate-fade-in-up anim-delay-200">
          <QuizSection articleId={article.id} />
        </div>
      )}

      {/* Prev / Next navigation */}
      <div className="animate-fade-in-up anim-delay-300 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {prevArticle ? (
          <Link
            to={`/student/connaissances/${categoryId}/${prevArticle.id}`}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                {t('dashboard.connaissances.article.prev_article')}
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{prevArticle.titre}</p>
            </div>
          </Link>
        ) : <div />}

        {nextArticle && (
          <Link
            to={`/student/connaissances/${categoryId}/${nextArticle.id}`}
            className="group flex items-center justify-end gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-right"
          >
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                {t('dashboard.connaissances.article.next_article')}
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{nextArticle.titre}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0" />
          </Link>
        )}
      </div>

      <Link
        to={`/student/connaissances/${categoryId}`}
        className="animate-fade-in-up anim-delay-400 self-start inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('dashboard.connaissances.article.back_to_category')}
      </Link>
    </div>
  );
}
