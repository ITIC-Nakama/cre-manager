import { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useUserStore } from '../store/UserStore';
import { Role } from '../types/models/Auth';
import RequireAuthMiddleware from '../middleware/RequireAuthMiddleware';
import Sidebar from '../components/head/Sidebar';
import {
  LayoutDashboard, Users, Briefcase, Building2, FileCheck,
  BookOpenCheck, Trophy, UserCog, GraduationCap,
  ScrollText, User, Settings, MessageCircleWarning
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '../components/head/Sidebar';
import { useResetScrollOnNavigate } from '../hooks/useResetScrollOnNavigate';
import { usePendingReclamationsCount } from '../hooks/useReclamations';
import { useCvPendingCount, useContractPendingCount } from '../hooks/useDashboard';

export default function SupervisorLayout() {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const mainRef = useRef<HTMLElement>(null);
  useResetScrollOnNavigate(mainRef);
  const { data: pendingReclamationsCount } = usePendingReclamationsCount();
  const { data: cvPendingCount } = useCvPendingCount();
  const { data: contractPendingCount } = useContractPendingCount();

  const isAdmin = user?.role === Role.ADMIN;

  const commonItems: NavItem[] = [
    { label: t('dashboard.sidebar.accueil'),            icon: LayoutDashboard, to: '/supervisor/dashboard' },
    { label: t('dashboard.sidebar.etudiants'),          icon: Users,           to: '/supervisor/etudiants' },
    { label: t('dashboard.sidebar.candidatures_suivi'), icon: Briefcase,       to: '/supervisor/candidatures', badge: contractPendingCount },
    { label: t('dashboard.sidebar.offres'),             icon: Building2,       to: '/supervisor/offres' },
    { label: t('dashboard.sidebar.cv_validation'),      icon: FileCheck,       to: '/supervisor/cv', badge: cvPendingCount },
    { label: t('dashboard.sidebar.reclamations', 'Réclamations'), icon: MessageCircleWarning, to: '/supervisor/reclamations', badge: pendingReclamationsCount },
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
        <main ref={mainRef} className="flex-1 overflow-y-auto h-full pt-14 lg:pt-0">
          <div className="max-w-screen-xl mx-auto px-4 pt-8 pb-8 sm:px-6 sm:pt-8 sm:pb-6 lg:px-8 lg:pt-10 lg:pb-8">
            <Outlet />
          </div>
        </main>
      </div>
    </RequireAuthMiddleware>
  );
}
