import { Users, Briefcase, AlertCircle, FileText, HelpCircle, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DashboardOverview } from '../../../../types/models/Dashboard';

interface StatCard {
  id: string;
  label: string;
  value: number | string;
  sub: string | null;
  icon: LucideIcon;
  color: string;
  bg: string;
  hasTooltip?: boolean;
}

interface Props {
  overview: DashboardOverview | null | undefined;
  loading: boolean;
  cvsToReview?: number;
}

export default function DashboardStatCards({ overview, loading, cvsToReview }: Props) {
  const { t } = useTranslation();

  const cards: StatCard[] = [
    {
      id: 'students',
      label: t('dashboard.advisor.stats.students_label'),
      value: overview?.totalStudents ?? '—',
      sub: overview
        ? (overview.anonymizedStudents && overview.anonymizedStudents > 0
            ? t('dashboard.advisor.stats.students_sub_with_anonymized', {
                active: overview.activeStudents,
                inactive: overview.inactiveStudents,
                anonymized: overview.anonymizedStudents,
              })
            : t('dashboard.advisor.stats.students_sub', {
                active: overview.activeStudents,
                inactive: overview.inactiveStudents,
              }))
        : null,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      hasTooltip: true,
    },
    {
      id: 'applications',
      label: t('dashboard.advisor.stats.applications_label'),
      value: overview?.totalApplications ?? '—',
      sub: overview ? t('dashboard.advisor.stats.applications_sub', { count: overview.recentApplications7d }) : null,
      icon: Briefcase,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      id: 'stale',
      label: t('dashboard.advisor.stats.stale_label'),
      value: overview?.staleApplicationsCount ?? '—',
      sub: t('dashboard.advisor.stats.stale_sub'),
      icon: AlertCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      id: 'cvs',
      label: t('dashboard.advisor.stats.cvs_label'),
      value: loading ? '—' : (cvsToReview ?? overview?.cvsToReview ?? 0),
      sub: overview
        ? t('dashboard.advisor.stats.cvs_sub', { count: overview.totalCvs })
        : null,
      icon: FileText,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm animate-pulse">
            <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-7 w-10 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-visible"
          >
            <div className={`h-11 w-11 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                {card.hasTooltip && (
                  <div className="relative group inline-flex items-center">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 cursor-help transition-colors" />
                    
                    <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-72 p-3.5 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs rounded-xl shadow-2xl border border-slate-700/60 z-[100] animate-in fade-in duration-150 pointer-events-none">
                      <div className="flex items-center gap-1.5 font-semibold text-blue-400 mb-2 border-b border-slate-700/60 pb-1.5">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>{t('dashboard.advisor.stats.students_tooltip_title')}</span>
                      </div>
                      <div className="space-y-2 text-[11px] leading-relaxed text-slate-200">
                        <p>
                          <strong className="text-emerald-400 font-semibold">{t('dashboard.advisor.stats.students_tooltip_active_label')} :</strong>{' '}
                          {t('dashboard.advisor.stats.students_tooltip_active')}
                        </p>
                        <p>
                          <strong className="text-amber-400 font-semibold">{t('dashboard.advisor.stats.students_tooltip_inactive_label')} :</strong>{' '}
                          {t('dashboard.advisor.stats.students_tooltip_inactive')}
                        </p>
                        <p>
                          <strong className="text-purple-400 font-semibold">{t('dashboard.advisor.stats.students_tooltip_anonymized_label')} :</strong>{' '}
                          {t('dashboard.advisor.stats.students_tooltip_anonymized')}
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[10px] font-mono text-blue-300 bg-blue-500/10 rounded-lg p-1.5 text-center font-semibold">
                        {t('dashboard.advisor.stats.students_tooltip_equation')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {card.sub && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-snug break-words">
                  {card.sub}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
