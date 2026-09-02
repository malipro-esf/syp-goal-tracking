import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { ApiError, apiRequest } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { AdminLayout } from './AdminLayout'

type PlanDetail = { id: string; title: string; description: string | null; status: string; participant_name: string; participant_email: string; participant_user_id: string; coach_name: string | null; created_by_name: string; start_date: string | null; end_date: string | null; activities: { id: string; name: string; description: string | null; unit: string; status: string }[] }

export function AdminPlanPage() {
  const { planId } = useParams()
  const { accessToken, user } = useAuth()
  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [error, setError] = useState('')
  const isAdmin = user?.roles.includes('admin')
  useEffect(() => {
    if (!accessToken || !isAdmin || !planId) return
    apiRequest<PlanDetail>(`/api/v1/admin/plans/${planId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(setPlan)
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Plan could not be loaded.'))
  }, [accessToken, isAdmin, planId])
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  if (!plan) return <AdminLayout active="plans" title="Plan inspection" description="Loading plan details…">{error && <p className="form-error" role="alert">{error}</p>}</AdminLayout>
  return <AdminLayout active="plans" title={plan.title} description="Read-only administrative inspection.">
    <Link to="/admin/plans">← Back to plans</Link>
    <section className="admin-plan-overview"><article className="card"><p className="eyebrow">Plan details</p><h2>{plan.title}</h2><p>{plan.description || 'No description'}</p><span className={`status-badge status-${plan.status}`}>{plan.status}</span></article><article className="card plan-at-a-glance"><p className="eyebrow">Relationships</p><h2>Ownership</h2><dl><div><dt>Participant</dt><dd><Link to={`/admin/users/${plan.participant_user_id}`}>{plan.participant_name}</Link></dd></div><div><dt>Email</dt><dd>{plan.participant_email}</dd></div><div><dt>Coach</dt><dd>{plan.coach_name ?? 'Self-managed'}</dd></div><div><dt>Created by</dt><dd>{plan.created_by_name}</dd></div><div><dt>Starts</dt><dd>{plan.start_date ?? 'Not set'}</dd></div><div><dt>Ends</dt><dd>{plan.end_date ?? 'Open-ended'}</dd></div></dl></article></section>
    <section className="card admin-users"><div className="section-heading"><div><p className="eyebrow">Configuration</p><h2>Activities</h2></div><span className="section-count">{plan.activities.length}</span></div>{plan.activities.length === 0 ? <p>No activities configured.</p> : <div className="admin-activity-grid">{plan.activities.map((activity) => <article className="panel" key={activity.id}><h3>{activity.name}</h3><p>{activity.description || 'No description'}</p><small>{activity.unit} · {activity.status}</small></article>)}</div>}</section>
  </AdminLayout>
}
