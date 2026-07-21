import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { Loader2, ZoomIn, ZoomOut, Maximize, Trophy, Layers, BookOpen } from 'lucide-react';
import { useSkillTreeProgress } from '../../../hooks/useSkills';
import SkillNode from './components/SkillNode';

const NODE_SIZE = 96;
const V_GAP = 170;
const AMPLITUDE = 130;
const CANVAS_PADDING = 110;

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => zoomIn()}
        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <ZoomIn className="h-4 w-4 text-slate-600 dark:text-slate-300" />
      </button>
      <button
        type="button"
        onClick={() => zoomOut()}
        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <ZoomOut className="h-4 w-4 text-slate-600 dark:text-slate-300" />
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <Maximize className="h-4 w-4 text-slate-600 dark:text-slate-300" />
      </button>
    </div>
  );
}

export default function SkillTreePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useSkillTreeProgress();
  const [isPanning, setIsPanning] = useState(false);

  const nodes = useMemo(() => data?.nodes ?? [], [data]);

  const { positions, canvasWidth, canvasHeight } = useMemo(() => {
    const width = AMPLITUDE * 2 + NODE_SIZE + CANVAS_PADDING * 2;
    const height = nodes.length > 0
      ? CANVAS_PADDING * 2 + (nodes.length - 1) * V_GAP + NODE_SIZE
      : CANVAS_PADDING * 2 + NODE_SIZE;
    const pos = nodes.map((_, i) => ({
      x: width / 2 + AMPLITUDE * Math.sin(i * 1.05),
      y: CANVAS_PADDING + i * V_GAP,
    }));
    return { positions: pos, canvasWidth: width, canvasHeight: height };
  }, [nodes]);

  const pct = data && data.totalArticles > 0 ? Math.round((data.completedArticles / data.totalArticles) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('dashboard.connaissances.tree.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('dashboard.connaissances.tree.subtitle')}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('dashboard.connaissances.tree.progress_label', { completed: data?.completedArticles ?? 0, total: data?.totalArticles ?? 0 })}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {t('dashboard.connaissances.tree.xp_total', { xp: data?.xpTotal ?? 0 })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Layers className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {t('dashboard.connaissances.tree.domains_count', { count: nodes.length })}
          </p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden h-[560px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            {t('dashboard.connaissances.tree.load_error')}
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          </div>
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={0.4}
            maxScale={2}
            centerOnInit
            limitToBounds={true}
            wheel={{ step: 0.08 }}
            velocityAnimation={{ animationTime: 150, animationType: 'linear' }}
            onPanningStart={() => setIsPanning(true)}
            onPanningStop={() => setIsPanning(false)}
          >
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%', cursor: isPanning ? 'grabbing' : 'grab' }}
              contentStyle={{ width: canvasWidth, height: canvasHeight }}
            >
              <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
                <svg className="absolute inset-0" width={canvasWidth} height={canvasHeight}>
                  {positions.slice(1).map((pos, i) => {
                    const prev = positions[i];
                    const midY = (prev.y + pos.y) / 2;
                    return (
                      <path
                        key={i}
                        d={`M ${prev.x} ${prev.y} C ${prev.x} ${midY}, ${pos.x} ${midY}, ${pos.x} ${pos.y}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={6}
                        strokeLinecap="round"
                        className="text-slate-300 dark:text-slate-800"
                      />
                    );
                  })}
                </svg>

                {nodes.map((node, i) => (
                  <SkillNode
                    key={node.categoryId}
                    node={node}
                    size={NODE_SIZE}
                    x={positions[i].x}
                    y={positions[i].y}
                    isPanning={isPanning}
                    onClick={() => navigate(`/student/connaissances/${node.categoryId}`)}
                  />
                ))}
              </div>
            </TransformComponent>

            <ZoomControls />
          </TransformWrapper>
        )}

        {/* Legend */}
        {!isLoading && !isError && nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
              <span className="text-slate-600 dark:text-slate-300">{t('dashboard.connaissances.tree.legend_completed')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600" />
              <span className="text-slate-600 dark:text-slate-300">{t('dashboard.connaissances.tree.legend_in_progress')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-slate-600 to-slate-800" />
              <span className="text-slate-600 dark:text-slate-300">{t('dashboard.connaissances.tree.legend_to_discover')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
