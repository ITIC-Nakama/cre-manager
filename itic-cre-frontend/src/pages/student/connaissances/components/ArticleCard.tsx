import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, HelpCircle, FileText, Loader2 } from 'lucide-react';
import { useStudentQuiz } from '../../../../hooks/useSkills';
import type { ArticleSummary } from '../../../../types/models/Skill';

function QuizStatusBadge({ articleId }: { articleId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentQuiz(articleId);

  if (isLoading) {
    return <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />;
  }

  if (data?.dejaValide) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        {t('dashboard.connaissances.category.quiz_validated')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
      <HelpCircle className="h-3 w-3" />
      {t('dashboard.connaissances.category.quiz_available')}
    </span>
  );
}

export default function ArticleCard({ article, to }: { article: ArticleSummary; to: string }) {
  const { t } = useTranslation();

  return (
    <Link
      to={to}
      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0">
          <FileText className="h-4.5 w-4.5 text-indigo-500" />
        </div>
        <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
          {article.titre}
        </p>
      </div>

      <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center">
        {article.hasQuiz ? (
          <QuizStatusBadge articleId={article.id} />
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {t('dashboard.connaissances.category.quiz_none')}
          </span>
        )}
      </div>
    </Link>
  );
}
