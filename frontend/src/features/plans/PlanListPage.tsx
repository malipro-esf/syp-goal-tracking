import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ClipboardList, LayoutDashboard, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { createPlan, listPlans, type Plan } from './plans-api'

export function PlanListPage() {
  const { accessToken } = useAuth()
  const { t } = useTranslation()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('plansPage.errors.create'))
    }
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div><p className="eyebrow">{t('plansPage.eyebrow')}</p><h1 className="heading-with-icon"><ClipboardList aria-hidden="true" />{t('plansPage.title')}</h1></div>
        <Link className="icon-button" to="/dashboard"><ArrowLeft aria-hidden="true" /><LayoutDashboard aria-hidden="true" />{t('navigation.dashboard')}</Link>
      </header>
      <section className="plan-layout">
        <form className="panel plan-form" onSubmit={submit}>
          <h2>{t('plansPage.create.title')}</h2>
          <label>{t('plansPage.fields.title')}<input name="title" maxLength={120} required /></label>
          <label>{t('plansPage.fields.description')}<textarea name="description" maxLength={2000} rows={4} /></label>
          <div className="date-fields">
            <label>{t('plansPage.fields.startDate')}<input name="startDate" type="date" /></label>
            <label>{t('plansPage.fields.endDate')}<input name="endDate" type="date" /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="icon-button"><Plus aria-hidden="true" />{t('plansPage.create.action')}</button>
        </form>
        <section className="panel" aria-labelledby="plan-list-title">
          <h2 id="plan-list-title">{t('plansPage.list.title')}</h2>
          {loading && <p>{t('plansPage.list.loading')}</p>}
          {!loading && plans.length === 0 && <p className="empty-state">{t('plansPage.list.empty')}</p>}
          <div className="plan-list">
            {plans.map((plan) => (
              <Link className="plan-row" to={`/plans/${plan.id}`} key={plan.id}>
                <span><strong>{plan.title}</strong><small>{plan.description || t('plansPage.list.noDescription')}</small></span>
                <span className="plan-row-action"><span className={`status-badge status-${plan.status}`}>{t(`plan.states.${plan.status}`)}</span><ChevronRight aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
