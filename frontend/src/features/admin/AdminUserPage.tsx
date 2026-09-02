import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { ApiError, apiRequest } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { AdminLayout } from './AdminLayout'

type AdminUser = { id: string; email: string; display_name: string; country_code: string | null; status: string; roles: string[]; created_at: string }
const availableRoles = ['participant', 'coach', 'admin'] as const

export function AdminUserPage() {
  const { userId } = useParams()
  const { accessToken, user: currentUser } = useAuth()
  const [managedUser, setManagedUser] = useState<AdminUser | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const isAdmin = currentUser?.roles.includes('admin')
  useEffect(() => {
    if (!accessToken || !isAdmin || !userId) return
    apiRequest<AdminUser>(`/api/v1/admin/users/${userId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((result) => { setManagedUser(result); setRoles(result.roles) })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'User could not be loaded.'))
  }, [accessToken, isAdmin, userId])
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  if (!managedUser) return <main className="workspace-shell">{error || 'Loading user…'}</main>
  const user = managedUser
  const headers = { Authorization: `Bearer ${accessToken}` }
  async function saveRoles() {
    if (!window.confirm(`Save role changes for ${user.display_name}?`)) return
    try { const updated = await apiRequest<AdminUser>(`/api/v1/admin/users/${userId}/roles`, { method: 'PUT', headers, body: JSON.stringify({ roles }) }); setManagedUser(updated); setRoles(updated.roles); setMessage('Roles updated.'); setError('') }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Roles could not be updated.') }
  }
  async function toggleStatus() {
    const next = user.status === 'active' ? 'disabled' : 'active'
    if (!window.confirm(`${next === 'disabled' ? 'Disable' : 'Enable'} ${user.display_name}?`)) return
    try { const updated = await apiRequest<AdminUser>(`/api/v1/admin/users/${userId}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: next }) }); setManagedUser(updated); setMessage(`Account ${next}.`); setError('') }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Status could not be updated.') }
  }
  return <AdminLayout active="users" title={user.display_name} description={user.email}><div className="admin-user-page"><Link to="/admin#users">← Back to users</Link>{message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <section className="card"><h2>Account status</h2><p><span className="status-badge">{user.status}</span></p><button type="button" className="secondary-button" onClick={toggleStatus}>{user.status === 'active' ? 'Disable account' : 'Enable account'}</button></section>
    <section className="card"><h2>Roles</h2><fieldset className="admin-role-list"><legend>Assigned roles</legend>{availableRoles.map((role) => <label className="checkbox-label" key={role}><input type="checkbox" checked={roles.includes(role)} onChange={(event) => setRoles((current) => event.target.checked ? [...current, role] : current.filter((item) => item !== role))} />{role}</label>)}</fieldset><button type="button" onClick={saveRoles}>Save roles</button></section>
  </div></AdminLayout>
}
