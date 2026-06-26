import { useUserStore } from '../../store/UserStore';
import { useMyDashboardSummary } from '../../hooks/useStudentDashboard';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Bell,
  Trophy,
  Medal,
  Loader2,
} from 'lucide-react';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function StudentDashboard() {
  const user = useUserStore((state) => state.user);
  const firstName = user?.firstName || 'Étudiant';
  const { data, isLoading } = useMyDashboardSummary();

  const total = data?.candidatures.total ?? 0;
  const countByStatus = (nom: string) => data?.candidatures.parStatut.find((s) => s.nom === nom)?.count ?? 0;
  const countAPostuler = countByStatus('À postuler');
  const enAttente = countByStatus('Postulé');
  const entretiens = countByStatus('Entretien décroché') + countByStatus('Entretien passé');
  const repondues = total - countAPostuler - enAttente;
  const tauxReponse = total > 0 ? Math.round((repondues / total) * 100) : 0;

  const stats = [
    { label: 'Candidatures envoyées', value: String(total), icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'En attente de réponse', value: String(enAttente), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Entretiens obtenus', value: String(entretiens), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Taux de réponse', value: total > 0 ? `${tauxReponse}%` : '—', icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fadeIn">
      {/* Welcome header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Bonjour, {firstName} 👋
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

      {/* Gamification + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gamification */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-primary" />
            Progression
          </h2>
          {data && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{data.gamification.grade.icone}</span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{data.gamification.grade.nom}</p>
                  <p className="text-xs text-slate-400">{data.gamification.xpTotal} XP</p>
                </div>
              </div>
              {data.gamification.gradeNext ? (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{data.gamification.grade.nom}</span>
                    <span>{data.gamification.gradeNext.nom}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${data.gamification.xpProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {data.gamification.gradeNext.xpMinimum - data.gamification.xpTotal} XP avant {data.gamification.gradeNext.nom}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Grade maximum atteint 🎉</p>
              )}
            </div>
          )}
        </div>

        {/* Ranking */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Medal className="h-4 w-4 text-primary" />
            Classement {data?.ranking.scopedToPromotion ? 'de ta promotion' : 'général'}
          </h2>
          {data && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Tu es <span className="font-bold text-slate-900 dark:text-white">#{data.ranking.rank}</span> sur {data.ranking.totalStudents}
              </p>
              <div className="flex flex-col gap-1.5">
                {data.ranking.top3.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm ${
                      entry.me ? 'bg-indigo-50 dark:bg-indigo-950/30 font-semibold' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 w-4">{idx + 1}.</span>
                      {entry.firstName} {entry.lastName[0]}.
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{entry.xpTotal} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
          </div>
          {data && data.candidatures.recentes.length > 0 ? (
            <div className="flex flex-col gap-1">
              {data.candidatures.recentes.map((app) => (
                <div key={app.id} className="flex items-center justify-between gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{app.poste}</p>
                    <p className="text-xs text-slate-400 truncate">{app.entreprise}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {app.stale && <span className="text-xs text-amber-500">⚠</span>}
                    <span className="text-xs text-slate-400 hidden sm:inline">{formatDate(app.dateModification)}</span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${app.statusCouleur}1A`, color: app.statusCouleur ?? undefined }}
                    >
                      {app.statusNom}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-primary" />
            À faire aujourd'hui
          </h2>
          {data && data.afaireAujourdhui.length > 0 ? (
            <div className="flex flex-col gap-2">
              {data.afaireAujourdhui.map((task, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-700 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  {task.label}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <Bell className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs text-slate-400 dark:text-slate-500">Rien à signaler, continue comme ça !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
