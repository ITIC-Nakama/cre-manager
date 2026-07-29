import { useTranslation } from 'react-i18next';
import { Plus, Folder } from 'lucide-react';
import type { SkillCategory, ArticleSummary } from '../../../../types/models/Skill';
import CategoryCard from '../../../../components/shared/CategoryCard';

interface Props {
  categories: SkillCategory[];
  articles: ArticleSummary[];
  onCreateCategory: () => void;
  onEditCategory: (category: SkillCategory) => void;
  onDeleteCategory: (categoryId: string, name: string) => void;
}

export default function CategoriesTabContent({
  categories,
  articles,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
}: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('dashboard.formation.categories_list')}
        </h2>
        <button
          onClick={onCreateCategory}
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
            const articlesCount = articles.filter((art) => art.categoryId === cat.id).length;
            return (
              <CategoryCard
                key={cat.id}
                category={cat}
                articlesCount={articlesCount}
                onEdit={onEditCategory}
                onDelete={onDeleteCategory}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
