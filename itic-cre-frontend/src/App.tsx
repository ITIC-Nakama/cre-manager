import './App.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'

import { Toaster } from 'sonner'
import DashboardPage from './pages/dashboard/dashboard'
import ParametresPage from './pages/dashboard/parametres'

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

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/parametres" element={<ParametresPage />} />
        </Route>
      </Routes>
      
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App

