import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ApiError } from '../../api/client'
import { ActivityPanel } from '../activities/ActivityPanel'
import { useAuth } from '../auth/useAuth'
import { FeedbackPanel } from '../coaching/FeedbackPanel'
import { getPlan, transitionPlan, updatePlan, type Plan } from './plans-api'

const actions: Record<string, { action: string; label: string }[]> = {
  draft: [{ action: 'activate', label: 'Activate' }, { action: 'archive', label: 'Archive' }],
  active: [{ action: 'pause', label: 'Pause' }, { action: 'complete', label: 'Complete' }, { action: 'archive', label: 'Archive' }],
  paused: [{ action: 'activate', label: 'Resume' }, { action: 'complete', label: 'Complete' }, { action: 'archive', label: 'Archive' }],
  completed: [{ action: 'archive', label: 'Archive' }],
  archived: [],
}

export function PlanDetailPage() {
  const { accessToken } = useAuth()
  const { planId = '' } = useParams()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    getPlan(accessToken, planId).then(setPlan).catch((caught: unknown) =>
      setError(caught instanceof ApiError ? caught.message : 'Could not load the plan.'))
  }, [accessToken, planId])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !plan) return
    const data = new FormData(event.currentTarget)
    try {
      setPlan(await updatePlan(accessToken, plan.id, {
        title: String(data.get('title')),
        description: String(data.get('description')) || null,
        start_date: String(data.get('startDate')) || null,
        end_date: String(data.get('endDate')) || null,
      }))
      setError('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save the plan.')
    }
  }

  async function transition(action: string) {
    if (!accessToken || !plan) return
    try { setPlan(await transitionPlan(accessToken, plan.id, action)); setError('') }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not update status.') }
  }

  if (error && !plan) return <main className="workspace-shell"><p role="alert">{error}</p><Link to="/plans">Back to plans</Link></main>
  if (!plan) return <main className="workspace-shell">Loading plan…</main>
  const archived = plan.status === 'archived'

  return (
    <main className="workspace-shell narrow-workspace">
      <header className="workspace-header">
        <div><p className="eyebrow">Plan details</p><h1>{plan.title}</h1></div>
        <Link to="/plans">Back to plans</Link>
      </header>
      <form className="panel plan-form" onSubmit={save}>
        <span className={`status-badge status-${plan.status}`}>{plan.status}</span>
        <label>Title<input name="title" defaultValue={plan.title} maxLength={120} disabled={archived} required /></label>
        <label>Description<textarea name="description" defaultValue={plan.description ?? ''} maxLength={2000} rows={5} disabled={archived} /></label>
        <div className="date-fields">
          <label>Start date<input name="startDate" type="date" defaultValue={plan.start_date ?? ''} disabled={archived} /></label>
          <label>End date<input name="endDate" type="date" defaultValue={plan.end_date ?? ''} disabled={archived} /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!archived && <button type="submit">Save changes</button>}
      </form>
      <section className="lifecycle-actions" aria-label="Plan lifecycle actions">
        {actions[plan.status].map(({ action, label }) => (
          <button type="button" className="secondary-button" key={action} onClick={() => transition(action)}>{label}</button>
        ))}
      </section>
      <ActivityPanel planId={plan.id} planStatus={plan.status} />
      <FeedbackPanel enrollmentId={plan.id} />
    </main>
  )
}
