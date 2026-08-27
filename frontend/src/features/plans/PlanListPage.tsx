import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ChevronRight, ClipboardList, LayoutDashboard, Plus, Search, Target, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { createPlan, listPlans, type Plan, type PlanStatus } from './plans-api'

const statuses: PlanStatus[] = ['draft', 'active', 'paused', 'completed', 'archived']

export function PlanListPage() {
  const { accessToken } = useAuth()
  const { t } = useTranslation()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<PlanStatus | 'all'>('all')

  const filteredPlans = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return [...plans]
      .sort((first, second) => second.updated_at.localeCompare(first.updated_at))
      .filter((plan) => status === 'all' || plan.status === status)
      .filter((plan) => !normalizedQuery || `${plan.title} ${plan.description ?? ''}`.toLocaleLowerCase().includes(normalizedQuery))
  }, [plans, query, status])

  useEffect(() => {
    if (!accessToken) return
    listPlans(accessToken)
      .then(setPlans)
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : t('plansPage.errors.load')))
      .finally(() => setLoading(false))
  }, [accessToken, t])

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
      setShowCreate(false)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('plansPage.errors.create'))
    }
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div><p className="eyebrow">{t('plansPage.eyebrow')}</p><h1 className="heading-with-icon"><ClipboardList aria-hidden="true" />{t('plansPage.title')}</h1></div>
        <div className="plans-header-actions"><Link className="icon-button" to="/dashboard"><ArrowLeft aria-hidden="true" /><LayoutDashboard aria-hidden="true" />{t('navigation.dashboard')}</Link><button type="button" className="icon-button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" />{t('plansPage.create.title')}</button></div>
      </header>
      {error && <p className="form-error panel" role="alert">{error}</p>}
      <section className={`plan-layout${showCreate ? ' plan-layout-open' : ''}`}>
        {showCreate && <form className="panel plan-form" onSubmit={submit}>
          <div className="section-heading"><h2>{t('plansPage.create.title')}</h2><button type="button" className="text-button icon-button" aria-label={t('plansPage.create.close')} onClick={() => setShowCreate(false)}><X aria-hidden="true" /></button></div>
          <label>{t('plansPage.fields.title')}<input name="title" maxLength={120} required /></label>
          <label>{t('plansPage.fields.description')}<textarea name="description" maxLength={2000} rows={4} /></label>
          <div className="date-fields">
            <label>{t('plansPage.fields.startDate')}<input name="startDate" type="date" /></label>
            <label>{t('plansPage.fields.endDate')}<input name="endDate" type="date" /></label>
          </div>
          <button type="submit" className="icon-button"><Plus aria-hidden="true" />{t('plansPage.create.action')}</button>
        </form>}
        <section className="panel plans-catalog" aria-labelledby="plan-list-title">
          <div className="plans-list-heading"><div><p className="eyebrow">{t('plansPage.eyebrow')}</p><h2 id="plan-list-title">{t('plansPage.list.title')}</h2></div><strong>{filteredPlans.length} / {plans.length}</strong></div>
          <div className="plans-toolbar">
            <label className="plan-search"><span className="visually-hidden">{t('plansPage.list.search')}</span><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('plansPage.list.search')} /></label>
            <div className="plan-filters" aria-label={t('plansPage.list.filter')}><button type="button" className={`text-button${status === 'all' ? ' active' : ''}`} onClick={() => setStatus('all')}>{t('plansPage.list.all')}</button>{statuses.map((option) => <button type="button" className={`text-button${status === option ? ' active' : ''}`} key={option} onClick={() => setStatus(option)}>{t(`plan.states.${option}`)}</button>)}</div>
          </div>
          {loading && <p>{t('plansPage.list.loading')}</p>}
          {!loading && filteredPlans.length === 0 && <p className="empty-state">{t('plansPage.list.empty')}</p>}
          <div className="plan-list">
            {filteredPlans.map((plan) => (
              <Link className="plan-row" to={`/plans/${plan.id}`} key={plan.id}>
                <span className="plan-row-icon"><Target aria-hidden="true" /></span><span className="plan-row-copy"><strong>{plan.title}</strong><small>{plan.description || t('plansPage.list.noDescription')}</small>{(plan.start_date || plan.end_date) && <small className="plan-dates"><CalendarDays aria-hidden="true" />{plan.start_date || '—'}{plan.end_date ? ` — ${plan.end_date}` : ''}</small>}</span>
                <span className="plan-row-action"><span className={`status-badge status-${plan.status}`}>{t(`plan.states.${plan.status}`)}</span><ChevronRight aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
