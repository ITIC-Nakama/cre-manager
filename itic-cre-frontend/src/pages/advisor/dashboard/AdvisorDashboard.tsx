import { Plus, FileText, Briefcase, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../../store/UserStore';
import { Role } from '../../../types/models/Auth';
import type { StudentRow } from '../../../types/models/Dashboard';
import { useDashboardOverview, useStudentList, useNotifyStudent } from '../../../hooks/useDashboard';
import DashboardStatCards from './components/DashboardStatCards';
import StatusDistributionPanel from './components/StatusDistributionPanel';
import StudentTable from './components/StudentTable';
import AuditLogPanel from './components/AuditLogPanel';

export default function AdvisorDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const isAdmin = user?.role === Role.ADMIN;
  const firstName = user?.firstName || t('dashboard.advisor.role_advisor');

  const { data: overview, isLoading: loadingOverview } = useDashboardOverview();
  const { data: studentPage, isLoading: loadingStudents } = useStudentList({ size: 200 });
  const students = studentPage?.content ?? [];
  const notifyMutation = useNotifyStudent();

  const handleNotifyStudent = async (student: StudentRow, customMessage?: string) => {
    try {
      await notifyMutation.mutateAsync({ studentId: student.id, message: customMessage });
      toast.success(t('dashboard.advisor.toast_reminder_sent', { name: `${student.firstName} ${student.lastName}` }));
    } catch {
      toast.error(t('dashboard.advisor.toast_reminder_error'));
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bonjour, <span className="itic-gradient-warm">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-1">
            {t('dashboard.advisor.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/supervisor/offres')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t('dashboard.advisor.quick_publish_offer')}
          </button>
          <button
            onClick={() => navigate('/supervisor/candidatures')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Briefcase className="h-4 w-4 text-indigo-500" />
            {t('dashboard.advisor.quick_view_apps')}
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <DashboardStatCards overview={overview} loading={loadingOverview} />

      {/* Main Grid: Status Distribution & Stale Alert Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StatusDistributionPanel
            title={t('dashboard.advisor.status_distribution_title', 'Répartition des candidatures')}
            icon={FileText}
            items={(overview?.applicationsByStatus ?? []).map((s, idx) => ({
              key: s.statusNom || `status-${idx}`,
              label: s.statusNom,
              couleur: s.couleur || '#6366f1',
              count: s.count,
            }))}
            total={overview?.totalApplications ?? 0}
            loading={loadingOverview}
            emptyLabel={t('dashboard.advisor.status_distribution_empty', 'Aucune candidature')}
          />
        </div>

        {/* Quick Action / Alert Card */}
        <div className="flex flex-col gap-4">
          {overview?.staleApplicationsCount && overview.staleApplicationsCount > 0 ? (
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-6 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold mb-2">
                  <AlertCircle className="h-5 w-5" />
                  {t('dashboard.advisor.stale_card.title')}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('dashboard.advisor.stale_card.message', { count: overview.staleApplicationsCount })}
                </p>
              </div>
              <button
                onClick={() => navigate('/supervisor/candidatures')}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {t('dashboard.advisor.stale_card.btn_view')}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-6 flex flex-col justify-between shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                <FileText className="h-5 w-5" />
                {t('dashboard.advisor.all_clean_card.title')}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                {t('dashboard.advisor.all_clean_card.message')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Student List Widget (Requires Attention) */}
      <StudentTable students={students} loading={loadingStudents} onNotify={handleNotifyStudent} />

      {/* Admin Audit Trail */}
      {isAdmin && <AuditLogPanel />}
    </div>
  );
}
