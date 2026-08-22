import { useEffect, useState } from 'react'

import { apiRequest, ApiError } from '../../api/client'
import { formatNumber } from '../../utils/format-number'
import { useAuth } from '../auth/useAuth'

type OverviewActivity = {
  activity_id: string
  name: string
  adherence_percent: string
}

type OverviewReport = {
  overall_adherence_percent: string
  activities: OverviewActivity[]
}

function localDate(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 10)
}

function currentWeek() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: localDate(monday), end: localDate(sunday) }
}

function boundedPercent(value: string) {
  const percent = Number(value)
  return Number.isFinite(percent) ? Math.min(Math.max(percent, 0), 100) : 0
}

export function OverviewProgressChart({ planId }: { planId: string }) {
  const { accessToken } = useAuth()
  const [report, setReport] = useState<OverviewReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    const { start, end } = currentWeek()
    const params = new URLSearchParams({ start_date: start, end_date: end })
    apiRequest<OverviewReport>(`/api/v1/plans/${planId}/progress-report?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((result) => { setReport(result); setError('') })
      .catch((caught: unknown) => setError(
        caught instanceof ApiError ? caught.message : 'Could not load this week’s progress.',
      ))
  }, [accessToken, planId])

  return <section className="panel overview-chart" aria-labelledby="overview-progress-title">
    <div className="section-heading">
      <div><p className="eyebrow">This week</p><h2 id="overview-progress-title">Progress snapshot</h2></div>
      {report && <strong className="chart-score">{formatNumber(report.overall_adherence_percent)}%</strong>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!report && !error && <p className="chart-message">Calculating progress…</p>}
    {report && report.activities.length === 0 && <p className="chart-message">Add an activity to see progress here.</p>}
    {report && report.activities.length > 0 && <div className="chart-bars" role="img" aria-label={`Weekly overall adherence ${formatNumber(report.overall_adherence_percent)} percent`}>
      {report.activities.map((activity) => <div className="chart-row" key={activity.activity_id}>
        <div className="chart-label"><span>{activity.name}</span><strong>{formatNumber(activity.adherence_percent)}%</strong></div>
        <div className="chart-track"><span style={{ width: `${boundedPercent(activity.adherence_percent)}%` }} /></div>
      </div>)}
    </div>}
  </section>
}
