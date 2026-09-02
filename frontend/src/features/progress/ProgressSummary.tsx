import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  skipped_days: string[]
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
  const { t, i18n } = useTranslation()
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
      setError(caught instanceof ApiError ? caught.message : t('execution.errors.progress')))
  }, [accessToken, planId, startDate, endDate, entries, t])

  function showToday() { const today = localDate(); setStartDate(today); setEndDate(today) }
  function showWeek() { const [start, end] = weekRange(); setStartDate(start); setEndDate(end) }

  return <section className="progress-summary">
    <header className="summary-header"><div><p className="eyebrow">{t('execution.progress.eyebrow')}</p><h2>{t('execution.progress.title')}</h2></div><div className="button-row">
      <button type="button" className="secondary-button" onClick={showToday}>{t('execution.progress.today')}</button>
      <button type="button" className="secondary-button" onClick={showWeek}>{t('execution.progress.thisWeek')}</button>
    </div></header>
    <div className="date-fields panel report-dates">
      <label>{t('execution.progress.from')}<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label>{t('execution.progress.to')}<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {report && <>
      <div className="overall-score"><strong>{formatNumber(report.overall_adherence_percent)}%</strong><span>{t('execution.progress.overall')}</span></div>
      {(report.skipped_days?.length ?? 0) > 0 && <section className="panel skipped-days" aria-labelledby="skipped-days-title">
        <div className="skipped-days-heading">
          <div><p className="eyebrow">{t('execution.progress.attendance', { defaultValue: 'Attendance' })}</p><h3 id="skipped-days-title">{t('execution.progress.skippedDays', { defaultValue: 'Skipped days' })}</h3></div>
          <span className="section-count">{report.skipped_days.length}</span>
        </div>
        <p>{t('execution.progress.skippedDaysDescription', { defaultValue: 'No activity was recorded on these scheduled days.' })}</p>
        <div className="skipped-day-list">{report.skipped_days.map((day) => <time dateTime={day} key={day}>{new Intl.DateTimeFormat(i18n.language, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))}</time>)}</div>
      </section>}
      <div className="report-list">{report.activities.map((activity) => <article className="panel report-row" key={activity.activity_id}>
        <div><h3>{activity.name}</h3><p>{formatNumber(activity.actual)} / {formatNumber(activity.expected)} {t(`execution.units.${activity.unit}`, { defaultValue: activity.unit })}</p></div>
        <div className="report-percent"><strong>{formatNumber(activity.attainment_percent)}%</strong><span>{t('execution.progress.attainment')}</span></div>
        <dl><div><dt>{t('execution.progress.complete')}</dt><dd>{activity.completed_occurrences}</dd></div><div><dt>{t('execution.progress.partial')}</dt><dd>{activity.partial_occurrences}</dd></div><div><dt>{t('execution.progress.missed')}</dt><dd>{activity.missed_occurrences}</dd></div><div><dt>{t('execution.progress.upcoming')}</dt><dd>{activity.upcoming_occurrences}</dd></div></dl>
      </article>)}</div>
    </>}
  </section>
}
