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

// ─── Mock student table (à remplacer par données réelles dans une prochaine itération) ─

interface StudentMock {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  applicationsCount: number;
  status: 'Recherche active' | 'Entretien obtenu' | 'Placé' | 'Inactif';
  advisor: string;
}

const mockStudents: StudentMock[] = [
  { id: 1, firstName: 'Lina', lastName: 'Benali', email: 'l.benali@itic-paris.fr', applicationsCount: 12, status: 'Entretien obtenu', advisor: 'M. Dubois' },
  { id: 2, firstName: 'Thomas', lastName: 'Moreau', email: 't.moreau@itic-paris.fr', applicationsCount: 8, status: 'Recherche active', advisor: 'Mme. Martin' },
  { id: 3, firstName: 'Sophie', lastName: 'Lefebvre', email: 's.lefebvre@itic-paris.fr', applicationsCount: 15, status: 'Placé', advisor: 'M. Dubois' },
  { id: 4, firstName: 'Kevin', lastName: 'Nguyen', email: 'k.nguyen@itic-paris.fr', applicationsCount: 3, status: 'Inactif', advisor: 'M. Dubois' },
  { id: 5, firstName: 'Sarah', lastName: 'Gomez', email: 's.gomez@itic-paris.fr', applicationsCount: 10, status: 'Recherche active', advisor: 'Mme. Martin' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdvisorDashboard() {
  const user = useUserStore((state) => state.user);
  const isAdmin = user?.role === Role.ADMIN;
  const firstName = user?.firstName || 'Conseiller';

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    apiClient.get<DashboardOverview>('/dashboard/overview')
      .then((res) => setOverview(res.data))
      .catch(() => toast.error('Impossible de charger les statistiques'))
      .finally(() => setLoadingOverview(false));
  }, []);

  const filteredStudents = mockStudents.filter((student) => {
    const matchesSearch =
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const cvsToReview = overview?.cvsByStatut
    .filter((s) => s.statutNom !== 'Validé')
    .reduce((acc, s) => acc + s.count, 0) ?? 0;

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
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.couleur }}
                      />
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
                      <span className="text-sm font-semibold text-slate-900 dark:text-white w-6 text-right">
                        {s.count}
                      </span>
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
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.couleur }}
                      />
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
                      <span className="text-sm font-semibold text-slate-900 dark:text-white w-6 text-right">
                        {s.count}
                      </span>
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
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Liste des Étudiants</h2>
            <p className="text-xs text-slate-400 mt-0.5">Données de démonstration — connexion API en cours</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un élève..."
                className="pl-9 pr-4 py-2 w-60 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
              <SlidersHorizontal className="h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <option value="All">Tous les statuts</option>
                <option value="Recherche active">Recherche active</option>
                <option value="Entretien obtenu">Entretien obtenu</option>
                <option value="Placé">Placé</option>
                <option value="Inactif">Inactif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4">Étudiant</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Candidatures</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Conseiller</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{student.email}</td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{student.applicationsCount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        student.status === 'Placé'
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                          : student.status === 'Entretien obtenu'
                          ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400'
                          : student.status === 'Inactif'
                          ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{student.advisor}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => toast.info(`Détails de ${student.firstName}`)}
                        className="inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Consulter le dossier"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toast.success(`Rappel envoyé à ${student.email}`)}
                        className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                        title="Contacter l'étudiant"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
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
