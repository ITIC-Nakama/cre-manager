import { Plus, FileText, Briefcase, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../store/UserStore';
import { Role } from '../../types/models/Auth';
import type { StudentRow } from '../../types/models/Dashboard';
import { useDashboardOverview, useStudentList, useNotifyStudent } from '../../hooks/useDashboard';
import DashboardStatCards from './components/DashboardStatCards';
import StatusDistributionPanel from './components/StatusDistributionPanel';
import StudentTable from './components/StudentTable';
import AuditLogPanel from './components/AuditLogPanel';

export default function AdvisorDashboard() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const isAdmin = user?.role === Role.ADMIN;
  const firstName = user?.firstName || t('dashboard.advisor.role_advisor');

  const { data: overview, isLoading: loadingOverview } = useDashboardOverview();
  const { data: studentPage, isLoading: loadingStudents } = useStudentList({ size: 200 });
  const students = studentPage?.content ?? [];
  const notifyMutation = useNotifyStudent();

  const cvsToReview = overview?.cvsToReview ?? 0;

  const handleNotify = async (student: StudentRow, message?: string): Promise<void> => {
    try {
      await notifyMutation.mutateAsync({ studentId: student.id, message });
      toast.success(t('dashboard.notify_modal.success', { name: `${student.firstName} ${student.lastName}` }));
    } catch {
      toast.error(t('dashboard.notify_modal.error', { email: student.email }));
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            {t('dashboard.advisor.greeting', { name: firstName })}
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
              {isAdmin ? t('dashboard.advisor.role_admin') : t('dashboard.advisor.role_advisor')}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.advisor.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => toast.info("Redirection vers la création d'utilisateur...")}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {t('dashboard.advisor.create_advisor')}
            </button>
          )}
        </div>
      </div>

      <DashboardStatCards overview={overview ?? null} loading={loadingOverview} cvsToReview={cvsToReview} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusDistributionPanel
          title={t('dashboard.advisor.cvs_panel.title')}
          icon={FileText}
          items={(overview?.cvsByStatut ?? []).map((s) => ({
            key: s.statutId,
            label: s.statutNom,
            couleur: s.couleur,
            count: s.count,
          }))}
          total={overview?.totalCvs ?? 0}
          loading={loadingOverview}
          emptyLabel={t('dashboard.advisor.cvs_panel.empty')}
          footer={
            overview ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {t('dashboard.advisor.cvs_panel.without_cv', { count: overview.studentsWithoutCv })}
              </p>
            ) : null
          }
        />
        <StatusDistributionPanel
          title={t('dashboard.advisor.apps_panel.title')}
          icon={Briefcase}
          items={(overview?.applicationsByStatus ?? []).map((s) => ({
            key: s.statusNom,
            label: s.statusNom,
            couleur: s.couleur,
            count: s.count,
          }))}
          total={overview?.totalApplications ?? 0}
          loading={loadingOverview}
          emptyLabel={t('dashboard.advisor.apps_panel.empty')}
          footer={
            overview && overview.staleApplicationsCount > 0 ? (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {t('dashboard.advisor.apps_panel.stale', { count: overview.staleApplicationsCount })}
              </p>
            ) : null
          }
        />
      </div>

      <StudentTable
        students={students}
        loading={loadingStudents}
        onNotify={handleNotify}
      />

      {isAdmin && <AuditLogPanel />}
    </div>
  );
}
