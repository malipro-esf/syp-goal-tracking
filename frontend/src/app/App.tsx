import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthForm } from '../features/auth/AuthForm'
import { DashboardPage } from '../features/auth/DashboardPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import './app.css'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
