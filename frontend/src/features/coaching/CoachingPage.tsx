import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, CheckCircle2, ClipboardList, Clock3, ExternalLink, FileStack, Hourglass, LayoutDashboard, Mail, Plus, Send, Settings, Users, XCircle } from 'lucide-react'

import { ApiError } from '../../api/client'
import { formatNumber } from '../../utils/format-number'
import { useAuth } from '../auth/useAuth'
import {
  addTemplateActivity, assignTemplate, createTemplate, listInvitations,
  listSent, listTemplates, respondInvitation, type Assignment, type PlanTemplate,
} from './coaching-api'

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
type AssignmentFilter = 'all' | 'pending' | 'accepted'

export function CoachingPage() {
  const { accessToken, user } = useAuth()
  const { i18n, t } = useTranslation()
  const coach = user?.roles.includes('coach') ?? false
  const [templates, setTemplates] = useState<PlanTemplate[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    const request = coach
      ? Promise.all([listTemplates(accessToken), listSent(accessToken)])
          .then(([items, sent]) => { setTemplates(items); setAssignments(sent) })
      : listInvitations(accessToken).then(setAssignments)
    request.catch((caught: unknown) =>
      setError(caught instanceof ApiError ? caught.message : t('coachingPage.errors.load')))
  }, [accessToken, coach, t])

  async function makeTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!accessToken) return
    const form = event.currentTarget; const data = new FormData(form)
    try {
      const item = await createTemplate(accessToken, {
        title: String(data.get('title')), description: String(data.get('description')) || null,
      })
      setTemplates((items) => [item, ...items]); form.reset(); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : t('coachingPage.errors.createTemplate')) }
  }

  async function addActivity(event: FormEvent<HTMLFormElement>, templateId: string) {
    event.preventDefault(); if (!accessToken) return
    const form = event.currentTarget; const data = new FormData(form)
    try {
      const updated = await addTemplateActivity(accessToken, templateId, {
        name: String(data.get('name')), unit_code: String(data.get('unit')) as 'minute',
        target_quantity: String(data.get('target')), schedule_type: String(data.get('schedule')) as 'daily',
        effective_from: today(), weekdays: null,
      })
      setTemplates((items) => items.map((item) => item.id === updated.id ? updated : item))
      form.reset(); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : t('coachingPage.errors.addActivity')) }
  }

  async function send(event: FormEvent<HTMLFormElement>, templateId: string) {
    event.preventDefault(); if (!accessToken) return
    const form = event.currentTarget; const data = new FormData(form)
    try {
      const item = await assignTemplate(accessToken, templateId, {
        participant_email: String(data.get('email')), start_date: String(data.get('startDate')),
      })
      setAssignments((items) => [item, ...items]); form.reset(); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : t('coachingPage.errors.send')) }
  }

  async function respond(id: string, action: 'accept' | 'reject') {
    if (!accessToken) return
    try {
      const updated = await respondInvitation(accessToken, id, action)
      setAssignments((items) => items.map((item) => item.id === id ? updated : item))
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : t('coachingPage.errors.respond')) }
  }

  const pendingCount = assignments.filter((item) => item.status === 'pending').length
  const acceptedCount = assignments.filter((item) => item.status === 'accepted').length
  const visibleAssignments = assignmentFilter === 'all'
    ? assignments
    : assignments.filter((item) => item.status === assignmentFilter)

  return <main className="admin-shell coaching-workspace">
    <aside className="admin-sidebar dashboard-sidebar">
      <Link className="admin-brand" to="/dashboard"><span>S</span><strong>SYP</strong></Link>
      <div className="sidebar-plan"><small>{t('dashboard.sidebar.workspace')}</small><strong>{user?.display_name}</strong><span>{user?.roles.map((role) => t(`auth.roles.${role}`)).join(', ')}</span></div>
      <nav className="admin-nav" aria-label={t('dashboard.sidebar.navigation')}>
        <Link to="/dashboard"><LayoutDashboard aria-hidden="true" />{t('dashboard.sidebar.overview')}</Link>
        <Link to="/plans"><ClipboardList aria-hidden="true" />{t('navigation.plans')}</Link>
        <Link className="active" to="/coaching"><Bot aria-hidden="true" />{t('navigation.coaching')}</Link>
        <Link to="/settings/profile"><Settings aria-hidden="true" />{t('dashboard.sidebar.settings')}</Link>
      </nav>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar coaching-topbar"><div><p className="eyebrow">{t('coachingPage.eyebrow')}</p>
        <h1>{t(coach ? 'coachingPage.coachTitle' : 'coachingPage.participantTitle')}</h1>
        <p>{t(coach ? 'coachingPage.coachDescription' : 'coachingPage.participantDescription')}</p></div>
      </header>

      <div className="admin-content coaching-content">
        {error && <p className="form-error panel" role="alert">{error}</p>}
        <section className="coaching-metrics" aria-label={t('coachingPage.summary.label')}>
          <button type="button" className={`panel metric-card metric-filter${assignmentFilter === 'all' ? ' active' : ''}`} aria-pressed={assignmentFilter === 'all'} onClick={() => setAssignmentFilter('all')}><span className="metric-icon"><Mail aria-hidden="true" /></span><div><small>{t('coachingPage.summary.total')}</small><strong>{assignments.length}</strong></div></button>
          <button type="button" className={`panel metric-card metric-filter${assignmentFilter === 'pending' ? ' active' : ''}`} aria-pressed={assignmentFilter === 'pending'} onClick={() => setAssignmentFilter('pending')}><span className="metric-icon metric-active"><Hourglass aria-hidden="true" /></span><div><small>{t('coachingPage.summary.pending')}</small><strong>{pendingCount}</strong></div></button>
          <button type="button" className={`panel metric-card metric-filter${assignmentFilter === 'accepted' ? ' active' : ''}`} aria-pressed={assignmentFilter === 'accepted'} onClick={() => setAssignmentFilter('accepted')}><span className="metric-icon metric-complete"><CheckCircle2 aria-hidden="true" /></span><div><small>{t('coachingPage.summary.accepted')}</small><strong>{acceptedCount}</strong></div></button>
        </section>

        {coach && <><form className="panel coaching-create-template" onSubmit={makeTemplate}><div className="section-heading"><div><p className="eyebrow">{t('coachingPage.template.eyebrow')}</p><h2>{t('coachingPage.template.new')}</h2></div><FileStack aria-hidden="true" /></div>
      <label>{t('coachingPage.fields.title')}<input name="title" required /></label>
      <label>{t('coachingPage.fields.description')}<textarea name="description" rows={3} /></label><button className="icon-button"><Plus aria-hidden="true" />{t('coachingPage.template.create')}</button></form>
      <section className="coaching-templates"><div className="section-heading"><div><p className="eyebrow">{t('coachingPage.template.libraryEyebrow')}</p><h2>{t('coachingPage.template.library')}</h2></div><span className="section-count">{templates.length}</span></div>
      {templates.length === 0 && <div className="panel coaching-empty"><FileStack aria-hidden="true" /><h3>{t('coachingPage.template.emptyTitle')}</h3><p>{t('coachingPage.template.emptyDescription')}</p></div>}
      <div className="coaching-grid">{templates.map((template) =>
        <article className="panel template-card" key={template.id}><div className="template-card-header"><span className="template-icon"><FileStack aria-hidden="true" /></span><div><h2>{template.title}</h2><p>{template.description || t('plansPage.list.noDescription')}</p></div><span className="section-count">{t('coachingPage.template.activityCount', { count: template.activities.length })}</span></div>
          <ul className="template-activity-list">{template.activities.map((activity) => <li key={activity.id}>{activity.name}: {formatNumber(activity.target_quantity)} {t(`coachingPage.units.${activity.unit_code}`)} · {t(`coachingPage.schedules.${activity.schedule_type}`)}</li>)}</ul>
          <div className="template-actions"><form onSubmit={(event) => addActivity(event, template.id)}><h3>{t('coachingPage.activity.add')}</h3>
            <label>{t('coachingPage.fields.name')}<input name="name" required /></label>
            <label>{t('coachingPage.fields.target')}<input name="target" type="number" min="0.0001" step="0.0001" required /></label>
            <label>{t('coachingPage.fields.unit')}<select name="unit"><option value="minute">{t('coachingPage.units.minute')}</option><option value="page">{t('coachingPage.units.page')}</option><option value="repetition">{t('coachingPage.units.repetition')}</option><option value="kilometer">{t('coachingPage.units.kilometer')}</option></select></label>
            <label>{t('coachingPage.fields.frequency')}<select name="schedule"><option value="daily">{t('coachingPage.schedules.daily')}</option><option value="weekly">{t('coachingPage.schedules.weekly')}</option></select></label>
            <button className="secondary-button icon-button"><Plus aria-hidden="true" />{t('coachingPage.activity.action')}</button></form>
          <form onSubmit={(event) => send(event, template.id)}><h3>{t('coachingPage.assignment.assign')}</h3>
            <label>{t('coachingPage.fields.email')}<input name="email" type="email" required /></label>
            <label>{t('coachingPage.fields.startDate')}<input name="startDate" type="date" defaultValue={today()} required /></label>
            <button className="icon-button" disabled={!template.activities.length}><Send aria-hidden="true" />{t('coachingPage.assignment.send')}</button></form></div>
        </article>)}</div></section></>}

        <section className="assignment-section"><div className="section-heading"><div><p className="eyebrow">{t('coachingPage.assignment.eyebrow')}</p><h2>{assignmentFilter === 'all' ? t(coach ? 'coachingPage.assignment.sent' : 'coachingPage.assignment.invitations') : t(`coachingPage.summary.${assignmentFilter}`)}</h2></div><span className="section-count">{visibleAssignments.length}</span></div>
          {visibleAssignments.length === 0 && <div className="panel coaching-empty"><Mail aria-hidden="true" /><h3>{t('coachingPage.assignment.emptyTitle')}</h3><p>{t('coachingPage.assignment.empty')}</p></div>}
          <div className="assignment-list">{visibleAssignments.map((item) => <article className="panel assignment-card" key={item.id}>
            <span className="assignment-icon"><Users aria-hidden="true" /></span><div className="assignment-copy"><strong>{item.template_title}</strong><span>{coach ? `${item.participant_name} · ${item.participant_email}` : <><Clock3 aria-hidden="true" />{t('coachingPage.assignment.starts', { date: new Date(`${item.start_date}T00:00:00`).toLocaleDateString(i18n.language) })}</>}</span></div>
            <span className={`status-badge status-${item.status}`}>{t(`coachingPage.statuses.${item.status}`)}</span>{!coach && item.status === 'pending' && <div className="button-row assignment-buttons">
              <button className="icon-button" onClick={() => respond(item.id, 'accept')}><CheckCircle2 aria-hidden="true" />{t('coachingPage.assignment.accept')}</button>
              <button className="secondary-button icon-button" onClick={() => respond(item.id, 'reject')}><XCircle aria-hidden="true" />{t('coachingPage.assignment.reject')}</button></div>}
            {item.enrollment_id && <Link className="assignment-open icon-button" to={coach ? `/coach/enrollments/${item.enrollment_id}` : `/plans/${item.enrollment_id}`}><ExternalLink aria-hidden="true" />{t(coach ? 'coachingPage.assignment.review' : 'coachingPage.assignment.open')}</Link>}
          </article>)}</div></section>
      </div>
    </section>
  </main>
}
