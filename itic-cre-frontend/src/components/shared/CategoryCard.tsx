import { Edit2, Trash2, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SkillCategory } from '../../types/models/Skill';

interface CategoryCardProps {
  category: SkillCategory;
  articlesCount: number;
  onEdit?: (category: SkillCategory) => void;
  onDelete?: (id: string, name: string) => void;
}

const emojiMap: Record<string, string> = {
  'book': '📄',
  'folder': '💼',
  'award': '🎓',
  'help': '💬',
  'sparkles': '🚀'
};

export default function CategoryCard({ category, articlesCount, onEdit, onDelete }: CategoryCardProps) {
  const { t } = useTranslation();
  const displayIcon = emojiMap[category.icone] || category.icone || '📄';
  const showActions = !!onEdit || !!onDelete;

  return (
    <div
      className={`group flex flex-col justify-between p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative ${
        category.actif
          ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/30'
          : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/40 dark:border-slate-900/40 opacity-75'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex justify-between items-start mb-4">
          {/* Emoji container with subtle background matching category status */}
          <div className={`p-3 rounded-2xl transition-colors duration-300 flex items-center justify-center ${
            category.actif
              ? 'bg-indigo-50 dark:bg-indigo-950/50 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50'
              : 'bg-slate-100 dark:bg-slate-800'
          }`}>
            <span className="text-3xl select-none leading-none" role="img" aria-label="category icon">
              {displayIcon}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Order Badge */}
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {t('dashboard.formation.order', { val: category.ordre })}
            </span>
            
            {/* Status Indicator */}
            {!category.actif && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/30 dark:border-amber-900/30">
                {t('dashboard.formation.status_inactive')}
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {category.nom}
        </h3>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
          {category.description || t('dashboard.formation.no_description')}
        </p>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
        {/* Article Count Badge */}
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          {articlesCount > 0 
            ? `${articlesCount} ${articlesCount === 1 ? 'article' : 'articles'}`
            : t('dashboard.formation.no_articles')
          }
        </span>

        {/* Action Buttons (Rendered only if onEdit/onDelete are provided) */}
        {showActions && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(category)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer border border-slate-200/40 dark:border-slate-700/40"
              >
                <Edit2 className="h-3.5 w-3.5" />
                {t('dashboard.formation.btn_edit')}
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={() => onDelete(category.id, category.nom)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 transition-all cursor-pointer border border-red-100/30 dark:border-red-900/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('dashboard.formation.btn_delete')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
