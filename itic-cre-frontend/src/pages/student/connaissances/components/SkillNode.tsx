import { Check, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SkillNodeProgress } from '../../../../types/models/Skill';

const emojiMap: Record<string, string> = {
  book: '📄',
  folder: '💼',
  award: '🎓',
  help: '💬',
  sparkles: '🚀',
};

const STATE_STYLES: Record<SkillNodeProgress['state'], string> = {
  COMPLETED: 'bg-gradient-to-br from-orange-400 to-orange-600 border-orange-300 shadow-orange-500/30',
  IN_PROGRESS: 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-300 shadow-indigo-500/30',
  TO_DISCOVER: 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500 shadow-slate-900/20',
};

interface SkillNodeProps {
  node: SkillNodeProgress;
  size: number;
  x: number;
  y: number;
  onClick: () => void;
}

export default function SkillNode({ node, size, x, y, onClick }: SkillNodeProps) {
  const { t } = useTranslation();
  const displayIcon = emojiMap[node.categoryIcon] || node.categoryIcon || '📄';
  const clickable = node.totalArticles > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      title={clickable ? node.categoryName : t('dashboard.connaissances.tree.node_empty')}
      className={`group absolute flex flex-col items-center gap-2 -translate-x-1/2 -translate-y-1/2 transition-transform ${
        clickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-50'
      }`}
      style={{ left: x, top: y }}
    >
      <div
        className={`relative flex items-center justify-center rounded-full border-4 shadow-lg text-white ${STATE_STYLES[node.state]}`}
        style={{ width: size, height: size }}
      >
        <span className="text-3xl select-none leading-none" role="img" aria-label={node.categoryName}>
          {displayIcon}
        </span>

        {node.state === 'COMPLETED' && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 shadow">
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </span>
        )}
        {node.state === 'IN_PROGRESS' && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full bg-amber-400 border-2 border-white dark:border-slate-950 shadow">
            <Zap className="h-3.5 w-3.5 text-white" strokeWidth={3} fill="currentColor" />
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5 max-w-32">
        <span className="text-xs font-bold text-slate-900 dark:text-white text-center line-clamp-1 px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm">
          {node.categoryName}
        </span>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {node.state === 'COMPLETED'
            ? t('dashboard.connaissances.tree.node_completed_label')
            : clickable
              ? t('dashboard.connaissances.tree.node_articles', { completed: node.completedArticles, total: node.totalArticles })
              : t('dashboard.connaissances.tree.node_empty')}
        </span>
      </div>
    </button>
  );
}
