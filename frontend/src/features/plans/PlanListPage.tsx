import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ClipboardList, LayoutDashboard, Plus } from 'lucide-react'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { createPlan, listPlans, type Plan } from './plans-api'

export function PlanListPage() {
  const { accessToken } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    listPlans(accessToken)
      .then(setPlans)
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Could not load plans.'))
      .finally(() => setLoading(false))
  }, [accessToken])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    setError('')
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      const plan = await createPlan(accessToken, {
        title: String(data.get('title')),
        description: String(data.get('description')) || null,
        start_date: String(data.get('startDate')) || null,
        end_date: String(data.get('endDate')) || null,
      })
      setPlans((current) => [plan, ...current])
      form.reset()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create the plan.')
    }
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div><p className="eyebrow">Personal plans</p><h1 className="heading-with-icon"><ClipboardList aria-hidden="true" />Your goals</h1></div>
        <Link className="icon-button" to="/dashboard"><ArrowLeft aria-hidden="true" /><LayoutDashboard aria-hidden="true" />Dashboard</Link>
      </header>
      <section className="plan-layout">
        <form className="panel plan-form" onSubmit={submit}>
          <h2>Create a plan</h2>
          <label>Title<input name="title" maxLength={120} required /></label>
          <label>Description<textarea name="description" maxLength={2000} rows={4} /></label>
          <div className="date-fields">
            <label>Start date<input name="startDate" type="date" /></label>
            <label>End date<input name="endDate" type="date" /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="icon-button"><Plus aria-hidden="true" />Create draft</button>
        </form>
        <section className="panel" aria-labelledby="plan-list-title">
          <h2 id="plan-list-title">My plans</h2>
          {loading && <p>Loading plans…</p>}
          {!loading && plans.length === 0 && <p className="empty-state">No plans yet. Create your first draft.</p>}
          <div className="plan-list">
            {plans.map((plan) => (
              <Link className="plan-row" to={`/plans/${plan.id}`} key={plan.id}>
                <span><strong>{plan.title}</strong><small>{plan.description || 'No description'}</small></span>
                <span className="plan-row-action"><span className={`status-badge status-${plan.status}`}>{plan.status}</span><ChevronRight aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
