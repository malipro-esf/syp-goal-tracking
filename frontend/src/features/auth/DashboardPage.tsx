import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, ChevronRight, CircleCheck, ClipboardList, Clock3, LayoutDashboard, Plus, Settings, Target } from 'lucide-react'

import { ApiError } from '../../api/client'
import { listPlans, type Plan } from '../plans/plans-api'
import { useAuth } from './useAuth'

export function DashboardPage() {
  const { accessToken, user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    listPlans(accessToken)
      .then(setPlans)
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Could not load your overview.'))
      .finally(() => setLoading(false))
  }, [accessToken])

  const activePlans = plans.filter((plan) => plan.status === 'active').length
  const completedPlans = plans.filter((plan) => plan.status === 'completed').length
  const recentPlans = [...plans]
    .sort((first, second) => second.updated_at.localeCompare(first.updated_at))
    .slice(0, 4)
  const coachingLabel = user?.roles.includes('coach') ? 'Coach workspace' : 'Plan invitations'

  return <main className="admin-shell dashboard-shell">
    <aside className="admin-sidebar dashboard-sidebar">
      <Link className="admin-brand" to="/dashboard"><span>S</span><strong>SYP</strong></Link>
      <div className="sidebar-plan"><small>Personal workspace</small><strong>{user?.display_name}</strong><span>{user?.roles.join(', ')}</span></div>
      <nav className="admin-nav" aria-label="Dashboard sections">
        <Link className="active" to="/dashboard"><LayoutDashboard aria-hidden="true" />Overview</Link>
        <Link to="/plans"><ClipboardList aria-hidden="true" />Plans</Link>
        <Link to="/coaching"><Bot aria-hidden="true" />Coaching</Link>
        <Link to="/settings/profile"><Settings aria-hidden="true" />Settings</Link>
      </nav>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar dashboard-topbar">
        <div><p className="eyebrow">Your progress workspace</p><h1>Hello, {user?.display_name}</h1><p>See your plans, priorities, and next actions at a glance.</p></div>
        <Link className="primary-link icon-button" to="/plans"><Plus aria-hidden="true" />Create a plan</Link>
      </header>

      <div className="admin-content dashboard-content">
        {error && <p className="form-error panel" role="alert">{error}</p>}
        <section className="dashboard-metrics" aria-label="Plan summary">
          <article className="panel metric-card"><span className="metric-icon"><ClipboardList aria-hidden="true" /></span><div><small>Total plans</small><strong>{loading ? '—' : plans.length}</strong></div></article>
          <article className="panel metric-card"><span className="metric-icon metric-active"><Target aria-hidden="true" /></span><div><small>Active plans</small><strong>{loading ? '—' : activePlans}</strong></div></article>
          <article className="panel metric-card"><span className="metric-icon metric-complete"><CircleCheck aria-hidden="true" /></span><div><small>Completed</small><strong>{loading ? '—' : completedPlans}</strong></div></article>
        </section>

        <section className="dashboard-grid">
          <section className="panel recent-plans" aria-labelledby="recent-plans-title">
            <div className="section-heading"><div><p className="eyebrow">Continue where you left off</p><h2 id="recent-plans-title">Recent plans</h2></div><Link to="/plans">View all</Link></div>
            {loading && <p className="empty-state">Loading plans…</p>}
            {!loading && recentPlans.length === 0 && <div className="dashboard-empty"><Target aria-hidden="true" /><h3>No plans yet</h3><p>Create your first plan and turn a goal into measurable action.</p><Link className="primary-link icon-button" to="/plans"><Plus aria-hidden="true" />Create your first plan</Link></div>}
            <div className="dashboard-plan-list">{recentPlans.map((plan) => <Link to={`/plans/${plan.id}`} key={plan.id}><span className="plan-leading-icon"><Target aria-hidden="true" /></span><span><strong>{plan.title}</strong><small><Clock3 aria-hidden="true" />Updated {new Date(plan.updated_at).toLocaleDateString()}</small></span><span className={`status-badge status-${plan.status}`}>{plan.status}</span><ChevronRight aria-hidden="true" /></Link>)}</div>
          </section>

          <aside className="panel quick-actions"><p className="eyebrow">Shortcuts</p><h2>Quick actions</h2><Link to="/plans"><ClipboardList aria-hidden="true" /><span><strong>Manage plans</strong><small>Create, review, or update your goals.</small></span><ChevronRight aria-hidden="true" /></Link><Link to="/coaching"><Bot aria-hidden="true" /><span><strong>{coachingLabel}</strong><small>Continue your coaching collaboration.</small></span><ChevronRight aria-hidden="true" /></Link><Link to="/settings/profile"><Settings aria-hidden="true" /><span><strong>Profile & settings</strong><small>Update language, timezone, and identity.</small></span><ChevronRight aria-hidden="true" /></Link></aside>
        </section>
      </div>
    </section>
  </main>
}
