import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { ApiError, apiRequest } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { AdminLayout } from './AdminLayout'

type AdminUser = {
  id: string
  email: string
  display_name: string
  country_code: string | null
  status: 'active' | 'disabled'
  roles: string[]
  created_at: string
}

type UserPage = { items: AdminUser[]; total: number; page: number; page_size: number }

export function AdminUsersPage() {
  const { accessToken, user } = useAuth()
  const [searchParams] = useSearchParams()
  const [users, setUsers] = useState<UserPage | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [role, setRole] = useState(searchParams.get('role') ?? '')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isAdmin = user?.roles.includes('admin')

  useEffect(() => {
    if (!accessToken || !isAdmin) return
    const params = new URLSearchParams({ page: String(page), page_size: '25' })
    if (search.trim()) params.set('search', search.trim())
    if (status) params.set('status', status)
    if (role) params.set('role', role)
    apiRequest<UserPage>(`/api/v1/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((result) => { setUsers(result); setError('') })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Users could not be loaded.'))
      .finally(() => setLoading(false))
  }, [accessToken, isAdmin, page, role, search, status])

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return <AdminLayout active="users" title="Users" description="Search accounts and manage access, roles, and status.">
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="card admin-users">
      <div className="section-heading"><div><p className="eyebrow">Accounts</p><h2>User directory</h2></div><span className="section-count">{users?.total ?? 0}</span></div>
      <div className="admin-user-filters">
        <label>Search<input type="search" value={search} placeholder="Name or email" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label>
        <label>Role<select value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }}><option value="">All roles</option><option value="participant">Participant</option><option value="coach">Coach</option><option value="admin">Administrator</option></select></label>
        <label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
      </div>
      {loading ? <p>Loading users…</p> : <div className="table-scroll"><table><thead><tr><th>User</th><th>Roles</th><th>Country</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
        {users?.items.map((item) => <tr key={item.id}><td><strong>{item.display_name}</strong><small>{item.email}</small></td><td>{item.roles.join(', ') || 'No role'}</td><td>{item.country_code ?? '—'}</td><td><span className={`status-badge status-${item.status}`}>{item.status}</span></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td><Link to={`/admin/users/${item.id}`}>Manage user</Link></td></tr>)}
        {users?.items.length === 0 && <tr><td colSpan={6}>No users match these filters.</td></tr>}
      </tbody></table></div>}
      {users && users.total > users.page_size && <div className="button-row"><button type="button" className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {Math.ceil(users.total / users.page_size)}</span><button type="button" className="secondary-button" disabled={page * users.page_size >= users.total} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </section>
  </AdminLayout>
}
