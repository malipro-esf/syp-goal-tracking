import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import { ApiError, apiRequest } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { AdminLayout } from './AdminLayout'

type Assignment = { id: string; template_title: string; participant_name: string; participant_email: string; coach_name: string; coach_email: string; status: string; start_date: string; end_date: string | null; created_at: string; responded_at: string | null; pending_days: number | null; is_stale: boolean }
type AssignmentPage = { items: Assignment[]; total: number; page: number; page_size: number; stale_after_days: number }

export function AdminAssignmentsPage() {
  const { accessToken, user } = useAuth()
  const [urlParams] = useSearchParams()
  const [assignments, setAssignments] = useState<AssignmentPage | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [staleOnly, setStaleOnly] = useState(urlParams.get('stale') === 'true')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const isAdmin = user?.roles.includes('admin')
  useEffect(() => {
    if (!accessToken || !isAdmin) return
    const params = new URLSearchParams({ page: String(page), page_size: '25', stale_only: String(staleOnly) })
    if (search.trim()) params.set('search', search.trim())
    if (status) params.set('status', status)
    apiRequest<AssignmentPage>(`/api/v1/admin/assignments?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((result) => { setAssignments(result); setError('') })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Invitations could not be loaded.'))
  }, [accessToken, isAdmin, page, search, staleOnly, status])
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  async function cancelInvitation(item: Assignment) {
    if (!window.confirm(`Cancel the pending invitation for ${item.participant_name}?`)) return
    try {
      const updated = await apiRequest<Assignment>(`/api/v1/admin/assignments/${item.id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })
      setAssignments((current) => current ? { ...current, items: current.items.map((entry) => entry.id === updated.id ? updated : entry) } : current)
      setMessage('Invitation cancelled.'); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Invitation could not be cancelled.'); setMessage('') }
  }
  return <AdminLayout active="assignments" title="Invitation directory" description="Inspect plan assignments and identify invitations needing attention.">
    {message && <p className="form-success" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="card admin-users"><div className="section-heading"><div><p className="eyebrow">Coaching assignments</p><h2>Invitations</h2></div><span className="section-count">{assignments?.total ?? 0}</span></div>
      <div className="admin-assignment-filters"><label>Search<input type="search" value={search} placeholder="Template, coach, participant, or email" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label><label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select></label><label className="checkbox-label"><input type="checkbox" checked={staleOnly} onChange={(event) => { setStaleOnly(event.target.checked); setPage(1) }} />Stale only</label></div>
      {assignments && <p className="table-note">Pending invitations become stale after {assignments.stale_after_days} days.</p>}
      <div className="table-scroll"><table><thead><tr><th>Template</th><th>Participant</th><th>Coach</th><th>Status</th><th>Plan dates</th><th>Sent</th><th>Actions</th></tr></thead><tbody>{assignments?.items.map((item) => <tr className={item.is_stale ? 'stale-row' : ''} key={item.id}><td><strong>{item.template_title}</strong></td><td><strong>{item.participant_name}</strong><small>{item.participant_email}</small></td><td><strong>{item.coach_name}</strong><small>{item.coach_email}</small></td><td><span className={`status-badge status-${item.status}`}>{item.status}</span>{item.is_stale && <small className="stale-label">Stale · {item.pending_days} days</small>}</td><td>{item.start_date} → {item.end_date ?? 'Open-ended'}</td><td>{new Date(item.created_at).toLocaleDateString()}</td><td>{item.status === 'pending' ? <button type="button" className="secondary-button compact-button" onClick={() => cancelInvitation(item)}>Cancel</button> : '—'}</td></tr>)}</tbody></table></div>
      {assignments && assignments.total > assignments.page_size && <div className="button-row"><button className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button className="secondary-button" disabled={page * assignments.page_size >= assignments.total} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </section>
  </AdminLayout>
}
