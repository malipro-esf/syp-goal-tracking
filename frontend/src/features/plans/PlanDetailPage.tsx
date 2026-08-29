import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Activity, Archive, ArrowLeft, Bot, ChartNoAxesColumnIncreasing, CircleCheck, FileClock, Gauge, MessageSquareText, Pause, Play, Save } from 'lucide-react'

import { ApiError } from '../../api/client'
import { ActivityPanel, type ActivityPanelView } from '../activities/ActivityPanel'
import { AiCoachPanel } from '../ai-coach/AiCoachPanel'
import { useAuth } from '../auth/useAuth'
import { FeedbackPanel } from '../coaching/FeedbackPanel'
import { OverviewProgressChart } from '../progress/OverviewProgressChart'
import { getPlan, transitionPlan, updatePlan, type Plan } from './plans-api'

const actions: Record<string, { action: string; labelKey: string }[]> = {
  draft: [{ action: 'activate', labelKey: 'activate' }, { action: 'archive', labelKey: 'archive' }],
  active: [{ action: 'pause', labelKey: 'pause' }, { action: 'complete', labelKey: 'complete' }, { action: 'archive', labelKey: 'archive' }],
  paused: [{ action: 'activate', labelKey: 'resume' }, { action: 'complete', labelKey: 'complete' }, { action: 'archive', labelKey: 'archive' }],
  completed: [{ action: 'activate', labelKey: 'resume' }, { action: 'archive', labelKey: 'archive' }],
  archived: [],
}

type PlanTab = 'overview' | ActivityPanelView | 'feedback' | 'ai'

const tabs: { id: PlanTab; labelKey: string; shortLabelKey: string }[] = [
  { id: 'overview', labelKey: 'overviewLong', shortLabelKey: 'overview' },
  { id: 'activities', labelKey: 'activities', shortLabelKey: 'activities' },
  { id: 'progress', labelKey: 'progressLong', shortLabelKey: 'progress' },
  { id: 'entries', labelKey: 'entriesLong', shortLabelKey: 'entries' },
  { id: 'feedback', labelKey: 'feedbackLong', shortLabelKey: 'feedback' },
  { id: 'ai', labelKey: 'aiLong', shortLabelKey: 'ai' },
]

const tabIcons = {
  overview: Gauge, activities: Activity, progress: ChartNoAxesColumnIncreasing,
  entries: FileClock, feedback: MessageSquareText, ai: Bot,
}

const actionIcons = { activate: Play, pause: Pause, complete: CircleCheck, archive: Archive }

export function PlanDetailPage() {
  const { accessToken } = useAuth()
  const { t } = useTranslation()
  const { planId = '' } = useParams()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<PlanTab>('overview')

  useEffect(() => {
    if (!accessToken) return
    getPlan(accessToken, planId).then(setPlan).catch((caught: unknown) =>
      setError(caught instanceof ApiError ? caught.message : t('plan.errors.load')))
  }, [accessToken, planId, t])

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
      setError(caught instanceof ApiError ? caught.message : t('plan.errors.save'))
    }
  }

  async function transition(action: string) {
    if (!accessToken || !plan) return
    try { setPlan(await transitionPlan(accessToken, plan.id, action)); setError('') }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : t('plan.errors.status')) }
  }

  if (error && !plan) return <main className="workspace-shell"><p role="alert">{error}</p><Link to="/plans">{t('plan.allPlans')}</Link></main>
  if (!plan) return <main className="workspace-shell">{t('plan.loading')}</main>
  const archived = plan.status === 'archived'

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/dashboard"><span>S</span><strong>SYP</strong></Link>
      <Link className="back-link icon-button" to="/plans"><ArrowLeft aria-hidden="true" />{t('plan.allPlans')}</Link>
      <div className="sidebar-plan"><small>{t('plan.currentPlan')}</small><strong>{plan.title}</strong><span className={`status-badge status-${plan.status}`}>{t(`plan.states.${plan.status}`)}</span></div>
      <nav className="admin-nav" aria-label="Plan sections" role="tablist">
        {tabs.map((tab) => { const Icon = tabIcons[tab.id]; return <button type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => setActiveTab(tab.id)}><Icon aria-hidden="true" />{t(`plan.tabs.${tab.shortLabelKey}`)}</button> })}
      </nav>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar">
        <div><p className="eyebrow">{t(`plan.tabs.${tabs.find((tab) => tab.id === activeTab)?.labelKey}`)}</p><h1>{plan.title}</h1></div>
        <section className="lifecycle-actions" aria-label="Plan lifecycle actions">
          {actions[plan.status].map(({ action, labelKey }) => { const Icon = actionIcons[action as keyof typeof actionIcons]; return <button type="button" className="secondary-button icon-button" key={action} onClick={() => transition(action)}><Icon aria-hidden="true" />{t(`plan.actions.${labelKey}`)}</button> })}
        </section>
      </header>

      <div className="admin-content" role="tabpanel">
        {error && <p className="form-error panel" role="alert">{error}</p>}
        {activeTab === 'overview' && <section className="overview-grid">
          <form className="panel plan-form" onSubmit={save}>
            <div className="section-heading"><div><p className="eyebrow">{t('plan.configuration')}</p><h2>{t('plan.details')}</h2></div><span className={`status-badge status-${plan.status}`}>{t(`plan.states.${plan.status}`)}</span></div>
            <label>{t('plan.title')}<input name="title" defaultValue={plan.title} maxLength={120} disabled={archived} required /></label>
            <label>{t('plan.description')}<textarea name="description" defaultValue={plan.description ?? ''} maxLength={2000} rows={3} disabled={archived} /></label>
            <div className="date-fields">
              <label>{t('plan.startDate')}<input name="startDate" type="date" defaultValue={plan.start_date ?? ''} disabled={archived} /></label>
              <label>{t('plan.endDate')}<input name="endDate" type="date" defaultValue={plan.end_date ?? ''} disabled={archived} /></label>
            </div>
            {!archived && <button type="submit" className="icon-button"><Save aria-hidden="true" />{t('plan.save')}</button>}
          </form>
          <div className="overview-aside">
            <aside className="panel plan-at-a-glance"><p className="eyebrow">{t('plan.atGlance')}</p><h2>{t('plan.status')}</h2><dl><div><dt>{t('plan.currentState')}</dt><dd>{t(`plan.states.${plan.status}`)}</dd></div><div><dt>{t('plan.starts')}</dt><dd>{plan.start_date || t('plan.notSet')}</dd></div><div><dt>{t('plan.ends')}</dt><dd>{plan.end_date || t('plan.openEnded')}</dd></div></dl></aside>
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
