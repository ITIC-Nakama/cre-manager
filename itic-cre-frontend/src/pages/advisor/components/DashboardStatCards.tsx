import { Users, Briefcase, AlertCircle, FileText, Loader2, type LucideIcon } from 'lucide-react';
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
  const cards: StatCard[] = [
    {
      label: 'Étudiants inscrits',
      value: overview?.totalStudents ?? '—',
      sub: overview ? `${overview.activeStudents} actifs · ${overview.inactiveStudents} inactifs` : null,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Candidatures totales',
      value: overview?.totalApplications ?? '—',
      sub: overview ? `+${overview.recentApplications7d} cette semaine` : null,
      icon: Briefcase,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Candidatures en retard',
      value: overview?.staleApplicationsCount ?? '—',
      sub: 'Sans mise à jour depuis +10 j.',
      icon: AlertCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'CVs à examiner',
      value: loading ? '—' : cvsToReview,
      sub: overview
        ? `${overview.totalCvs} CV${overview.totalCvs > 1 ? 's' : ''} déposé${overview.totalCvs > 1 ? 's' : ''}`
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
