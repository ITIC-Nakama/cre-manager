import './App.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import OfflineBanner from './components/common/OfflineBanner'
import StudentLayout from './layouts/StudentLayout'
import SupervisorLayout from './layouts/SupervisorLayout'
import AuthLayout from './layouts/AuthLayout'
import RequireAuthMiddleware from './middleware/RequireAuthMiddleware'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import { useUserStore } from './store/UserStore'
import { Role } from './types/models/Auth'

import { Toaster } from 'sonner'
import StudentDashboard from './pages/student/dashboard/StudentDashboard'
import StudentCVPage from './pages/student/cv/StudentCVPage'
import StudentOffresPage from './pages/student/offres/OffresPage'
import CandidaturesListPage from './pages/student/candidatures/CandidaturesListPage'
import CandidatureDetailPage from './pages/student/candidatures/CandidatureDetailPage'
import SkillTreePage from './pages/student/connaissances/SkillTreePage'
import CategoryArticlesPage from './pages/student/connaissances/CategoryArticlesPage'
import ArticleReaderPage from './pages/student/connaissances/ArticleReaderPage'
import QuizPage from './pages/student/connaissances/QuizPage'
import AdvisorDashboard from './pages/advisor/dashboard/AdvisorDashboard'
import EtudiantsPage from './pages/advisor/etudiants/EtudiantsPage'
import CandidaturesPage from './pages/advisor/candidatures/CandidaturesPage'
import SupervisorOffresPage from './pages/advisor/offres/OffresPage'
import OffresCategoriesPage from './pages/advisor/offres/CategoriesPage'
import ParametresPage from './pages/dashboard/parametres'
import CVValidationPage from './pages/advisor/cv-validation/CVValidationPage'
import ContenuPage from './pages/advisor/formation/ContenuPage'
import GamificationPage from './pages/advisor/gamification/GamificationPage'
import AdvisorPage from './pages/admin/AdvisorPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'
import PromotionsPage from './pages/admin/PromotionsPage'
import PromotionDetailPage from './pages/admin/PromotionDetailPage'
import ChangePasswordRequiredPage from './pages/auth/ChangePasswordRequiredPage'


import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage'
import TermsPage from './pages/legal/TermsPage'
import CookieBanner from './components/common/CookieBanner'
import PwaInstallBanner from './components/common/PwaInstallBanner'

// Redirection component based on role
function DashboardRedirect() {
  return (
    <RequireAuthMiddleware>
      <RoleBasedRedirect />
    </RequireAuthMiddleware>
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
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/home" element={<Navigate to="/login" replace />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        {/* Public Legal Pages */}
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Root dashboard redirection */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/change-password-required" element={<ChangePasswordRequiredPage />} />

        {/* Student Routes */}
        <Route element={<StudentLayout />}>
          <Route path="/student/dashboard"     element={<StudentDashboard />} />
          <Route path="/student/candidatures"  element={<CandidaturesListPage />} />
          <Route path="/student/candidatures/:id" element={<CandidatureDetailPage />} />
          <Route path="/student/offres"        element={<StudentOffresPage />} />
          <Route path="/student/connaissances"                        element={<SkillTreePage />} />
          <Route path="/student/connaissances/:categoryId"            element={<CategoryArticlesPage />} />
          <Route path="/student/connaissances/:categoryId/:articleId" element={<ArticleReaderPage />} />
          <Route path="/student/connaissances/:categoryId/:articleId/quiz" element={<QuizPage />} />
          <Route path="/student/cv"            element={<StudentCVPage />} />
          <Route path="/student/parametres"    element={<ParametresPage />} />
        </Route>

        {/* Advisor / Admin Routes */}
        <Route element={<SupervisorLayout />}>
          <Route path="/supervisor/dashboard"     element={<AdvisorDashboard />} />
          <Route path="/supervisor/etudiants"     element={<EtudiantsPage />} />
          <Route path="/supervisor/candidatures"  element={<CandidaturesPage />} />
          <Route path="/supervisor/offres"        element={<SupervisorOffresPage />} />
          <Route path="/supervisor/offres/categories" element={<OffresCategoriesPage />} />
          <Route path="/supervisor/cv"            element={<CVValidationPage />} />
          <Route path="/supervisor/contenu"       element={<ContenuPage />} />
          <Route path="/supervisor/gamification"  element={<GamificationPage />} />
          <Route path="/supervisor/parametres"    element={<ParametresPage />} />

          {/* Admin-only — advisors are redirected to their dashboard */}
          <Route element={<RequireAuthMiddleware allowedRoles={[Role.ADMIN]} redirectTo="/supervisor/dashboard"><Outlet /></RequireAuthMiddleware>}>
            <Route path="/admin/conseillers" element={<AdvisorPage />} />
            <Route path="/admin/promotions"  element={<PromotionsPage />} />
            <Route path="/admin/promotions/:id" element={<PromotionDetailPage />} />
            <Route path="/admin/audit"       element={<AuditLogsPage />} />
          </Route>

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      <Toaster richColors position="top-right" />
      <CookieBanner />
      <PwaInstallBanner />
    </BrowserRouter>
  )
}

export default App
