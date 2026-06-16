import { useState, useEffect } from 'react';
import { useUserStore } from '../../store/UserStore';
import { Role } from '../../types/models/Auth';
import {
  Users,
  Search,
  SlidersHorizontal,
  Mail,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Plus,
  FileText,
  Briefcase,
  Loader2,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../api-s/AxiosApiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CvByStatut {
  statutId: string;
  statutNom: string;
  couleur: string;
  count: number;
}

interface AppByStatus {
  statusNom: string;
  couleur: string;
  count: number;
}

interface DashboardOverview {
  totalStudents: number;
  totalApplications: number;
  totalCvs: number;
  averageXp: number;
  activeStudents: number;
  inactiveStudents: number;
  studentsWithoutCv: number;
  staleApplicationsCount: number;
  recentApplications7d: number;
  applicationsByStatus: AppByStatus[];
  cvsByStatut: CvByStatut[];
}

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  promotion: { id: string; nom: string } | null;
  xpTotal: number;
  grade: { nom: string; icone: string } | null;
  lastActivity: string | null;
  isActive: boolean;
  applicationCount: number;
  staleApplicationCount: number;
  hasCv: boolean;
}

type FilterValue = 'all' | 'active' | 'inactive' | 'stale' | 'no-cv';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdvisorDashboard() {
  const user = useUserStore((state) => state.user);
  const isAdmin = user?.role === Role.ADMIN;
  const firstName = user?.firstName || 'Conseiller';

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');

  useEffect(() => {
    apiClient.get<DashboardOverview>('/dashboard/overview')
      .then((res) => setOverview(res.data))
      .catch(() => toast.error('Impossible de charger les statistiques'))
      .finally(() => setLoadingOverview(false));

    apiClient.get<StudentRow[]>('/dashboard/students')
      .then((res) => setStudents(res.data))
      .catch(() => toast.error('Impossible de charger la liste des étudiants'))
      .finally(() => setLoadingStudents(false));
  }, []);

  const cvsToReview = (overview?.cvsByStatut ?? [])
    .filter((s) => s.statutNom !== 'Validé')
    .reduce((acc, s) => acc + s.count, 0);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      statusFilter === 'all' ||
      (statusFilter === 'active' && s.isActive) ||
      (statusFilter === 'inactive' && !s.isActive) ||
      (statusFilter === 'stale' && s.staleApplicationCount > 0) ||
      (statusFilter === 'no-cv' && !s.hasCv);

    return matchesSearch && matchesFilter;
  });

  const handleNotify = async (student: StudentRow) => {
    setNotifyingId(student.id);
    try {
      await apiClient.post(`/dashboard/students/${student.id}/notify`, {});
      toast.success(`Email de rappel envoyé à ${student.firstName} ${student.lastName}`);
    } catch {
      toast.error(`Impossible d'envoyer l'email à ${student.email}`);
    } finally {
      setNotifyingId(null);
    }
  };

  const statCards = [
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
      value: loadingOverview ? '—' : cvsToReview,
      sub: overview ? `${overview.totalCvs} CV${overview.totalCvs > 1 ? 's' : ''} déposé${overview.totalCvs > 1 ? 's' : ''}` : null,
      icon: FileText,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">

      {/* Welcome header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Bonjour, {firstName} 👋
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
              {isAdmin ? 'Admin' : 'Conseiller'}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suivi global et accompagnement des étudiants dans leur recherche d'alternance ou de stage.
          </p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => toast.info("Redirection vers la création d'utilisateur...")}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Créer un conseiller
            </button>
          )}
          <button
            onClick={() => toast.success('Exportation CSV lancée !')}
            className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                {loadingOverview ? (
                  <Loader2 className={`h-5 w-5 ${stat.color} animate-spin`} />
                ) : (
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
                {stat.sub && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{stat.sub}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CV statuts + candidatures panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CVs par statut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
            <FileText className="h-4 w-4 text-primary" />
            CVs par statut
          </h2>
          {loadingOverview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
            </div>
          ) : overview?.cvsByStatut && overview.cvsByStatut.length > 0 ? (
            <div className="space-y-3">
              {overview.cvsByStatut
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((s) => (
                  <div key={s.statutId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.couleur }} />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{s.statutNom}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: overview.totalCvs > 0 ? `${(s.count / overview.totalCvs) * 100}%` : '0%',
                            backgroundColor: s.couleur,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white w-6 text-right">{s.count}</span>
                    </div>
                  </div>
                ))}
              <p className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                {overview.studentsWithoutCv} étudiant{overview.studentsWithoutCv > 1 ? 's' : ''} sans CV déposé
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <FileText className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-400">Aucun CV déposé pour l'instant</p>
            </div>
          )}
        </div>

        {/* Candidatures par statut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
            <Briefcase className="h-4 w-4 text-primary" />
            Candidatures par statut
          </h2>
          {loadingOverview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
            </div>
          ) : overview?.applicationsByStatus && overview.applicationsByStatus.length > 0 ? (
            <div className="space-y-3">
              {overview.applicationsByStatus
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((s) => (
                  <div key={s.statusNom} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.couleur }} />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{s.statusNom}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: overview.totalApplications > 0
                              ? `${(s.count / overview.totalApplications) * 100}%`
                              : '0%',
                            backgroundColor: s.couleur,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white w-6 text-right">{s.count}</span>
                    </div>
                  </div>
                ))}
              {overview.staleApplicationsCount > 0 && (
                <p className="text-xs text-amber-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {overview.staleApplicationsCount} candidature{overview.staleApplicationsCount > 1 ? 's' : ''} sans mise à jour depuis +10 jours
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-400">Aucune candidature enregistrée</p>
            </div>
          )}
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Liste des Étudiants
            {!loadingStudents && (
              <span className="ml-2 text-xs font-normal text-slate-400">({filteredStudents.length})</span>
            )}
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un étudiant..."
                className="pl-9 pr-4 py-2 w-56 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterValue)}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-slate-700 dark:text-slate-300 text-sm"
              >
                <option value="all">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
                <option value="stale">Candidatures en retard</option>
                <option value="no-cv">Sans CV</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4">Étudiant</th>
                <th className="px-6 py-4">Promotion</th>
                <th className="px-6 py-4">Candidatures</th>
                <th className="px-6 py-4">Grade / XP</th>
                <th className="px-6 py-4">CV</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loadingStudents ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">

                    {/* Nom + email */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{student.email}</p>
                    </td>

                    {/* Promotion */}
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {student.promotion?.nom ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Candidatures */}
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{student.applicationCount}</span>
                      {student.staleApplicationCount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          {student.staleApplicationCount} en retard
                        </span>
                      )}
                    </td>

                    {/* Grade / XP */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                          {student.grade?.nom ?? '—'}
                        </span>
                        <span className="text-slate-400 text-xs">· {student.xpTotal} XP</span>
                      </div>
                    </td>

                    {/* CV */}
                    <td className="px-6 py-4">
                      {student.hasCv ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                          Déposé
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          Aucun CV
                        </span>
                      )}
                    </td>

                    {/* Statut actif/inactif */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        student.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                          : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                      }`}>
                        {student.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => toast.info(`Détails de ${student.firstName} — en cours de développement`)}
                        className="inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Consulter le dossier"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleNotify(student)}
                        disabled={notifyingId === student.id}
                        className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer disabled:opacity-50"
                        title="Envoyer un rappel par email"
                      >
                        {notifyingId === student.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Mail className="h-4 w-4" />
                        }
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Aucun étudiant ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin audit block */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            Audit Logs & Activités Système
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">ADMIN_BOOTSTRAP</span>
              <span className="text-slate-500">Création du conseiller `M. Dubois`</span>
              <span className="text-slate-400 font-mono">2026-06-04 12:05</span>
            </div>
            <div className="flex justify-between items-center text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">STUDENT_REGISTER</span>
              <span className="text-slate-500">Inscription validée par OTP — `lina.benali@itic-paris.fr`</span>
              <span className="text-slate-400 font-mono">2026-06-04 11:32</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
