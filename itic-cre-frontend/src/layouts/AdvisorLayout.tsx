import { Outlet, Navigate } from 'react-router-dom';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';
import Sidebar from '../components/head/Sidebar';
import { LayoutDashboard, Users, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdvisorLayout() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== Role.ADVISOR && user.role !== Role.ADMIN) return <Navigate to="/student/dashboard" replace />;

  const navItems = [
    { label: t('dashboard.sidebar.accueil'),    icon: LayoutDashboard, to: '/advisor/dashboard' },
    { label: t('dashboard.sidebar.etudiants'),  icon: Users,           to: '/advisor/dashboard' },
    { label: t('dashboard.sidebar.parametres'), icon: Settings,        to: '/advisor/parametres' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar navItems={navItems} />
      <main className="flex-1 overflow-y-auto min-h-screen pt-16 lg:pt-0">
        <div className="max-w-screen-xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
