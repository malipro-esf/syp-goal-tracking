import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'

import { ApiError } from '../../api/client'
import { SuccessToast } from '../../components/SuccessToast'
import { useAuth } from '../auth/useAuth'
import type { Plan } from '../plans/plans-api'
import { ProgressSummary } from '../progress/ProgressSummary'
import { getCoachEnrollment, updateCoachEnrollment } from './coaching-api'
import { FeedbackPanel } from './FeedbackPanel'

export function CoachEnrollmentPage() {
  const { enrollmentId = '' } = useParams()
  const { accessToken } = useAuth()
  const { t } = useTranslation()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    getCoachEnrollment(accessToken, enrollmentId).then(setPlan).catch((caught: unknown) =>
      setError(caught instanceof ApiError ? caught.message : t('plan.errors.load')))
  }, [accessToken, enrollmentId, t])

  async function saveEndDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    setSaving(true); setError(''); setMessage('')
    const endDate = String(new FormData(event.currentTarget).get('endDate')) || null
    try {
      setPlan(await updateCoachEnrollment(accessToken, enrollmentId, endDate))
      setMessage(t('plan.saved'))
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : t('plan.errors.save')) }
    finally { setSaving(false) }
  }

  return <main className="workspace-shell narrow-workspace">
    <header className="workspace-header"><div><p className="eyebrow">Participant review</p>
      <h1>Progress & feedback</h1></div><Link to="/coaching">Back to coaching</Link></header>
    <form className="panel plan-form coach-plan-settings" onSubmit={saveEndDate}>
      <div className="section-heading"><div><p className="eyebrow">{t('plan.configuration')}</p><h2>{t('plan.details')}</h2></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <SuccessToast message={message} onDismiss={() => setMessage('')} />
      <div className="date-fields">
        <label>{t('plan.startDate')}<input type="date" value={plan?.start_date ?? ''} disabled /></label>
        <label>{t('plan.endDate')}<input name="endDate" type="date" min={plan?.start_date ?? undefined} defaultValue={plan?.end_date ?? ''} key={plan?.end_date ?? 'open'} /></label>
      </div>
      <button type="submit" className="icon-button" disabled={!plan || saving}><Save aria-hidden="true" />{saving ? t('plan.saving') : t('plan.save')}</button>
    </form>
    <ProgressSummary planId={enrollmentId} entries={[]} />
    <FeedbackPanel enrollmentId={enrollmentId} canWrite />
  </main>
}
