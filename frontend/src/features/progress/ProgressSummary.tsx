import { useEffect, useState } from 'react'

import { apiRequest, ApiError } from '../../api/client'
import { formatNumber } from '../../utils/format-number'
import { useAuth } from '../auth/useAuth'
import type { ProgressEntry } from './progress-api'

type ActivityReport = {
  activity_id: string
  name: string
  unit: string
  expected: string
  actual: string
  attainment_percent: string
  adherence_percent: string
  completed_occurrences: number
  partial_occurrences: number
  missed_occurrences: number
  upcoming_occurrences: number
}
type ProgressReport = {
  start_date: string
  end_date: string
  overall_adherence_percent: string
  activities: ActivityReport[]
}

function localDate(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 10)
}

function weekRange() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return [localDate(monday), localDate(sunday)] as const
}

export function ProgressSummary({ planId, entries }: { planId: string; entries: ProgressEntry[] }) {
  const { accessToken } = useAuth()
  const initialWeek = weekRange()
  const [startDate, setStartDate] = useState(initialWeek[0])
  const [endDate, setEndDate] = useState(initialWeek[1])
  const [report, setReport] = useState<ProgressReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
    apiRequest<ProgressReport>(`/api/v1/plans/${planId}/progress-report?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(setReport).catch((caught: unknown) =>
      setError(caught instanceof ApiError ? caught.message : 'Could not calculate progress.'))
  }, [accessToken, planId, startDate, endDate, entries])

  function showToday() { const today = localDate(); setStartDate(today); setEndDate(today) }
  function showWeek() { const [start, end] = weekRange(); setStartDate(start); setEndDate(end) }

  return <section className="progress-summary">
    <header className="summary-header"><div><p className="eyebrow">Deterministic report</p><h2>Progress</h2></div><div className="button-row">
      <button type="button" className="secondary-button" onClick={showToday}>Today</button>
      <button type="button" className="secondary-button" onClick={showWeek}>This week</button>
    </div></header>
    <div className="date-fields panel report-dates">
      <label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {report && <>
      <div className="overall-score"><strong>{formatNumber(report.overall_adherence_percent)}%</strong><span>overall adherence</span></div>
      <div className="report-list">{report.activities.map((activity) => <article className="panel report-row" key={activity.activity_id}>
        <div><h3>{activity.name}</h3><p>{formatNumber(activity.actual)} / {formatNumber(activity.expected)} {activity.unit}</p></div>
        <div className="report-percent"><strong>{formatNumber(activity.attainment_percent)}%</strong><span>attainment</span></div>
        <dl><div><dt>Complete</dt><dd>{activity.completed_occurrences}</dd></div><div><dt>Partial</dt><dd>{activity.partial_occurrences}</dd></div><div><dt>Missed</dt><dd>{activity.missed_occurrences}</dd></div><div><dt>Upcoming</dt><dd>{activity.upcoming_occurrences}</dd></div></dl>
      </article>)}</div>
    </>}
  </section>
}
