import './App.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import StudentLayout from './layouts/StudentLayout'
import AdvisorLayout from './layouts/AdvisorLayout'
import AuthLayout from './layouts/AuthLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import { useUserStore } from './store/UserStore'
import { Role } from './types/models/Auth'

import { Toaster } from 'sonner'
import StudentDashboard from './pages/student/StudentDashboard'
import AdvisorDashboard from './pages/advisor/AdvisorDashboard'
import EtudiantsPage from './pages/advisor/EtudiantsPage'
import ComingSoonPage from './pages/ComingSoonPage'
import ParametresPage from './pages/dashboard/parametres'

// Redirection component based on role
function DashboardRedirect() {
  const user = useUserStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === Role.STUDENT) {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (user.role === Role.ADVISOR || user.role === Role.ADMIN) {
    return <Navigate to="/advisor/dashboard" replace />;
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

        {/* Student Routes */}
        <Route element={<StudentLayout />}>
          <Route path="/student/dashboard"     element={<StudentDashboard />} />
          <Route path="/student/candidatures"  element={<ComingSoonPage />} />
          <Route path="/student/offres"        element={<ComingSoonPage />} />
          <Route path="/student/formation"     element={<ComingSoonPage />} />
          <Route path="/student/cv"            element={<ComingSoonPage />} />
          <Route path="/student/parametres"    element={<ParametresPage />} />
        </Route>

        {/* Advisor / Admin Routes */}
        <Route element={<AdvisorLayout />}>
          <Route path="/advisor/dashboard"     element={<AdvisorDashboard />} />
          <Route path="/advisor/etudiants"     element={<EtudiantsPage />} />
          <Route path="/advisor/candidatures"  element={<ComingSoonPage />} />
          <Route path="/advisor/offres"        element={<ComingSoonPage />} />
          <Route path="/advisor/cv"            element={<ComingSoonPage />} />
          <Route path="/advisor/contenu"       element={<ComingSoonPage />} />
          <Route path="/advisor/gamification"  element={<ComingSoonPage />} />
          <Route path="/advisor/conseillers"   element={<ComingSoonPage />} />
          <Route path="/advisor/promotions"    element={<ComingSoonPage />} />
          <Route path="/advisor/audit"         element={<ComingSoonPage />} />
          <Route path="/advisor/config"        element={<ComingSoonPage />} />
          <Route path="/advisor/parametres"    element={<ParametresPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App
