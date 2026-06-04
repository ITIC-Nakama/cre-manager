import { useUserStore } from '../../store/UserStore';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Bell,
  ArrowRight,
  Calendar,
} from 'lucide-react';

const stats = [
  {
    label: 'Candidatures envoyées',
    value: '0',
    icon: Briefcase,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'En attente de réponse',
    value: '0',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    label: 'Entretiens obtenus',
    value: '0',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Taux de réponse',
    value: '—',
    icon: TrendingUp,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
];

export default function StudentDashboard() {
  const user = useUserStore((state) => state.user);
  const firstName = user?.firstName || 'Étudiant';

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fadeIn">
      {/* Welcome header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Bonjour, {firstName} 👋 (Espace Étudiant)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Voici un aperçu de vos candidatures et de votre activité récente.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Candidatures récentes
            </h2>
            <button className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              Voir tout <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Aucune candidature pour le moment
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
              Commencez par ajouter votre première candidature pour suivre son évolution ici.
            </p>
            <button className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              + Ajouter une candidature
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Notifications */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </h2>
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <Bell className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs text-slate-400 dark:text-slate-500">Aucune notification</p>
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-primary" />
              À venir
            </h2>
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs text-slate-400 dark:text-slate-500">Aucun événement planifié</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
