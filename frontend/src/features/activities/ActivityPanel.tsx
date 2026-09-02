import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import { SuccessToast } from '../../components/SuccessToast'
import { formatNumber } from '../../utils/format-number'
import { useAuth } from '../auth/useAuth'
import { ProgressHistory } from '../progress/ProgressHistory'
import { ProgressSummary } from '../progress/ProgressSummary'
import {
  createProgressEntry,
  listProgressEntries,
  type ProgressEntry,
} from '../progress/progress-api'
import {
  createActivity,
  listActivities,
  reviseActivity,
  type Activity,
  type ExpectationInput,
  type ScheduleType,
  type UnitCode,
} from './activities-api'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const units: { code: UnitCode; label: string }[] = [
  { code: 'minute', label: 'Minutes' }, { code: 'hour', label: 'Hours' },
  { code: 'page', label: 'Pages' }, { code: 'repetition', label: 'Repetitions' },
  { code: 'number', label: 'Number' }, { code: 'meter', label: 'Meters' },
  { code: 'kilometer', label: 'Kilometers' }, { code: 'custom', label: 'Custom unit' },
]
const today = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function expectationFromForm(data: FormData): ExpectationInput {
  const schedule = String(data.get('scheduleType')) as ScheduleType
  return {
    target_quantity: String(data.get('targetQuantity')),
    schedule_type: schedule,
    weekdays: schedule === 'selected_days' ? data.getAll('weekdays').map(Number) : null,
    effective_from: String(data.get('effectiveFrom')),
    reason: String(data.get('reason') ?? '') || null,
  }
}

function ScheduleFields({ prefix = '' }: { prefix?: string }) {
  const { t } = useTranslation()
  const [schedule, setSchedule] = useState<ScheduleType>('daily')
  return (
    <>
      <label>{t('execution.activities.frequency')}<select name="scheduleType" value={schedule} onChange={(event) => setSchedule(event.target.value as ScheduleType)}>
        <option value="daily">{t('execution.schedules.daily')}</option><option value="weekly">{t('execution.schedules.weekly')}</option><option value="selected_days">{t('execution.schedules.selected_days')}</option>
      </select></label>
      {schedule === 'selected_days' && <fieldset className="weekday-picker"><legend>{t('execution.activities.weekdays')}</legend>{weekdays.map((day, index) => (
        <label key={`${prefix}${day}`}><input name="weekdays" type="checkbox" value={index} />{t(`execution.weekdays.${day.toLowerCase()}`)}</label>
      ))}</fieldset>}
    </>
  )
}

function RevisionForm({ activity, planId, onRevised }: { activity: Activity; planId: string; onRevised: (activity: Activity) => void }) {
  const { accessToken } = useAuth()
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    setSaving(true); setMessage(''); setError('')
    try { onRevised(await reviseActivity(accessToken, planId, activity.id, expectationFromForm(new FormData(event.currentTarget)))); setMessage(t('execution.activities.expectationSaved')) }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : t('execution.errors.expectation')) }
    finally { setSaving(false) }
  }
  return <details className="revision-box"><summary>{t('execution.activities.changeExpectation')}</summary><form onSubmit={submit}>
    <label>{t('execution.activities.newTarget')}<input name="targetQuantity" type="number" min="0.0001" step="0.0001" required /></label>
    <ScheduleFields prefix={activity.id} />
    <label>{t('execution.activities.effectiveFrom')}<input name="effectiveFrom" type="date" min={today()} required /></label>
    <label>{t('execution.activities.reasonOptional')}<input name="reason" maxLength={300} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <SuccessToast message={message} onDismiss={() => setMessage('')} />
    <button type="submit" className="secondary-button" disabled={saving}>{saving ? t('execution.saving') : t('execution.activities.saveExpectation')}</button>
  </form></details>
}

function RecordProgressForm({ activity, planId, onRecorded }: { activity: Activity; planId: string; onRecorded: (entry: ProgressEntry) => void }) {
  const { accessToken } = useAuth()
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const form = event.currentTarget
    const data = new FormData(form)
    setSaving(true); setMessage(''); setError('')
    try {
      onRecorded(await createProgressEntry(accessToken, planId, activity.id, {
        quantity: String(data.get('quantity')),
        performed_on: String(data.get('performedOn')),
        note: String(data.get('note')) || null,
      }))
      form.reset()
      setMessage(t('execution.activities.effortSaved'))
      detailsRef.current?.removeAttribute('open')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : t('execution.errors.effort')) }
    finally { setSaving(false) }
  }
  const unit = activity.custom_unit_label ?? activity.unit_code
  return <>
    <details className="record-box" ref={detailsRef}><summary>{t('execution.activities.recordEffort')}</summary><form onSubmit={submit}>
      <label>{t('execution.activities.actualAmount', { unit: t(`execution.units.${unit}`, { defaultValue: unit }) })}<input name="quantity" type="number" min="0.0001" step="0.0001" required /></label>
      <label>{t('execution.activities.performedOn')}<input name="performedOn" type="date" max={today()} defaultValue={today()} required /></label>
      <label>{t('execution.activities.noteOptional')}<input name="note" maxLength={1000} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" disabled={saving}>{saving ? t('execution.saving') : t('execution.activities.saveEffort')}</button>
    </form></details>
    <SuccessToast message={message} onDismiss={() => setMessage('')} />
  </>
}

export type ActivityPanelView = 'activities' | 'progress' | 'entries'

export function ActivityPanel({ planId, planTitle, planStatus, canEdit = true, view = 'activities' }: {
  planId: string
  planTitle: string
  planStatus: string
  canEdit?: boolean
  view?: ActivityPanelView
}) {
  const { accessToken } = useAuth()
  const { t } = useTranslation()
  const [activities, setActivities] = useState<Activity[]>([])
  const [entries, setEntries] = useState<ProgressEntry[]>([])
  const [unit, setUnit] = useState<UnitCode>('minute')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const readOnly = !canEdit || planStatus === 'completed' || planStatus === 'archived'
  const canRecord = planStatus === 'active' || planStatus === 'paused'

  useEffect(() => {
    if (accessToken) Promise.all([
      listActivities(accessToken, planId),
      listProgressEntries(accessToken, planId),
    ]).then(([loadedActivities, loadedEntries]) => {
      setActivities(loadedActivities); setEntries(loadedEntries)
    }).catch((caught: unknown) =>
      setError(caught instanceof ApiError ? caught.message : 'Could not load plan execution data.'))
  }, [accessToken, planId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const form = event.currentTarget
    const data = new FormData(form)
    setSaving(true); setMessage(''); setError('')
    try {
      const created = await createActivity(accessToken, planId, {
        ...expectationFromForm(data),
        name: String(data.get('name')),
        description: String(data.get('description')) || null,
        unit_code: unit,
        custom_unit_label: unit === 'custom' ? String(data.get('customUnitLabel')) : null,
      })
      setActivities((current) => [...current, created])
      form.reset(); setUnit('minute'); setMessage(t('execution.activities.activitySaved'))
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : t('execution.errors.activity')) }
    finally { setSaving(false) }
  }

  if (view === 'progress') return <ProgressSummary planId={planId} entries={entries} />
  if (view === 'entries') return <ProgressHistory planId={planId} activities={activities} entries={entries} readOnly={planStatus === 'archived'} onEntriesChange={setEntries} />

  return <section className="activity-section admin-section">
    <div className="section-heading"><div><p className="eyebrow">{t('execution.activities.eyebrow')}</p><h2>{t('execution.activities.title')}</h2></div><span className="section-count">{t('execution.activities.total', { count: activities.length })}</span></div>
    {!readOnly && <details className="panel create-activity-panel"><summary>{t('execution.activities.addToPlan', { plan: planTitle })}</summary><form className="activity-form" onSubmit={submit}>
      <label>{t('execution.activities.name')}<input name="name" maxLength={120} required /></label>
      <label>{t('execution.activities.description')}<textarea name="description" rows={2} maxLength={2000} /></label>
      <div className="activity-grid">
        <label>{t('execution.activities.target')}<input name="targetQuantity" type="number" min="0.0001" step="0.0001" required /></label>
        <label>{t('execution.activities.unit')}<select name="unitCode" value={unit} onChange={(event) => setUnit(event.target.value as UnitCode)}>{units.map((item) => <option value={item.code} key={item.code}>{t(`execution.units.${item.code}`, { defaultValue: item.label })}</option>)}</select></label>
      </div>
      {unit === 'custom' && <label>{t('execution.activities.customUnit')}<input name="customUnitLabel" maxLength={40} required /></label>}
      <ScheduleFields />
      <label>{t('execution.activities.effectiveFrom')}<input name="effectiveFrom" type="date" defaultValue={today()} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <SuccessToast message={message} onDismiss={() => setMessage('')} />
      <button type="submit" disabled={saving}>{saving ? t('execution.adding') : t('execution.activities.add')}</button>
    </form></details>}
    <div className="activity-list">
      {activities.length === 0 && <p className="empty-state">{t('execution.activities.empty')}</p>}
      {activities.map((activity) => {
        const unitLabel = activity.custom_unit_label ?? activity.unit_code
        const schedule = activity.current_schedule.schedule_type === 'selected_days'
          ? activity.current_schedule.weekdays?.map((day) => t(`execution.weekdays.${weekdays[day].toLowerCase()}`)).join(', ')
          : t(`execution.schedules.${activity.current_schedule.schedule_type}`)
        return <article className="panel activity-card" key={activity.id}>
          <div><h3>{activity.name}</h3><p>{activity.description}</p></div>
          <p className="expectation"><strong>{formatNumber(activity.current_target.target_quantity)} {t(`execution.units.${unitLabel}`, { defaultValue: unitLabel })}</strong><span>{schedule}</span><small>{t('execution.activities.effective', { date: activity.current_target.effective_from })}</small></p>
          {canRecord && <RecordProgressForm activity={activity} planId={planId} onRecorded={(entry) => setEntries((current) => [entry, ...current])} />}
          {!readOnly && <RevisionForm activity={activity} planId={planId} onRevised={(revised) => setActivities((current) => current.map((item) => item.id === revised.id ? revised : item))} />}
        </article>
      })}
    </div>
  </section>
}
