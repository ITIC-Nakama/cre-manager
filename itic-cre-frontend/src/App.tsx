import './App.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
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
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/home" element={<Navigate to="/login" replace />} />
        </Route>

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
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/parametres" element={<ParametresPage />} />
        </Route>

        {/* Advisor / Admin Routes */}
        <Route element={<AdvisorLayout />}>
          <Route path="/advisor/dashboard" element={<AdvisorDashboard />} />
          <Route path="/advisor/parametres" element={<ParametresPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App
