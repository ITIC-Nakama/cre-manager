import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Settings, LogOut, Menu, X } from 'lucide-react';
import { useUserStore } from '../../store/UserStore';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/itic-paris-logo-white.svg';
import ToggleDarkMode from '../basics/ToggleDarkMode';
import SwitchLanguage from '../basics/SwitchLanguage';

export default function DashboardNavBar() {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      useUserStore.getState().clearUser();
    } finally {
      setMobileOpen(false);
      navigate('/login');
    }
  };

  const navLinks = [
    { label: t('dashboard.sidebar.accueil', 'Accueil'), path: '/dashboard', icon: Home, end: true },
    { label: t('dashboard.sidebar.parametres', 'Paramètres'), path: '/dashboard/parametres', icon: Settings },
  ];

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <div className="flex items-center gap-8">
            <button onClick={() => navigate('/dashboard')} className="flex-shrink-0 cursor-pointer">
              <img src={logo} alt="ITIC CRE" className="h-8 w-auto" />
            </button>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <ToggleDarkMode />
              <SwitchLanguage />
            </div>

            {/* User avatar + name (desktop) */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
              <div className="h-8 w-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                {getInitials()}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {user?.firstName} {user?.lastName}
              </span>
            </div>

            {/* Logout button (desktop) */}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800/40 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {t('dashboard.sidebar.logout', 'Déconnexion')}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-1">
            {/* User info */}
            <div className="flex items-center gap-3 px-3 py-2 mb-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="h-9 w-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                {getInitials()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
            </div>

            {/* Nav links */}
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </NavLink>
              );
            })}

            {/* Toggles */}
            <div className="flex items-center gap-3 px-3 pt-2">
              <ToggleDarkMode />
              <SwitchLanguage />
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer mt-1"
            >
              <LogOut className="h-4 w-4" />
              {t('dashboard.sidebar.logout', 'Déconnexion')}
            </button>
          </div>
        )}
      </header>
    </>
  );
}
