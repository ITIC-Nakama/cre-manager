import { Users, Briefcase, AlertCircle, FileText, Loader2, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DashboardOverview } from '../../../types/models/Dashboard';

interface StatCard {
  label: string;
  value: number | string;
  sub: string | null;
  icon: LucideIcon;
  color: string;
  bg: string;
}

interface Props {
  overview: DashboardOverview | null;
  loading: boolean;
  cvsToReview: number;
}

export default function DashboardStatCards({ overview, loading, cvsToReview }: Props) {
  const { t } = useTranslation();

  const cards: StatCard[] = [
    {
      label: t('dashboard.advisor.stats.students_label'),
      value: overview?.totalStudents ?? '—',
      sub: overview
        ? t('dashboard.advisor.stats.students_sub', { active: overview.activeStudents, inactive: overview.inactiveStudents })
        : null,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: t('dashboard.advisor.stats.applications_label'),
      value: overview?.totalApplications ?? '—',
      sub: overview ? t('dashboard.advisor.stats.applications_sub', { count: overview.recentApplications7d }) : null,
      icon: Briefcase,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      label: t('dashboard.advisor.stats.stale_label'),
      value: overview?.staleApplicationsCount ?? '—',
      sub: t('dashboard.advisor.stats.stale_sub'),
      icon: AlertCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: t('dashboard.advisor.stats.cvs_label'),
      value: loading ? '—' : cvsToReview,
      sub: overview
        ? t('dashboard.advisor.stats.cvs_sub', { count: overview.totalCvs })
        : null,
      icon: FileText,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`h-11 w-11 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
              {loading ? (
                <Loader2 className={`h-5 w-5 ${card.color} animate-spin`} />
              ) : (
                <Icon className={`h-5 w-5 ${card.color}`} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
              {card.sub && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{card.sub}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
