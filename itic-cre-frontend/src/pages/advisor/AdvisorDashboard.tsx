import { useState } from 'react';
import { useUserStore } from '../../store/UserStore';
import { Role } from '../../types/models/Auth';
import {
  Users,
  Search,
  UserCheck,
  TrendingUp,
  SlidersHorizontal,
  Mail,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface StudentMock {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  applicationsCount: number;
  status: 'Recherche active' | 'Entretien obtenu' | 'Placé' | 'Inactif';
  advisor: string;
}

const initialStudents: StudentMock[] = [
  { id: 1, firstName: 'Lina', lastName: 'Benali', email: 'l.benali@itic-paris.fr', applicationsCount: 12, status: 'Entretien obtenu', advisor: 'M. Dubois' },
  { id: 2, firstName: 'Thomas', lastName: 'Moreau', email: 't.moreau@itic-paris.fr', applicationsCount: 8, status: 'Recherche active', advisor: 'Mme. Martin' },
  { id: 3, firstName: 'Sophie', lastName: 'Lefebvre', email: 's.lefebvre@itic-paris.fr', applicationsCount: 15, status: 'Placé', advisor: 'M. Dubois' },
  { id: 4, firstName: 'Kevin', lastName: 'Nguyen', email: 'k.nguyen@itic-paris.fr', applicationsCount: 3, status: 'Inactif', advisor: 'M. Dubois' },
  { id: 5, firstName: 'Sarah', lastName: 'Gomez', email: 's.gomez@itic-paris.fr', applicationsCount: 10, status: 'Recherche active', advisor: 'Mme. Martin' },
];

export default function AdvisorDashboard() {
  const user = useUserStore((state) => state.user);
  const isAdmin = user?.role === Role.ADMIN;
  const firstName = user?.firstName || 'Conseiller';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [students] = useState<StudentMock[]>(initialStudents);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleNotifyStudent = (email: string) => {
    toast.success(`Rappel par email envoyé à ${email}`);
  };

  const handleExport = () => {
    toast.success("Exportation des données au format CSV lancée !");
  };

  const handleCreateUser = () => {
    toast.info("Redirection vers la création d'utilisateur...");
  };

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
            Suivi global et accompagnement de vos étudiants dans leur recherche d'alternance ou de stage.
          </p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={handleCreateUser}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Créer un conseiller
            </button>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Advisor Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{students.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Étudiants</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <UserCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {students.filter(s => s.status === 'Placé').length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Étudiants Placés</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {students.filter(s => s.status === 'Inactif').length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Besoin de suivi / Inactifs</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-11 w-11 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {(students.reduce((acc, curr) => acc + curr.applicationsCount, 0) / students.length).toFixed(1)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Candidatures moyennes</p>
          </div>
        </div>
      </div>

      {/* Main Student list Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Header / Filter bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Liste des Étudiants</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
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

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
              <SlidersHorizontal className="h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-slate-700 dark:text-slate-350"
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

        {/* Table View */}
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
            <tbody className="divide-y divide-slate-200 dark:divide-slate-850 text-sm">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{student.email}</td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                      {student.applicationsCount}
                    </td>
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
                        onClick={() => toast.info(`Consultation des détails de ${student.firstName}`)}
                        className="inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Consulter le dossier"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleNotifyStudent(student.email)}
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

      {/* Admin Audit Logs block if ADMIN */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            Audit Logs & Activités Système (Admin)
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">ADMIN_BOOTSTRAP</span>
              <span className="text-slate-500">Création de l'utilisateur conseiller `M. Dubois`</span>
              <span className="text-slate-400 font-mono">2026-06-04 12:05</span>
            </div>
            <div className="flex justify-between items-center text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">STUDENT_REGISTER</span>
              <span className="text-slate-500">Inscription validée par OTP pour `lina.benali@itic-paris.fr`</span>
              <span className="text-slate-400 font-mono">2026-06-04 11:32</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
