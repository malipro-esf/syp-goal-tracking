import { Navigate, Outlet } from 'react-router-dom'
import { AppHeader } from '../../app/AppHeader'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { isLoading, user } = useAuth()
  if (isLoading) return <main className="page-shell">Restoring your session…</main>
  return user ? <><AppHeader /><Outlet /></> : <Navigate to="/login" replace />
}
