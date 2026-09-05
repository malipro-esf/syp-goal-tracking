import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { listAdminSupportRequests, markAdminSupportRequestsViewed, updateAdminSupportRequest, type SupportRequestPage, type SupportStatus } from '../support/support-api'
import { AdminLayout } from './AdminLayout'

export function AdminSupportPage() {
  const { accessToken, user } = useAuth()
  const [requests, setRequests] = useState<SupportRequestPage | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const isAdmin = user?.roles.includes('admin')

  function load() {
    if (!accessToken || !isAdmin) return
    const query = new URLSearchParams({ page: String(page), page_size: '20' })
    if (search.trim()) query.set('search', search.trim())
    if (status) query.set('status', status)
    listAdminSupportRequests(accessToken, query).then(setRequests).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Support requests could not be loaded.'))
  }
  useEffect(load, [accessToken, isAdmin, page, search, status])
  useEffect(() => {
    if (!accessToken || !isAdmin) return
    markAdminSupportRequestsViewed(accessToken).then(() => window.dispatchEvent(new Event('support-requests-viewed'))).catch(() => undefined)
  }, [accessToken, isAdmin])

  async function update(id: string, nextStatus: SupportStatus, adminNote: string) {
    if (!accessToken) return
    try {
      await updateAdminSupportRequest(accessToken, id, { status: nextStatus, admin_note: adminNote || null })
      setError('')
      load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Support request could not be updated.')
    }
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <AdminLayout active="support" title="Support requests" description="Review questions, technical issues, and feedback submitted by users.">
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="card admin-users"><div className="section-heading"><div><p className="eyebrow">Support queue</p><h2>Requests</h2></div><span className="section-count">{requests?.total ?? 0}</span></div>
      <div className="admin-filter-row"><label>Search<input type="search" placeholder="Name, email, or subject" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label><label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label></div>
      <div className="support-request-list">{requests?.items.map((request) => <SupportRequestCard request={request} onSave={update} key={request.id} />)}{requests?.items.length === 0 && <p>No support requests match these filters.</p>}</div>
      {requests && requests.total > requests.page_size && <div className="button-row"><button type="button" className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {Math.ceil(requests.total / requests.page_size)}</span><button type="button" className="secondary-button" disabled={page * requests.page_size >= requests.total} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </section>
  </AdminLayout>
}

function SupportRequestCard({ request, onSave }: { request: NonNullable<SupportRequestPage['items']>[number]; onSave: (id: string, status: SupportStatus, note: string) => void }) {
  const [status, setStatus] = useState(request.status)
  const [note, setNote] = useState(request.admin_note ?? '')
  return <article className="support-request-card"><header><div><span className="status-badge">{request.category}</span><h3>{request.subject}</h3><p>{request.name} · <a href={`mailto:${request.email}`}>{request.email}</a></p></div><time dateTime={request.created_at}>{new Date(request.created_at).toLocaleString()}</time></header><p>{request.message}</p><div className="support-request-actions"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as SupportStatus)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label><label>Internal note<input value={note} maxLength={5000} onChange={(event) => setNote(event.target.value)} /></label><button type="button" onClick={() => onSave(request.id, status, note)}>Save</button></div></article>
}
