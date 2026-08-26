import { useTranslation } from 'react-i18next';

interface Props {
  totalStudents: number;
  availableYears: number[];
  yearCounts: { counts: Record<number, number>; unassigned: number };
  selectedYearTab: 'ALL' | number | 'UNASSIGNED';
  onSelectTab: (tab: 'ALL' | number | 'UNASSIGNED') => void;
}

export default function PromotionYearTabs({
  totalStudents,
  availableYears,
  yearCounts,
  selectedYearTab,
  onSelectTab,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onSelectTab('ALL')}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
          selectedYearTab === 'ALL'
            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
        }`}
      >
        {t('dashboard.promotions.tab_all', {
          count: totalStudents,
          defaultValue: `Tous (${totalStudents})`,
        })}
      </button>

      {availableYears.map((yr) => {
        const count = yearCounts.counts[yr] ?? 0;
        const isActive = selectedYearTab === yr;
        return (
          <button
            key={yr}
            type="button"
            onClick={() => onSelectTab(yr)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            {t(`study_years.year_${yr}`, `${yr}e année`)} ({count})
          </button>
        );
      })}

      {yearCounts.unassigned > 0 && (
        <button
          type="button"
          onClick={() => onSelectTab('UNASSIGNED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
            selectedYearTab === 'UNASSIGNED'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
          }`}
        >
          {t('dashboard.promotions.tab_unassigned', {
            count: yearCounts.unassigned,
            defaultValue: `Sans niveau (${yearCounts.unassigned})`,
          })}
        </button>
      )}
    </div>
  );
}
