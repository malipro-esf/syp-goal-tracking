import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { apiRequest, ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'

type Metrics = { users: number; participants: number; coaches: number; active_plans: number; pending_invitations: number }
type AdminUser = { id: string; email: string; display_name: string; country_code: string | null; status: string; roles: string[]; created_at: string }
type UserPage = { items: AdminUser[]; total: number; page: number; page_size: number }
type AuditPage = { items: { id: string; admin_name: string; target_name: string | null; action: string; changes: Record<string, unknown>; created_at: string }[]; total: number }

export function AdminPage() {
  const { accessToken, user } = useAuth()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [users, setUsers] = useState<UserPage | null>(null)
  const [audit, setAudit] = useState<AuditPage | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const isAdmin = user?.roles.includes('admin')

  useEffect(() => {
    if (!accessToken || !isAdmin) return
    const headers = { Authorization: `Bearer ${accessToken}` }
    const params = new URLSearchParams({ page: String(page), page_size: '25' })
    if (search.trim()) params.set('search', search.trim())
    Promise.all([
      apiRequest<Metrics>('/api/v1/admin/metrics', { headers }),
      apiRequest<UserPage>(`/api/v1/admin/users?${params}`, { headers }),
      apiRequest<AuditPage>('/api/v1/admin/audit-log?page_size=10', { headers }),
    ]).then(([nextMetrics, nextUsers, nextAudit]) => { setMetrics(nextMetrics); setUsers(nextUsers); setAudit(nextAudit); setError('') })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Admin data could not be loaded.'))
  }, [accessToken, isAdmin, page, search])

  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <main className="workspace-shell admin-page"><header className="workspace-header"><div><p className="eyebrow">Administration</p><h1>Admin dashboard</h1><p className="description">Monitor accounts and application activity.</p></div></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {metrics && <section className="admin-metrics" aria-label="System metrics">{Object.entries(metrics).map(([key, value]) => <article className="card" key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{value}</strong></article>)}</section>}
    <section className="card admin-users"><div className="section-heading"><div><p className="eyebrow">Accounts</p><h2>Users</h2></div><span className="section-count">{users?.total ?? 0}</span></div>
      <label>Search users<input type="search" value={search} placeholder="Name or email" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label>
      <div className="table-scroll"><table><thead><tr><th>User</th><th>Roles</th><th>Country</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{users?.items.map((item) => <tr key={item.id}><td><strong>{item.display_name}</strong><small>{item.email}</small></td><td>{item.roles.join(', ')}</td><td>{item.country_code ?? '—'}</td><td><span className="status-badge">{item.status}</span></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td><Link to={`/admin/users/${item.id}`}>Manage</Link></td></tr>)}</tbody></table></div>
      {users && users.total > users.page_size && <div className="button-row"><button type="button" className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button type="button" className="secondary-button" disabled={page * users.page_size >= users.total} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </section>
    <section className="card admin-users"><div className="section-heading"><div><p className="eyebrow">Security history</p><h2>Recent admin activity</h2></div><span className="section-count">{audit?.total ?? 0}</span></div><div className="table-scroll"><table><thead><tr><th>Administrator</th><th>Action</th><th>User</th><th>Changes</th><th>When</th></tr></thead><tbody>{audit?.items.map((entry) => <tr key={entry.id}><td>{entry.admin_name}</td><td>{entry.action.replaceAll('_', ' ')}</td><td>{entry.target_name ?? 'Deleted user'}</td><td><code>{JSON.stringify(entry.changes)}</code></td><td>{new Date(entry.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></section>
  </main>
}
