import { Outlet, Navigate } from 'react-router-dom';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';
import Sidebar from '../components/head/Sidebar';
import { LayoutDashboard, Briefcase, BookOpen, FileText, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function StudentLayout() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== Role.STUDENT) return <Navigate to="/advisor/dashboard" replace />;

  const navItems = [
    { label: t('dashboard.sidebar.accueil'),       icon: LayoutDashboard, to: '/student/dashboard' },
    { label: t('dashboard.sidebar.candidatures'),  icon: Briefcase,       to: '/student/candidatures' },
    { label: t('dashboard.sidebar.formation'),     icon: BookOpen,        to: '/student/formation' },
    { label: t('dashboard.sidebar.cv'),            icon: FileText,        to: '/student/cv' },
    { label: t('dashboard.sidebar.profil'),        icon: User,            to: '/student/parametres' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar navItems={navItems} />
      <main className="flex-1 overflow-y-auto min-h-screen lg:pl-0 pt-16 lg:pt-0">
        <div className="max-w-screen-xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
