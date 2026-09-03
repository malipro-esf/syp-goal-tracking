import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Navigate } from 'react-router-dom'

import { ApiError, apiRequest } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { AdminLayout } from './AdminLayout'

type Breakdown = { label: string; count: number }
type Trend = { date: string; users: number; plans: number; entries: number }
type Coach = { coach_id: string; coach_name: string; coach_email: string; participants: number; plans: number; activity_entries: number }
type Report = {
  start_date: string
  end_date: string
  totals: Record<'new_users' | 'new_plans' | 'activity_entries' | 'active_participants' | 'completed_plans' | 'accepted_invitations', number>
  trend: Trend[]
  countries: Breakdown[]
  roles: Breakdown[]
  coaches: Coach[]
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const today = new Date()
const initialStart = new Date(today.getTime() - 29 * 86400000)

export function AdminReportsPage() {
  const { accessToken, user } = useAuth()
  const [startDate, setStartDate] = useState(isoDate(initialStart))
  const [endDate, setEndDate] = useState(isoDate(today))
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const isAdmin = user?.roles.includes('admin')
  useEffect(() => {
    if (!accessToken || !isAdmin) return
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
    apiRequest<Report>(`/api/v1/admin/reports?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((data) => { setReport(data); setError('') })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Report could not be loaded.'))
  }, [accessToken, endDate, isAdmin, startDate])
  const maxTrend = useMemo(() => Math.max(1, ...(report?.trend.map((point) => Math.max(point.users, point.plans, point.entries)) ?? [1])), [report])
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  async function download(dataset: 'users' | 'plans' | 'assignments') {
    try {
      const params = new URLSearchParams({ dataset, start_date: startDate, end_date: endDate })
      const response = await fetch(`/api/v1/admin/reports/export?${params}`, { credentials: 'include', headers: { Authorization: `Bearer ${accessToken}` } })
      if (!response.ok) throw new Error('Export failed')
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `syp-${dataset}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch { setError('The CSV export could not be downloaded.') }
  }

  return <AdminLayout active="reports" title="Analytics & reports" description="Track adoption and engagement without exposing private activity notes.">
    <section className="card admin-report-controls"><label>From<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>To<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label><div className="admin-export-actions"><button type="button" className="secondary-button" onClick={() => download('users')}><Download aria-hidden="true" />Users CSV</button><button type="button" className="secondary-button" onClick={() => download('plans')}><Download aria-hidden="true" />Plans CSV</button><button type="button" className="secondary-button" onClick={() => download('assignments')}><Download aria-hidden="true" />Invitations CSV</button></div></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    {report && <>
      <section className="admin-metrics" aria-label="Report totals">{Object.entries(report.totals).map(([label, value]) => <article className="card" key={label}><span>{label.replaceAll('_', ' ')}</span><strong>{value}</strong></article>)}</section>
      <section className="card admin-report-chart"><div className="section-heading"><div><p className="eyebrow">Daily activity</p><h2>Trend</h2></div><div className="chart-legend"><span className="users">Users</span><span className="plans">Plans</span><span className="entries">Entries</span></div></div><div className="trend-chart">{report.trend.map((point) => <div className="trend-day" key={point.date} title={`${point.date}: ${point.users} users, ${point.plans} plans, ${point.entries} entries`}><div className="trend-bars"><i className="users" style={{ height: point.users ? `${Math.max(2, point.users / maxTrend * 100)}%` : 0 }} /><i className="plans" style={{ height: point.plans ? `${Math.max(2, point.plans / maxTrend * 100)}%` : 0 }} /><i className="entries" style={{ height: point.entries ? `${Math.max(2, point.entries / maxTrend * 100)}%` : 0 }} /></div><small>{point.date.slice(5)}</small></div>)}</div></section>
      <div className="admin-report-grid"><BreakdownCard title="Users by country" items={report.countries} /><BreakdownCard title="Users by role" items={report.roles} /></div>
      <section className="card admin-users"><div className="section-heading"><div><p className="eyebrow">Coaching</p><h2>Coach activity</h2></div></div><div className="table-scroll"><table><thead><tr><th>Coach</th><th>Participants</th><th>Plans</th><th>Entries in period</th></tr></thead><tbody>{report.coaches.map((coach) => <tr key={coach.coach_id}><td><strong>{coach.coach_name}</strong><small>{coach.coach_email}</small></td><td>{coach.participants}</td><td>{coach.plans}</td><td>{coach.activity_entries}</td></tr>)}{report.coaches.length === 0 && <tr><td colSpan={4}>No coached plans yet.</td></tr>}</tbody></table></div></section>
    </>}
  </AdminLayout>
}

function BreakdownCard({ title, items }: { title: string; items: Breakdown[] }) {
  const maximum = Math.max(1, ...items.map((item) => item.count))
  return <section className="card admin-breakdown"><h2>{title}</h2>{items.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.count / maximum * 100}%` }} /></div><strong>{item.count}</strong></div>)}</section>
}
