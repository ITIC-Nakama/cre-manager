import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Sun, Moon, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUserStore } from '../../store/UserStore';
import { Role } from '../../types/models/Auth';
import { useTranslation } from 'react-i18next';
import { ThemeStorageKey, SidebarCollapsedStorageKey } from '../../types/storage-keys';
import logoDark from '../../assets/itic-paris-logo-dark.svg';
import logoWhite from '../../assets/itic-paris-logo-white.svg';
import UserAvatar from '../shared/UserAvatar';
import { toUserProfileDTO } from '../../types/models/User';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateProfile } from '../../hooks/useAuth';

export interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}

interface SidebarProps {
  navItems: NavItem[];
}

function SidebarContent({
  navItems,
  onNavClick,
  collapsed = false,
}: {
  navItems: NavItem[];
  onNavClick?: () => void;
  collapsed?: boolean;
}) {
  const { user, setUser, logout } = useUserStore();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(ThemeStorageKey, next ? 'dark' : 'light');
  };

  const toggleLang = () => {
    const nextLang = (i18n.language || 'fr').startsWith('fr') ? 'en' : 'fr';

    // Mettre à jour la langue locale et rafraîchir le dashboard immédiatement
    i18n.changeLanguage(nextLang);
    queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });

    // Synchronisation facultative avec la base de données en arrière-plan
    if (user) {
      updateProfile.mutate(
        { lang: nextLang },
        {
          onSuccess: (data) => {
            const updated = toUserProfileDTO(data);
            setUser(updated);
          },
          onError: (err) => {
            console.error("Échec de la synchronisation de la langue sur le backend :", err);
          },
        }
      );
    }
  };

  const lang = (i18n.language || 'fr').split('-')[0].toUpperCase();
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';
  const roleLabel =
    user?.role === Role.STUDENT
      ? t('roles.student', 'Étudiant')
      : user?.role === Role.ADMIN
      ? t('roles.admin', 'Admin')
      : t('roles.advisor', 'Conseiller');

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`border-b border-slate-100 dark:border-slate-800 flex items-center ${collapsed ? 'justify-center py-5' : 'px-5 py-5'}`}>
        {collapsed ? (
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0" title="ITIC Paris">
            IT
          </div>
        ) : (
          <div className="inline-flex items-center rounded-xl px-4 py-2.5">
            <img src={logoDark} alt="ITIC Paris" className="h-7 w-auto dark:hidden" />
            <img src={logoWhite} alt="ITIC Paris" className="h-7 w-auto hidden dark:block" />
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: theme + lang + user */}
      {(() => {
        const profilePath = user?.role === Role.STUDENT ? '/student/parametres' : '/supervisor/parametres';
        return (
          <div className={`border-t border-slate-100 dark:border-slate-800 space-y-3 ${collapsed ? 'px-2 pt-3 pb-4' : 'px-4 pt-3 pb-4'}`}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-2.5">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={isDark ? 'Mode clair' : 'Mode sombre'}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    onNavClick?.();
                    navigate(profilePath);
                  }}
                  className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={fullName}
                >
                  <UserAvatar profilePicture={user?.profilePicture} firstName={user?.firstName ?? ''} lastName={user?.lastName ?? ''} />
                </button>
                <button
                  onClick={() => logout().then(() => navigate('/login'))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                  title="Déconnexion"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleLang}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {lang}
                  </button>
                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                  <button
                    onClick={toggleTheme}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label={isDark ? 'Mode clair' : 'Mode sombre'}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => {
                      onNavClick?.();
                      navigate(profilePath);
                    }}
                    className="flex items-center gap-2.5 flex-1 min-w-0 p-1 -m-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group/user"
                    title={t('dashboard.sidebar.profil', 'Profil')}
                  >
                    <UserAvatar profilePicture={user?.profilePicture} firstName={user?.firstName ?? ''} lastName={user?.lastName ?? ''} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover/user:text-indigo-600 dark:group-hover/user:text-indigo-400 truncate transition-colors">{fullName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => logout().then(() => navigate('/login'))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer flex-shrink-0"
                    title="Déconnexion"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default function Sidebar({ navItems }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SidebarCollapsedStorageKey) === 'true'
  );

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SidebarCollapsedStorageKey, String(next));
  };

  return (
    <>
      {/* Bouton burger mobile */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
      </button>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent navItems={navItems} onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex flex-col min-h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 relative transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent navItems={navItems} collapsed={collapsed} />
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3.5 top-20 h-7 w-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors z-10"
          aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>
    </>
  );
}
