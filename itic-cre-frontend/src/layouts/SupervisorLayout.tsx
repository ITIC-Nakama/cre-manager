import { Outlet } from 'react-router-dom';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';
import RequireAuth from './RequireAuth';
import Sidebar from '../components/head/Sidebar';
import {
  LayoutDashboard, Users, Briefcase, Building2, FileCheck,
  BookOpenCheck, Trophy, UserCog, GraduationCap,
  ScrollText, User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '../components/head/Sidebar';

export default function SupervisorLayout() {
  const { t } = useTranslation();
  const { user } = useUserStore();

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
    ...(user?.role === Role.ADMIN ? adminItems : []),
    { label: t('dashboard.sidebar.profil'), icon: User, to: '/supervisor/parametres' },
  ];

  return (
    <RequireAuth allowedRoles={[Role.ADVISOR, Role.ADMIN]} redirectTo="/student/dashboard">
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar navItems={navItems} />
        <main className="flex-1 overflow-y-auto min-h-screen pt-14 lg:pt-0">
          <div className="max-w-screen-xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}

