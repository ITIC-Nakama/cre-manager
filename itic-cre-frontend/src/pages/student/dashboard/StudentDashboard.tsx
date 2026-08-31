import { useUserStore } from '../../../store/UserStore';
import { useMyDashboardSummary } from '../../../hooks/useStudentDashboard';
import MyAdvisorCard from './components/MyAdvisorCard';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../utils/titleUtils';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Bell,
  Trophy,
  Medal,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function StudentDashboard() {
  const { t } = useTranslation();
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
    { label: t('dashboard.home.stats.sent', 'Candidatures envoyées'), value: String(total), icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('dashboard.home.stats.pending', 'En attente de réponse'), value: String(enAttente), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t('dashboard.home.stats.interviews', 'Entretiens obtenus'), value: String(entretiens), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('dashboard.home.stats.response_rate', 'Taux de réponse'), value: `${tauxReponse}%`, icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 animate-fadeIn">
        {/* Welcome header — toujours visible */}
        <div className="flex flex-col gap-1">
          <div className="h-8 w-64 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-4 w-96 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse mt-1" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="h-6 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-3 w-full max-w-28 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        {/* Body skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const cvNeedsCorrection = data?.cv.hasCv && data.cv.statut && (data.cv.statut.toLowerCase().includes('corriger') || data.cv.statut.toLowerCase().includes('à corriger'));

  return (
    <div className="flex flex-col gap-8  animate-fadeIn">
      {/* Welcome header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-[#E2762F] shrink-0" />
            {renderTitleWithGradient(t('dashboard.home.greeting', 'Bonjour, {{name}} 👋', { name: firstName }), 'itic-gradient-blue',firstName)}
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
            {t('dashboard.home.desc', 'Voici un aperçu de vos candidatures et de votre activité récente.')}
          </p>
        </div>
        <MyAdvisorCard advisor={data?.advisor ?? null} />
      </div>

      {/* Alert CV to correct */}
      {cvNeedsCorrection && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 ">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
              <span className="absolute inline-flex h-6 w-6 rounded-full bg-amber-400/70 dark:bg-amber-500/20 animate-ping" />
              <AlertTriangle className="h-5 w-5 relative z-10" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {t('dashboard.tasks.cv_alert_title', 'Action requise sur votre CV')}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {t('dashboard.tasks.cv_alert_desc', 'Votre conseiller a demandé des corrections sur votre CV. Veuillez le modifier et le renvoyer.')}
              </p>
            </div>
          </div>
          <Link
            to="/student/cv"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            {t('dashboard.tasks.cv_alert_btn', 'Corriger mon CV')}
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{stat.label}</p>
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
            {t('dashboard.home.gamification.title', 'Progression')}
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
                    {t('dashboard.home.gamification.next_grade', {
                      xp: data.gamification.gradeNext.xpMinimum - data.gamification.xpTotal,
                      name: data.gamification.gradeNext.nom,
                      defaultValue: '{{xp}} XP avant {{name}}'
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {t('dashboard.home.gamification.max_grade', 'Grade maximum atteint 🎉')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Ranking */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Medal className="h-4 w-4 text-primary" />
            {t('dashboard.home.ranking.title', {
              scope: data?.ranking.scopedToPromotion
                ? t('dashboard.home.ranking.promotion', 'de ta promotion')
                : t('dashboard.home.ranking.general', 'général'),
              defaultValue: 'Classement {{scope}}'
            })}
          </h2>
          {data && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t('dashboard.home.ranking.rank_prefix', 'Tu es')}{' '}
                <span className="font-bold text-slate-900 dark:text-white">#{data.ranking.rank}</span>{' '}
                {t('dashboard.home.ranking.rank_suffix', {
                  total: data.ranking.totalStudents,
                  defaultValue: 'sur {{total}}'
                })}
              </p>
              <div className="flex flex-col gap-1.5">
                {data.ranking.top3.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm ${entry.me ? 'bg-indigo-50 dark:bg-indigo-950/30 font-semibold' : ''
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
              {t('dashboard.home.applications.title', 'Candidatures récentes')}
            </h2>
            {data && data.candidatures.recentes.length > 0 && (
              <Link
                to="/student/candidatures"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('dashboard.home.applications.view_all', 'Voir tout')}
              </Link>
            )}
          </div>
          {data && data.candidatures.recentes.length > 0 ? (
            <div className="flex flex-col gap-1">
              {data.candidatures.recentes.map((app) => (
                <Link
                  key={app.id}
                  to={`/student/candidatures/${app.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{app.poste}</p>
                    <p className="text-xs text-slate-400 truncate">{app.entreprise}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {app.stale && (
                      <span className="text-xs text-amber-500 font-semibold" title={t('dashboard.candidatures.student.detail.stale', 'En alerte')}>
                        ⚠
                      </span>
                    )}
                    <span className="text-xs text-slate-400 hidden sm:inline">{formatDate(app.dateModification)}</span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${app.statusCouleur}1A`, color: app.statusCouleur ?? undefined }}
                    >
                      {app.statusNom}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {t('dashboard.home.applications.empty', 'Aucune candidature pour le moment')}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
                {t('dashboard.home.applications.empty_desc', 'Commencez par ajouter votre première candidature pour suivre son évolution ici.')}
              </p>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-primary" />
            {t('dashboard.home.tasks.title', "À faire aujourd'hui")}
          </h2>
          {data && data.afaireAujourdhui.length > 0 ? (
            <div className="flex flex-col gap-2">
              {data.afaireAujourdhui.map((task, idx) => {
                let linkTarget: string | null = null;
                if (task.type === 'STALE_APPLICATION' && task.refId) {
                  linkTarget = `/student/candidatures/${task.refId}`;
                } else if (task.type === 'NO_APPLICATION') {
                  linkTarget = '/student/candidatures';
                } else if (task.type === 'NO_CV' || task.type === 'CV_TO_CORRECT') {
                  linkTarget = '/student/cv';
                } else if (task.type === 'UPDATE_PROMOTION') {
                  linkTarget = '/student/parametres';
                }

                return linkTarget ? (
                  <Link
                    key={idx}
                    to={linkTarget}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 transition-colors cursor-pointer group"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0 group-hover:scale-125 transition-transform" />
                    <span className="flex-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.label}</span>
                  </Link>
                ) : (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-700 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                    <span>{task.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <Bell className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {t('dashboard.home.tasks.empty', 'Rien à signaler, continue comme ça !')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
