import './App.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import StudentLayout from './layouts/StudentLayout'
import SupervisorLayout from './layouts/SupervisorLayout'
import AuthLayout from './layouts/AuthLayout'
import RequireAuth from './layouts/RequireAuth'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import { useUserStore } from './store/UserStore'
import { Role } from './types/models/Auth'

import { Toaster } from 'sonner'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentOffresPage from './pages/student/OffresPage'
import AdvisorDashboard from './pages/advisor/AdvisorDashboard'
import EtudiantsPage from './pages/advisor/EtudiantsPage'
import CandidaturesPage from './pages/advisor/CandidaturesPage'
import SupervisorOffresPage from './pages/advisor/OffresPage'
import ComingSoonPage from './pages/ComingSoonPage'
import ParametresPage from './pages/dashboard/parametres'
import CVValidationPage from './pages/advisor/CVValidationPage'
import ContenuPage from './pages/advisor/ContenuPage'
import GamificationPage from './pages/advisor/GamificationPage'
import AdvisorPage from './pages/admin/AdvisorPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'
import PromotionsPage from './pages/admin/PromotionsPage'
import ChangePasswordRequiredPage from './pages/auth/ChangePasswordRequiredPage'


// Redirection component based on role
function DashboardRedirect() {
  return (
    <RequireAuth>
      <RoleBasedRedirect />
    </RequireAuth>
  );
}

function RoleBasedRedirect() {
  const user = useUserStore((state) => state.user);

  if (user?.role === Role.STUDENT) {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (user?.role === Role.ADVISOR || user?.role === Role.ADMIN) {
    return <Navigate to="/supervisor/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return ( 
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/home" element={<Navigate to="/login" replace />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        {/* Root dashboard redirection */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/change-password-required" element={<ChangePasswordRequiredPage />} />

        {/* Student Routes */}
        <Route element={<StudentLayout />}>
          <Route path="/student/dashboard"     element={<StudentDashboard />} />
          <Route path="/student/candidatures"  element={<ComingSoonPage />} />
          <Route path="/student/offres"        element={<StudentOffresPage />} />
          <Route path="/student/formation"     element={<ComingSoonPage />} />
          <Route path="/student/cv"            element={<ComingSoonPage />} />
          <Route path="/student/parametres"    element={<ParametresPage />} />
        </Route>

        {/* Advisor / Admin Routes */}
        <Route element={<SupervisorLayout />}>
          <Route path="/supervisor/dashboard"     element={<AdvisorDashboard />} />
          <Route path="/supervisor/etudiants"     element={<EtudiantsPage />} />
          <Route path="/supervisor/candidatures"  element={<CandidaturesPage />} />
          <Route path="/supervisor/offres"        element={<SupervisorOffresPage />} />
          <Route path="/supervisor/cv"            element={<CVValidationPage />} />
          <Route path="/supervisor/contenu"       element={<ContenuPage />} />
          <Route path="/supervisor/gamification"  element={<GamificationPage />} />
          <Route path="/supervisor/parametres"    element={<ParametresPage />} />

          {/* Admin-only — advisors are redirected to their dashboard */}
          <Route element={<RequireAuth allowedRoles={[Role.ADMIN]} redirectTo="/supervisor/dashboard"><Outlet /></RequireAuth>}>
            <Route path="/admin/conseillers" element={<AdvisorPage />} />
            <Route path="/admin/promotions"  element={<PromotionsPage />} />
            <Route path="/admin/audit"       element={<AuditLogsPage />} />
          </Route>

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App
