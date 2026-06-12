import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Footer from '../components/footer/Footer';
import { useUserStore } from '../store/UserStore';
import { useTranslation } from 'react-i18next';
import { Globe, Sun, Moon } from 'lucide-react';
import { ThemeStorageKey } from '../types/storage-keys';

function AuthControls() {
  const { i18n } = useTranslation();
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(ThemeStorageKey, next ? 'dark' : 'light');
  };

  const toggleLang = () => {
    const next = (i18n.language || 'fr').startsWith('fr') ? 'en' : 'fr';
    i18n.changeLanguage(next);
  };

  const lang = (i18n.language || 'fr').split('-')[0].toUpperCase();

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1 bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm rounded-xl p-1.5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
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
  );
}

export default function AuthLayout() {
  const user = useUserStore((state) => state.user);

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <AuthControls />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
