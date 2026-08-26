import { Outlet } from 'react-router-dom';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';
import RequireAuthMiddleware from '../middleware/RequireAuthMiddleware';
import Sidebar from '../components/head/Sidebar';
import {
  LayoutDashboard, Users, Briefcase, Building2, FileCheck,
  BookOpenCheck, Trophy, UserCog, GraduationCap,
  ScrollText, User, Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '../components/head/Sidebar';

export default function SupervisorLayout() {
  const { t } = useTranslation();
  const { user } = useUserStore();

  const isAdmin = user?.role === Role.ADMIN;

  const commonItems: NavItem[] = [
    { label: t('dashboard.sidebar.accueil'),            icon: LayoutDashboard, to: '/supervisor/dashboard' },
    { label: t('dashboard.sidebar.etudiants'),          icon: Users,           to: '/supervisor/etudiants' },
    { label: t('dashboard.sidebar.candidatures_suivi'), icon: Briefcase,       to: '/supervisor/candidatures' },
    { label: t('dashboard.sidebar.offres'),             icon: Building2,       to: '/supervisor/offres' },
    { label: t('dashboard.sidebar.cv_validation'),      icon: FileCheck,       to: '/supervisor/cv' },
    { label: t('dashboard.sidebar.contenu'),            icon: BookOpenCheck,   to: '/supervisor/contenu' },
    { label: t('dashboard.sidebar.gamification'),       icon: Trophy,          to: '/supervisor/gamification' },
  ];

  const adminItems: NavItem[] = [
    { label: t('dashboard.sidebar.conseillers'),  icon: UserCog,       to: '/admin/conseillers' },
    { label: t('dashboard.sidebar.promotions'),   icon: GraduationCap, to: '/admin/promotions' },
    { label: t('dashboard.sidebar.audit'),        icon: ScrollText,    to: '/admin/audit' },
  ];

  const navItems: NavItem[] = [
    ...commonItems,
    ...(isAdmin ? adminItems : []),
    {
      label: isAdmin
        ? t('dashboard.sidebar.parametres', 'Paramètres')
        : t('dashboard.sidebar.profil', 'Profil'),
      icon: isAdmin ? Settings : User,
      to: '/supervisor/parametres',
    },
  ];

  return (
    <RequireAuthMiddleware allowedRoles={[Role.ADVISOR, Role.ADMIN]} redirectTo="/student/dashboard">
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#020203]">
        <Sidebar navItems={navItems} />
        <main className="flex-1 overflow-y-auto h-full pt-16 lg:pt-0">
          <div className="max-w-screen-xl mx-auto px-4 pt-6 pb-8 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </RequireAuthMiddleware>
  );
}

