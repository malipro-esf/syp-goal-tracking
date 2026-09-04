import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthForm } from '../features/auth/AuthForm'
import { AdminPage } from '../features/admin/AdminPage'
import { AdminUserPage } from '../features/admin/AdminUserPage'
import { AdminUsersPage } from '../features/admin/AdminUsersPage'
import { AdminPlanPage } from '../features/admin/AdminPlanPage'
import { AdminPlansPage } from '../features/admin/AdminPlansPage'
import { AdminAssignmentsPage } from '../features/admin/AdminAssignmentsPage'
import { AdminSettingsPage } from '../features/admin/AdminSettingsPage'
import { AdminReportsPage } from '../features/admin/AdminReportsPage'
import { DashboardPage } from '../features/auth/DashboardPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { ProfileSettingsPage } from '../features/auth/ProfileSettingsPage'
import { CoachingPage } from '../features/coaching/CoachingPage'
import { CoachEnrollmentPage } from '../features/coaching/CoachEnrollmentPage'
import { CoachParticipantsPage } from '../features/coaching/CoachParticipantsPage'
import { PlanDetailPage } from '../features/plans/PlanDetailPage'
import { PlanListPage } from '../features/plans/PlanListPage'
import { LandingPage } from './LandingPage'
import { HowItWorksPage } from './HowItWorksPage'
import { FeaturesPage } from './FeaturesPage'
import { ForCoachesPage } from './ForCoachesPage'
import { RouteSeo } from './RouteSeo'
import { NotificationsPage } from '../features/notifications/NotificationsPage'
import './app.css'

export function App() {
  return (
    <><RouteSeo /><Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/for-coaches" element={<ForCoachesPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserPage />} />
        <Route path="/admin/plans" element={<AdminPlansPage />} />
        <Route path="/admin/plans/:planId" element={<AdminPlanPage />} />
        <Route path="/admin/assignments" element={<AdminAssignmentsPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/settings/profile" element={<ProfileSettingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/plans" element={<PlanListPage />} />
        <Route path="/plans/:planId" element={<PlanDetailPage />} />
        <Route path="/coaching" element={<CoachingPage />} />
        <Route path="/coach/enrollments/:enrollmentId" element={<CoachEnrollmentPage />} />
        <Route path="/coach/participants" element={<CoachParticipantsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></>
  )
}
