import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { apiRequest, ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { AdminLayout } from './AdminLayout'

type Metrics = { users: number; participants: number; coaches: number; active_plans: number; pending_invitations: number }
type AdminUser = { id: string; email: string; display_name: string; country_code: string | null; status: string; roles: string[]; created_at: string }
type UserPage = { items: AdminUser[]; total: number; page: number; page_size: number }
type AuditPage = { items: { id: string; admin_name: string; target_name: string | null; action: string; changes: Record<string, unknown>; created_at: string }[]; total: number }
type Alerts = { expired_active_plans: number; disabled_users_with_active_plans: number; stale_pending_invitations: number; stale_after_days: number }

export function AdminPage() {
  const { accessToken, user } = useAuth()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [users, setUsers] = useState<UserPage | null>(null)
  const [audit, setAudit] = useState<AuditPage | null>(null)
  const [alerts, setAlerts] = useState<Alerts | null>(null)
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
      apiRequest<Alerts>('/api/v1/admin/alerts', { headers }),
    ]).then(([nextMetrics, nextUsers, nextAudit, nextAlerts]) => { setMetrics(nextMetrics); setUsers(nextUsers); setAudit(nextAudit); setAlerts(nextAlerts); setError('') })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Admin data could not be loaded.'))
  }, [accessToken, isAdmin, page, search])

  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <AdminLayout active="overview" title="Admin dashboard" description="Monitor accounts and application activity.">
    {error && <p className="form-error" role="alert">{error}</p>}
    {metrics && <section id="overview" className="admin-metrics" aria-label="System metrics">{Object.entries(metrics).map(([key, value]) => <article className="card" key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{value}</strong></article>)}</section>}
    {alerts && <section className="card admin-alerts"><div className="section-heading"><div><p className="eyebrow">Needs attention</p><h2>Operational alerts</h2></div></div><div className="admin-alert-grid"><Link to="/admin/plans?status=active"><strong>{alerts.expired_active_plans}</strong><span>Expired active plans</span></Link><Link to="/admin/users?status=disabled"><strong>{alerts.disabled_users_with_active_plans}</strong><span>Disabled users with active plans</span></Link><Link to="/admin/assignments?stale=true"><strong>{alerts.stale_pending_invitations}</strong><span>Invitations pending {alerts.stale_after_days}+ days</span></Link></div></section>}
    <section id="users" className="card admin-users"><div className="section-heading"><div><p className="eyebrow">Accounts</p><h2>Users</h2></div><span className="section-count">{users?.total ?? 0}</span></div>
      <label>Search users<input type="search" value={search} placeholder="Name or email" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label>
      <div className="table-scroll"><table><thead><tr><th>User</th><th>Roles</th><th>Country</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{users?.items.map((item) => <tr key={item.id}><td><strong>{item.display_name}</strong><small>{item.email}</small></td><td>{item.roles.join(', ')}</td><td>{item.country_code ?? '—'}</td><td><span className="status-badge">{item.status}</span></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td><Link to={`/admin/users/${item.id}`}>Manage</Link></td></tr>)}</tbody></table></div>
      {users && users.total > users.page_size && <div className="button-row"><button type="button" className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button type="button" className="secondary-button" disabled={page * users.page_size >= users.total} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </section>
    <section id="audit" className="card admin-users"><div className="section-heading"><div><p className="eyebrow">Security history</p><h2>Recent admin activity</h2></div><span className="section-count">{audit?.total ?? 0}</span></div><div className="table-scroll"><table><thead><tr><th>Administrator</th><th>Action</th><th>User</th><th>Changes</th><th>When</th></tr></thead><tbody>{audit?.items.map((entry) => <tr key={entry.id}><td>{entry.admin_name}</td><td>{entry.action.replaceAll('_', ' ')}</td><td>{entry.target_name ?? 'Deleted user'}</td><td><code>{JSON.stringify(entry.changes)}</code></td><td>{new Date(entry.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></section>
  </AdminLayout>
}
