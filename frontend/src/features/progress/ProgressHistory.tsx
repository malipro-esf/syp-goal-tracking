import { useState, type FormEvent } from 'react'

import { ApiError } from '../../api/client'
import type { Activity } from '../activities/activities-api'
import { useAuth } from '../auth/useAuth'
import {
  deleteProgressEntry,
  updateProgressEntry,
  type ProgressEntry,
} from './progress-api'

function EditEntry({ entry, planId, onUpdated }: { entry: ProgressEntry; planId: string; onUpdated: (entry: ProgressEntry) => void }) {
  const { accessToken } = useAuth()
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const data = new FormData(event.currentTarget)
    try {
      onUpdated(await updateProgressEntry(accessToken, planId, entry.activity_id, entry.id, {
        quantity: String(data.get('quantity')),
        performed_on: String(data.get('performedOn')),
        note: String(data.get('note')) || null,
      }))
      setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not correct entry.') }
  }
  return <details className="entry-edit"><summary>Correct</summary><form onSubmit={submit}>
    <label>Actual amount<input name="quantity" type="number" min="0.0001" step="0.0001" defaultValue={entry.quantity} required /></label>
    <label>Date<input name="performedOn" type="date" defaultValue={entry.performed_on} required /></label>
    <label>Note<input name="note" defaultValue={entry.note ?? ''} maxLength={1000} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="secondary-button">Save correction</button>
  </form></details>
}

export function ProgressHistory({ planId, activities, entries, readOnly, onEntriesChange }: {
  planId: string
  activities: Activity[]
  entries: ProgressEntry[]
  readOnly: boolean
  onEntriesChange: (entries: ProgressEntry[]) => void
}) {
  const { accessToken } = useAuth()
  const [error, setError] = useState('')
  const activityById = new Map(activities.map((activity) => [activity.id, activity]))

  async function remove(entry: ProgressEntry) {
    if (!accessToken) return
    try {
      await deleteProgressEntry(accessToken, planId, entry.activity_id, entry.id)
      onEntriesChange(entries.filter((item) => item.id !== entry.id)); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not remove entry.') }
  }

  return <section className="progress-history">
    <div><p className="eyebrow">Actual execution</p><h2>Recent entries</h2></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {entries.length === 0 && <p className="empty-state">No effort recorded yet.</p>}
    {entries.map((entry) => {
      const activity = activityById.get(entry.activity_id)
      const unit = activity?.custom_unit_label ?? activity?.unit_code ?? ''
      return <article className="panel progress-row" key={entry.id}>
        <div><strong>{activity?.name ?? 'Activity'}</strong><span>{entry.performed_on}</span>{entry.note && <small>{entry.note}</small>}</div>
        <b>{entry.quantity} {unit}</b>
        {!readOnly && <div className="entry-actions">
          <EditEntry entry={entry} planId={planId} onUpdated={(updated) => onEntriesChange(entries.map((item) => item.id === updated.id ? updated : item))} />
          <button type="button" className="text-button danger-button" onClick={() => remove(entry)}>Remove</button>
        </div>}
      </article>
    })}
  </section>
}
