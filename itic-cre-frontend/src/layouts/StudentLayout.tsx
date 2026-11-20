import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { pageWidthFor, PAGE_WIDTH_CLASS } from './pageWidth';
import { Role } from '../types/models/Auth';
import RequireAuthMiddleware from '../middleware/RequireAuthMiddleware';
import Sidebar from '../components/head/Sidebar';
import { LayoutDashboard, Briefcase, Building2, Compass, FileText, MessagesSquare, User, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useResetScrollOnNavigate } from '../hooks/useResetScrollOnNavigate';
import LevelUpWatcher from '../components/gamification/LevelUpWatcher';
import { useMyConversationUnreadCount } from '../hooks/useConversations';

export default function StudentLayout() {
  const { t } = useTranslation();
  const mainRef = useRef<HTMLElement>(null);
  // Largeur du contenu selon la page (lot 11) : pleine largeur pour les pages à tableau.
  const pageWidth = pageWidthFor(useLocation().pathname);
  useResetScrollOnNavigate(mainRef);
  // Messagerie : messages de l'équipe non lus (une requête par minute).
  const { data: unreadMessages } = useMyConversationUnreadCount();

  const navItems = [
    { label: t('dashboard.sidebar.accueil'),       icon: LayoutDashboard, to: '/student/dashboard' },
    { label: t('dashboard.sidebar.candidatures'),  icon: Briefcase,       to: '/student/candidatures' },
    { label: t('dashboard.sidebar.offres'),        icon: Building2,       to: '/student/offres' },
    { label: t('dashboard.sidebar.messages', 'Messages'), icon: MessagesSquare, to: '/student/messages', badge: unreadMessages },
    { label: t('dashboard.sidebar.conseillers_directory', 'Conseillers'), icon: Users, to: '/student/conseillers' },
    { label: t('dashboard.sidebar.formation'),     icon: Compass,         to: '/student/connaissances' },
    { label: t('dashboard.sidebar.cv'),            icon: FileText,        to: '/student/cv' },
    { label: t('dashboard.sidebar.profil'),        icon: User,            to: '/student/parametres' },
  ];

  return (
    <RequireAuthMiddleware allowedRoles={[Role.STUDENT]} redirectTo="/supervisor/dashboard">
      <LevelUpWatcher />
      {/* Lot 10 : plus de bouton « Contacter l'équipe » (demandes d'aide) : la messagerie (menu « Messages ») le remplace. */}
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#020203]">
        <Sidebar navItems={navItems} />
        <main ref={mainRef} className="flex-1 overflow-y-auto h-full lg:pl-0 pt-14 lg:pt-0">
          <div data-page-width={pageWidth} className={`${PAGE_WIDTH_CLASS[pageWidth]} mx-auto px-4 pt-3 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pt-10 lg:pb-8`}>
            <Outlet />
          </div>
          {/* Place de la bannière « Installer l'application » : le bas de la page reste au-dessus d'elle. */}
          <div aria-hidden="true" style={{ height: 'var(--pwa-banner-space, 0px)' }} />
        </main>
      </div>
    </RequireAuthMiddleware>
  );
}
