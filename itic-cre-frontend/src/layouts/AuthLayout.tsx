import { Outlet, Navigate } from 'react-router-dom'
import Footer from '../components/footer/Footer'
import { useUserStore } from '../store/UserStore'

export default function AuthLayout() {
  const user = useUserStore((state) => state.user);

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="flex-1 flex flex-col justify-center my-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
