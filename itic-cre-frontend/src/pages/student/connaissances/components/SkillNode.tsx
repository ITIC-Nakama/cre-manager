import { useRef } from 'react';
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

const EMPTY_CIRCLE_STYLE = 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border-slate-200 dark:border-slate-600 shadow-slate-200/20';

export function formatCategoryTitle(text: string, maxLength = 65): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

interface SkillNodeProps {
  node: SkillNodeProgress;
  size: number;
  x: number;
  y: number;
  isPanning?: boolean;
  onClick: () => void;
}

export default function SkillNode({ node, size, x, y, isPanning = false, onClick }: SkillNodeProps) {
  const { t } = useTranslation();
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const displayIcon = emojiMap[node.categoryIcon] || node.categoryIcon || '📄';
  const clickable = node.totalArticles > 0;

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (pointerDownPosRef.current) {
      const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
      const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
      const dist = Math.hypot(dx, dy);
      pointerDownPosRef.current = null;
      if (dist > 6) { // Dragged > 6px -> pan gesture, ignore click
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    onClick();
  };

  return (
    <div
      role="button"
      tabIndex={clickable ? 0 : -1}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-disabled={!clickable}
      title={clickable ? node.categoryName : t('dashboard.connaissances.tree.node_empty')}
      className={`group absolute flex flex-col items-center gap-2 -translate-x-1/2 -translate-y-1/2 transition-transform select-none ${
        clickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'
      }`}
      style={{ left: x, top: y }}
    >
      <div
        className={`relative flex items-center justify-center rounded-full border-4 shadow-lg text-white ${clickable ? STATE_STYLES[node.state] : EMPTY_CIRCLE_STYLE}`}
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

      <div className="flex flex-col items-center gap-0.5 max-w-[210px]">
        <span
          title={node.categoryName}
          className="text-xs font-bold text-slate-900 dark:text-white text-center px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-900/95 shadow-sm border border-slate-200/60 dark:border-slate-800/60 leading-tight break-words max-w-full"
        >
          {formatCategoryTitle(node.categoryName, 65)}
        </span>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {node.state === 'COMPLETED'
            ? t('dashboard.connaissances.tree.node_completed_label')
            : clickable
              ? t('dashboard.connaissances.tree.node_articles', { completed: node.completedArticles, total: node.totalArticles })
              : t('dashboard.connaissances.tree.node_empty')}
        </span>
      </div>
    </div>
  );
}
