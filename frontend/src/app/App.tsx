import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthForm } from '../features/auth/AuthForm'
import { DashboardPage } from '../features/auth/DashboardPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { CoachingPage } from '../features/coaching/CoachingPage'
import { CoachEnrollmentPage } from '../features/coaching/CoachEnrollmentPage'
import { PlanDetailPage } from '../features/plans/PlanDetailPage'
import { PlanListPage } from '../features/plans/PlanListPage'
import './app.css'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/plans" element={<PlanListPage />} />
        <Route path="/plans/:planId" element={<PlanDetailPage />} />
        <Route path="/coaching" element={<CoachingPage />} />
        <Route path="/coach/enrollments/:enrollmentId" element={<CoachEnrollmentPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
