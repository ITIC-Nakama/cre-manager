import { Outlet, Navigate } from 'react-router-dom';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';
import Sidebar from '../components/head/Sidebar';
import {
  LayoutDashboard, Users, Briefcase, Building2, FileCheck,
  BookOpenCheck, Trophy, UserCog, GraduationCap,
  ScrollText, SlidersHorizontal, Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '../components/head/Sidebar';

export default function AdvisorLayout() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== Role.ADVISOR && user.role !== Role.ADMIN) return <Navigate to="/student/dashboard" replace />;

  const commonItems: NavItem[] = [
    { label: t('dashboard.sidebar.accueil'),            icon: LayoutDashboard, to: '/advisor/dashboard' },
    { label: t('dashboard.sidebar.etudiants'),          icon: Users,           to: '/advisor/etudiants' },
    { label: t('dashboard.sidebar.candidatures_suivi'), icon: Briefcase,       to: '/advisor/candidatures' },
    { label: t('dashboard.sidebar.offres'),             icon: Building2,       to: '/advisor/offres' },
    { label: t('dashboard.sidebar.cv_validation'),      icon: FileCheck,       to: '/advisor/cv' },
    { label: t('dashboard.sidebar.contenu'),            icon: BookOpenCheck,   to: '/advisor/contenu' },
    { label: t('dashboard.sidebar.gamification'),       icon: Trophy,          to: '/advisor/gamification' },
  ];

  const adminItems: NavItem[] = [
    { label: t('dashboard.sidebar.conseillers'),  icon: UserCog,           to: '/advisor/conseillers' },
    { label: t('dashboard.sidebar.promotions'),   icon: GraduationCap,     to: '/advisor/promotions' },
    { label: t('dashboard.sidebar.audit'),        icon: ScrollText,        to: '/advisor/audit' },
    { label: t('dashboard.sidebar.configuration'),icon: SlidersHorizontal, to: '/advisor/config' },
  ];

  const navItems: NavItem[] = [
    ...commonItems,
    ...(user.role === Role.ADMIN ? adminItems : []),
    { label: t('dashboard.sidebar.parametres'), icon: Settings, to: '/advisor/parametres' },
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
