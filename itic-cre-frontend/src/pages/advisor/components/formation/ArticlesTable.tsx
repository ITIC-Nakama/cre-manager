import { useTranslation } from 'react-i18next';
import { Edit, Trash2, BookOpen, Award, CheckCircle2, HelpCircle, Eye, EyeOff } from 'lucide-react';
import type { ArticleSummary } from '../../../../types/models/Skill';

interface ArticlesTableProps {
  articles: ArticleSummary[];
  onQuizClick: (id: string, title: string) => void;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string, title: string) => void;
}

export default function ArticlesTable({
  articles,
  onQuizClick,
  onEditClick,
  onDeleteClick
}: ArticlesTableProps) {
  const { t } = useTranslation();

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/40">
        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-base font-semibold">{t('dashboard.formation.no_articles')}</p>
        <p className="text-sm">{t('dashboard.formation.no_articles_desc')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <th className="py-3 px-4">{t('dashboard.formation.col_title')}</th>
            <th className="py-3 px-4">{t('dashboard.formation.col_category')}</th>
            <th className="py-3 px-4">{t('dashboard.formation.col_status')}</th>
            <th className="py-3 px-4">{t('dashboard.formation.col_quiz')}</th>
            <th className="py-3 px-4 text-right">{t('dashboard.formation.col_actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {articles.map((art) => (
            <tr key={art.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                {art.titre}
              </td>
              <td className="py-4 px-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
                  {art.categoryNom}
                </span>
              </td>
              <td className="py-4 px-4">
                {art.actif ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                    <Eye className="h-4 w-4" /> {t('dashboard.formation.status_active')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 text-sm font-medium">
                    <EyeOff className="h-4 w-4" /> {t('dashboard.formation.status_inactive')}
                  </span>
                )}
              </td>
              <td className="py-4 px-4">
                {art.hasQuiz ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('dashboard.formation.quiz_configured')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                    <HelpCircle className="h-3.5 w-3.5" /> {t('dashboard.formation.quiz_none')}
                  </span>
                )}
              </td>
              <td className="py-4 px-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onQuizClick(art.id, art.titre)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                  >
                    <Award className="h-3.5 w-3.5" />
                    {t('dashboard.formation.btn_quiz')}
                  </button>
                  <button
                    onClick={() => onEditClick(art.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteClick(art.id, art.titre)}
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
