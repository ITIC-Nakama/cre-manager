import { Outlet, Navigate } from 'react-router-dom';
import Footer from '../components/footer/Footer';
import { useUserStore } from '../store/UserStore';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

function AuthControls() {
  const { i18n } = useTranslation();

  const toggleLang = () => {
    const next = (i18n.language || 'fr').startsWith('fr') ? 'en' : 'fr';
    i18n.changeLanguage(next);
  };

  const lang = (i18n.language || 'fr').split('-')[0].toUpperCase();

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1 bg-white dark:bg-[#15171f] rounded-xl p-1.5 shadow-sm">
      <button
        onClick={toggleLang}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-[#9aa0a6] hover:bg-slate-100 dark:hover:bg-[#1e2130] transition-colors cursor-pointer"
      >
        <Globe className="h-3.5 w-3.5" />
        {lang}
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
