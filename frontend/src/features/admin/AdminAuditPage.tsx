import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { ApiError, apiRequest } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { AdminLayout } from './AdminLayout'

type AuditEntry = {
  id: string
  admin_name: string
  target_name: string | null
  action: string
  changes: Record<string, unknown>
  created_at: string
}

type AuditPage = { items: AuditEntry[]; total: number; page: number; page_size: number }

const actions = [
  'user_status_changed',
  'user_roles_changed',
  'plan_status_changed',
  'assignment_cancelled',
  'system_settings_changed',
]

function describeChanges(changes: Record<string, unknown>) {
  if ('before' in changes || 'after' in changes) {
    return `${JSON.stringify(changes.before) ?? '—'} → ${JSON.stringify(changes.after) ?? '—'}`
  }
  return Object.entries(changes).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ') || 'No details'
}

export function AdminAuditPage() {
  const { accessToken, user } = useAuth()
  const [audit, setAudit] = useState<AuditPage | null>(null)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const isAdmin = user?.roles.includes('admin')

  useEffect(() => {
    if (!accessToken || !isAdmin) return
    const params = new URLSearchParams({ page: String(page), page_size: '25' })
    if (search.trim()) params.set('search', search.trim())
    if (action) params.set('action', action)
    apiRequest<AuditPage>(`/api/v1/admin/audit-log?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((result) => { setAudit(result); setError('') })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Audit log could not be loaded.'))
  }, [accessToken, action, isAdmin, page, search])

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return <AdminLayout active="audit" title="Audit log" description="Review administrative changes and who performed them.">
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="card admin-users">
      <div className="section-heading"><div><p className="eyebrow">Security history</p><h2>Administrative activity</h2></div><span className="section-count">{audit?.total ?? 0}</span></div>
      <div className="admin-filter-row">
        <label>Search<input type="search" value={search} placeholder="Administrator, user, or action" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label>
        <label>Action<select value={action} onChange={(event) => { setAction(event.target.value); setPage(1) }}><option value="">All actions</option>{actions.map((item) => <option value={item} key={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
      </div>
      <div className="table-scroll"><table><thead><tr><th>When</th><th>Administrator</th><th>Action</th><th>Target</th><th>Changes</th></tr></thead><tbody>
        {audit?.items.map((entry) => <tr key={entry.id}><td><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time></td><td>{entry.admin_name}</td><td><span className="status-badge">{entry.action.replaceAll('_', ' ')}</span></td><td>{entry.target_name ?? 'System'}</td><td><code>{describeChanges(entry.changes)}</code></td></tr>)}
        {audit?.items.length === 0 && <tr><td colSpan={5}>No audit events match these filters.</td></tr>}
      </tbody></table></div>
      {audit && audit.total > audit.page_size && <div className="button-row"><button type="button" className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {Math.ceil(audit.total / audit.page_size)}</span><button type="button" className="secondary-button" disabled={page * audit.page_size >= audit.total} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </section>
  </AdminLayout>
}
