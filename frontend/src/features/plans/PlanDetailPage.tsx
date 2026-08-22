import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ApiError } from '../../api/client'
import { ActivityPanel, type ActivityPanelView } from '../activities/ActivityPanel'
import { AiCoachPanel } from '../ai-coach/AiCoachPanel'
import { useAuth } from '../auth/useAuth'
import { FeedbackPanel } from '../coaching/FeedbackPanel'
import { OverviewProgressChart } from '../progress/OverviewProgressChart'
import { getPlan, transitionPlan, updatePlan, type Plan } from './plans-api'

const actions: Record<string, { action: string; label: string }[]> = {
  draft: [{ action: 'activate', label: 'Activate' }, { action: 'archive', label: 'Archive' }],
  active: [{ action: 'pause', label: 'Pause' }, { action: 'complete', label: 'Complete' }, { action: 'archive', label: 'Archive' }],
  paused: [{ action: 'activate', label: 'Resume' }, { action: 'complete', label: 'Complete' }, { action: 'archive', label: 'Archive' }],
  completed: [{ action: 'archive', label: 'Archive' }],
  archived: [],
}

type PlanTab = 'overview' | ActivityPanelView | 'feedback' | 'ai'

const tabs: { id: PlanTab; label: string; shortLabel: string }[] = [
  { id: 'overview', label: 'Plan overview', shortLabel: 'Overview' },
  { id: 'activities', label: 'Activities', shortLabel: 'Activities' },
  { id: 'progress', label: 'Progress report', shortLabel: 'Progress' },
  { id: 'entries', label: 'Recent entries', shortLabel: 'Entries' },
  { id: 'feedback', label: 'Coach feedback', shortLabel: 'Feedback' },
  { id: 'ai', label: 'AI coach', shortLabel: 'AI Coach' },
]

export function PlanDetailPage() {
  const { accessToken } = useAuth()
  const { planId = '' } = useParams()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<PlanTab>('overview')

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

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/dashboard"><span>S</span><strong>SYP</strong></Link>
      <Link className="back-link" to="/plans">← All plans</Link>
      <div className="sidebar-plan"><small>Current plan</small><strong>{plan.title}</strong><span className={`status-badge status-${plan.status}`}>{plan.status}</span></div>
      <nav className="admin-nav" aria-label="Plan sections" role="tablist">
        {tabs.map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => setActiveTab(tab.id)}><span className={`nav-icon nav-icon-${tab.id}`} aria-hidden="true" />{tab.shortLabel}</button>)}
      </nav>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar">
        <div><p className="eyebrow">{tabs.find((tab) => tab.id === activeTab)?.label}</p><h1>{plan.title}</h1></div>
        <section className="lifecycle-actions" aria-label="Plan lifecycle actions">
          {actions[plan.status].map(({ action, label }) => <button type="button" className="secondary-button" key={action} onClick={() => transition(action)}>{label}</button>)}
        </section>
      </header>

      <div className="admin-content" role="tabpanel">
        {error && <p className="form-error panel" role="alert">{error}</p>}
        {activeTab === 'overview' && <section className="overview-grid">
          <form className="panel plan-form" onSubmit={save}>
            <div className="section-heading"><div><p className="eyebrow">Configuration</p><h2>Plan details</h2></div><span className={`status-badge status-${plan.status}`}>{plan.status}</span></div>
            <label>Title<input name="title" defaultValue={plan.title} maxLength={120} disabled={archived} required /></label>
            <label>Description<textarea name="description" defaultValue={plan.description ?? ''} maxLength={2000} rows={3} disabled={archived} /></label>
            <div className="date-fields">
              <label>Start date<input name="startDate" type="date" defaultValue={plan.start_date ?? ''} disabled={archived} /></label>
              <label>End date<input name="endDate" type="date" defaultValue={plan.end_date ?? ''} disabled={archived} /></label>
            </div>
            {!archived && <button type="submit">Save changes</button>}
          </form>
          <div className="overview-aside">
            <aside className="panel plan-at-a-glance"><p className="eyebrow">At a glance</p><h2>Plan status</h2><dl><div><dt>Current state</dt><dd>{plan.status}</dd></div><div><dt>Starts</dt><dd>{plan.start_date || 'Not set'}</dd></div><div><dt>Ends</dt><dd>{plan.end_date || 'Open-ended'}</dd></div></dl></aside>
            <OverviewProgressChart planId={plan.id} />
          </div>
        </section>}
        {(activeTab === 'activities' || activeTab === 'progress' || activeTab === 'entries') && <ActivityPanel planId={plan.id} planStatus={plan.status} view={activeTab} />}
        {activeTab === 'feedback' && <FeedbackPanel enrollmentId={plan.id} />}
        {activeTab === 'ai' && <AiCoachPanel planId={plan.id} />}
      </div>
    </section>
  </main>
}
