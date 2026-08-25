import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, ChevronRight, CircleCheck, ClipboardList, Clock3, LayoutDashboard, Plus, Settings, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import { listPlans, type Plan } from '../plans/plans-api'
import { useAuth } from './useAuth'

export function DashboardPage() {
  const { accessToken, user } = useAuth()
  const { i18n, t } = useTranslation()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    listPlans(accessToken)
      .then(setPlans)
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : t('dashboard.errors.load')))
      .finally(() => setLoading(false))
  }, [accessToken, t])

  const activePlans = plans.filter((plan) => plan.status === 'active').length
  const completedPlans = plans.filter((plan) => plan.status === 'completed').length
  const recentPlans = [...plans]
    .sort((first, second) => second.updated_at.localeCompare(first.updated_at))
    .slice(0, 4)
  const coachingLabel = t(user?.roles.includes('coach') ? 'dashboard.actions.coach' : 'dashboard.actions.invitations')

  return <main className="admin-shell dashboard-shell">
    <aside className="admin-sidebar dashboard-sidebar">
      <Link className="admin-brand" to="/dashboard"><span>S</span><strong>SYP</strong></Link>
      <div className="sidebar-plan"><small>{t('dashboard.sidebar.workspace')}</small><strong>{user?.display_name}</strong><span>{user?.roles.map((role) => t(`auth.roles.${role}`)).join(', ')}</span></div>
      <nav className="admin-nav" aria-label={t('dashboard.sidebar.navigation')}>
        <Link className="active" to="/dashboard"><LayoutDashboard aria-hidden="true" />{t('dashboard.sidebar.overview')}</Link>
        <Link to="/plans"><ClipboardList aria-hidden="true" />{t('navigation.plans')}</Link>
        <Link to="/coaching"><Bot aria-hidden="true" />{t('navigation.coaching')}</Link>
        <Link to="/settings/profile"><Settings aria-hidden="true" />{t('dashboard.sidebar.settings')}</Link>
      </nav>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar dashboard-topbar">
        <div><p className="eyebrow">{t('dashboard.eyebrow')}</p><h1>{t('dashboard.greeting', { name: user?.display_name })}</h1><p>{t('dashboard.description')}</p></div>
        <Link className="primary-link icon-button" to="/plans"><Plus aria-hidden="true" />{t('dashboard.createPlan')}</Link>
      </header>

      <div className="admin-content dashboard-content">
        {error && <p className="form-error panel" role="alert">{error}</p>}
        <section className="dashboard-metrics" aria-label={t('dashboard.metrics.label')}>
          <article className="panel metric-card"><span className="metric-icon"><ClipboardList aria-hidden="true" /></span><div><small>{t('dashboard.metrics.total')}</small><strong>{loading ? '—' : plans.length}</strong></div></article>
          <article className="panel metric-card"><span className="metric-icon metric-active"><Target aria-hidden="true" /></span><div><small>{t('dashboard.metrics.active')}</small><strong>{loading ? '—' : activePlans}</strong></div></article>
          <article className="panel metric-card"><span className="metric-icon metric-complete"><CircleCheck aria-hidden="true" /></span><div><small>{t('dashboard.metrics.completed')}</small><strong>{loading ? '—' : completedPlans}</strong></div></article>
        </section>

        <section className="dashboard-grid">
          <section className="panel recent-plans" aria-labelledby="recent-plans-title">
            <div className="section-heading"><div><p className="eyebrow">{t('dashboard.recent.eyebrow')}</p><h2 id="recent-plans-title">{t('dashboard.recent.title')}</h2></div><Link to="/plans">{t('dashboard.recent.viewAll')}</Link></div>
            {loading && <p className="empty-state">{t('dashboard.recent.loading')}</p>}
            {!loading && recentPlans.length === 0 && <div className="dashboard-empty"><Target aria-hidden="true" /><h3>{t('dashboard.recent.emptyTitle')}</h3><p>{t('dashboard.recent.emptyDescription')}</p><Link className="primary-link icon-button" to="/plans"><Plus aria-hidden="true" />{t('dashboard.recent.emptyAction')}</Link></div>}
            <div className="dashboard-plan-list">{recentPlans.map((plan) => <Link to={`/plans/${plan.id}`} key={plan.id}><span className="plan-leading-icon"><Target aria-hidden="true" /></span><span><strong>{plan.title}</strong><small><Clock3 aria-hidden="true" />{t('dashboard.recent.updated', { date: new Date(plan.updated_at).toLocaleDateString(i18n.language) })}</small></span><span className={`status-badge status-${plan.status}`}>{t(`plan.states.${plan.status}`)}</span><ChevronRight aria-hidden="true" /></Link>)}</div>
          </section>

          <aside className="panel quick-actions"><p className="eyebrow">{t('dashboard.actions.eyebrow')}</p><h2>{t('dashboard.actions.title')}</h2><Link to="/plans"><ClipboardList aria-hidden="true" /><span><strong>{t('dashboard.actions.manage')}</strong><small>{t('dashboard.actions.manageDescription')}</small></span><ChevronRight aria-hidden="true" /></Link><Link to="/coaching"><Bot aria-hidden="true" /><span><strong>{coachingLabel}</strong><small>{t('dashboard.actions.coachingDescription')}</small></span><ChevronRight aria-hidden="true" /></Link><Link to="/settings/profile"><Settings aria-hidden="true" /><span><strong>{t('dashboard.actions.settings')}</strong><small>{t('dashboard.actions.settingsDescription')}</small></span><ChevronRight aria-hidden="true" /></Link></aside>
        </section>
      </div>
    </section>
  </main>
}
