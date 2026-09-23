import { Outlet, Navigate } from 'react-router-dom';
import Footer from '../components/footer/Footer';
import AuthControls from '../components/common/AuthControls';
import AlumniFormLink from '../components/common/AlumniFormLink';
import { useUserStore } from '../store/UserStore';

export default function AuthLayout() {
  const user = useUserStore((state) => state.user);

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <AuthControls>
        <AlumniFormLink
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-[#9aa0a6] hover:bg-slate-100 dark:hover:bg-[#1e2130] transition-colors cursor-pointer"
          labelClassName="hidden sm:inline"
        />
      </AuthControls>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
