import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { ApiError, apiRequest } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { AdminLayout } from './AdminLayout'

type Plan = { id: string; title: string; status: string; participant_name: string; participant_email: string; coach_name: string | null; start_date: string | null; end_date: string | null; activity_count: number }
type PlanPage = { items: Plan[]; total: number; page: number; page_size: number }

export function AdminPlansPage() {
  const { accessToken, user } = useAuth()
  const [urlParams] = useSearchParams()
  const [plans, setPlans] = useState<PlanPage | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(urlParams.get('status') ?? '')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const isAdmin = user?.roles.includes('admin')

  useEffect(() => {
    if (!accessToken || !isAdmin) return
    const params = new URLSearchParams({ page: String(page), page_size: '25' })
    if (search.trim()) params.set('search', search.trim())
    if (status) params.set('status', status)
    apiRequest<PlanPage>(`/api/v1/admin/plans?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((result) => { setPlans(result); setError('') })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Plans could not be loaded.'))
  }, [accessToken, isAdmin, page, search, status])

  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <AdminLayout active="plans" title="Plans directory" description="Inspect every plan and its coaching relationships.">
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="card admin-users"><div className="section-heading"><div><p className="eyebrow">Plan administration</p><h2>All plans</h2></div><span className="section-count">{plans?.total ?? 0}</span></div>
      <div className="admin-filter-row"><label>Search<input type="search" value={search} placeholder="Plan, participant, or email" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label><label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label></div>
      <div className="table-scroll"><table><thead><tr><th>Plan</th><th>Participant</th><th>Coach</th><th>Status</th><th>Dates</th><th>Activities</th><th>Actions</th></tr></thead><tbody>{plans?.items.map((plan) => <tr key={plan.id}><td><strong>{plan.title}</strong></td><td><strong>{plan.participant_name}</strong><small>{plan.participant_email}</small></td><td>{plan.coach_name ?? 'Self-managed'}</td><td><span className={`status-badge status-${plan.status}`}>{plan.status}</span></td><td>{plan.start_date ?? '—'} → {plan.end_date ?? 'Open-ended'}</td><td>{plan.activity_count}</td><td><Link to={`/admin/plans/${plan.id}`}>Inspect</Link></td></tr>)}</tbody></table></div>
      {plans && plans.total > plans.page_size && <div className="button-row"><button className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button className="secondary-button" disabled={page * plans.page_size >= plans.total} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </section>
  </AdminLayout>
}
