import { useEffect, useState, type FormEvent } from 'react'

import { ApiError } from '../../api/client'
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
  const [schedule, setSchedule] = useState<ScheduleType>('daily')
  return (
    <>
      <label>Frequency<select name="scheduleType" value={schedule} onChange={(event) => setSchedule(event.target.value as ScheduleType)}>
        <option value="daily">Every day</option><option value="weekly">Weekly quota</option><option value="selected_days">Selected weekdays</option>
      </select></label>
      {schedule === 'selected_days' && <fieldset className="weekday-picker"><legend>Weekdays</legend>{weekdays.map((day, index) => (
        <label key={`${prefix}${day}`}><input name="weekdays" type="checkbox" value={index} />{day}</label>
      ))}</fieldset>}
    </>
  )
}

function RevisionForm({ activity, planId, onRevised }: { activity: Activity; planId: string; onRevised: (activity: Activity) => void }) {
  const { accessToken } = useAuth()
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    try { onRevised(await reviseActivity(accessToken, planId, activity.id, expectationFromForm(new FormData(event.currentTarget)))); setError('') }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not revise expectation.') }
  }
  return <details className="revision-box"><summary>Change future expectation</summary><form onSubmit={submit}>
    <label>New target<input name="targetQuantity" type="number" min="0.0001" step="0.0001" required /></label>
    <ScheduleFields prefix={activity.id} />
    <label>Effective from<input name="effectiveFrom" type="date" min={today()} required /></label>
    <label>Reason (optional)<input name="reason" maxLength={300} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="secondary-button">Save new expectation</button>
  </form></details>
}

function RecordProgressForm({ activity, planId, onRecorded }: { activity: Activity; planId: string; onRecorded: (entry: ProgressEntry) => void }) {
  const { accessToken } = useAuth()
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      onRecorded(await createProgressEntry(accessToken, planId, activity.id, {
        quantity: String(data.get('quantity')),
        performed_on: String(data.get('performedOn')),
        note: String(data.get('note')) || null,
      }))
      form.reset(); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not record effort.') }
  }
  const unit = activity.custom_unit_label ?? activity.unit_code
  return <details className="record-box"><summary>Record effort</summary><form onSubmit={submit}>
    <label>Actual amount ({unit})<input name="quantity" type="number" min="0.0001" step="0.0001" required /></label>
    <label>Performed on<input name="performedOn" type="date" max={today()} defaultValue={today()} required /></label>
    <label>Note (optional)<input name="note" maxLength={1000} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit">Save actual effort</button>
  </form></details>
}

export type ActivityPanelView = 'activities' | 'progress' | 'entries'

export function ActivityPanel({ planId, planStatus, view = 'activities' }: {
  planId: string
  planStatus: string
  view?: ActivityPanelView
}) {
  const { accessToken } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [entries, setEntries] = useState<ProgressEntry[]>([])
  const [unit, setUnit] = useState<UnitCode>('minute')
  const [error, setError] = useState('')
  const readOnly = planStatus === 'completed' || planStatus === 'archived'
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
    try {
      const created = await createActivity(accessToken, planId, {
        ...expectationFromForm(data),
        name: String(data.get('name')),
        description: String(data.get('description')) || null,
        unit_code: unit,
        custom_unit_label: unit === 'custom' ? String(data.get('customUnitLabel')) : null,
      })
      setActivities((current) => [...current, created])
      form.reset(); setUnit('minute'); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not create activity.') }
  }

  if (view === 'progress') return <ProgressSummary planId={planId} entries={entries} />
  if (view === 'entries') return <ProgressHistory planId={planId} activities={activities} entries={entries} readOnly={planStatus === 'archived'} onEntriesChange={setEntries} />

  return <section className="activity-section admin-section">
    <div className="section-heading"><div><p className="eyebrow">Measurable execution</p><h2>Activities</h2></div><span className="section-count">{activities.length} total</span></div>
    {!readOnly && <details className="panel create-activity-panel"><summary>Add activity</summary><form className="activity-form" onSubmit={submit}>
      <label>Activity name<input name="name" maxLength={120} placeholder="Listening practice" required /></label>
      <label>Description<textarea name="description" rows={2} maxLength={2000} /></label>
      <div className="activity-grid">
        <label>Target<input name="targetQuantity" type="number" min="0.0001" step="0.0001" required /></label>
        <label>Unit<select name="unitCode" value={unit} onChange={(event) => setUnit(event.target.value as UnitCode)}>{units.map((item) => <option value={item.code} key={item.code}>{item.label}</option>)}</select></label>
      </div>
      {unit === 'custom' && <label>Custom unit label<input name="customUnitLabel" maxLength={40} placeholder="essay" required /></label>}
      <ScheduleFields />
      <label>Effective from<input name="effectiveFrom" type="date" defaultValue={today()} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit">Add activity</button>
    </form></details>}
    <div className="activity-list">
      {activities.length === 0 && <p className="empty-state">No activities yet.</p>}
      {activities.map((activity) => {
        const unitLabel = activity.custom_unit_label ?? activity.unit_code
        const schedule = activity.current_schedule.schedule_type === 'selected_days'
          ? activity.current_schedule.weekdays?.map((day) => weekdays[day]).join(', ')
          : activity.current_schedule.schedule_type.replace('_', ' ')
        return <article className="panel activity-card" key={activity.id}>
          <div><h3>{activity.name}</h3><p>{activity.description}</p></div>
          <p className="expectation"><strong>{formatNumber(activity.current_target.target_quantity)} {unitLabel}</strong><span>{schedule}</span><small>Effective {activity.current_target.effective_from}</small></p>
          {canRecord && <RecordProgressForm activity={activity} planId={planId} onRecorded={(entry) => setEntries((current) => [entry, ...current])} />}
          {!readOnly && <RevisionForm activity={activity} planId={planId} onRevised={(revised) => setActivities((current) => current.map((item) => item.id === revised.id ? revised : item))} />}
        </article>
      })}
    </div>
  </section>
}
