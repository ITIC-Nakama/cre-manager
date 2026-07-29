import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type { ArticleSummary } from '../../../../types/models/Skill';
import ArticlesTable from './ArticlesTable';

interface Props {
  articles: ArticleSummary[];
  onCreateArticle: () => void;
  onQuizClick: (id: string, title: string) => void;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string, title: string) => void;
}

export default function ArticlesTabContent({
  articles,
  onCreateArticle,
  onQuizClick,
  onEditClick,
  onDeleteClick,
}: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('dashboard.formation.articles_list')}
        </h2>
        <button
          onClick={onCreateArticle}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.formation.create_article')}
        </button>
      </div>

      <ArticlesTable
        articles={articles}
        onQuizClick={onQuizClick}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
      />
    </div>
  );
}
