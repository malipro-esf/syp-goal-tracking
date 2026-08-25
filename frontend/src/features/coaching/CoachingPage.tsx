import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import { formatNumber } from '../../utils/format-number'
import { useAuth } from '../auth/useAuth'
import {
  addTemplateActivity, assignTemplate, createTemplate, listInvitations,
  listSent, listTemplates, respondInvitation, type Assignment, type PlanTemplate,
} from './coaching-api'

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

export function CoachingPage() {
  const { accessToken, user } = useAuth()
  const { t } = useTranslation()
  const coach = user?.roles.includes('coach') ?? false
  const [templates, setTemplates] = useState<PlanTemplate[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
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

  return <main className="page-shell wide-shell">
    <header className="page-header"><div><p className="eyebrow">{t('coachingPage.eyebrow')}</p>
      <h1>{t(coach ? 'coachingPage.coachTitle' : 'coachingPage.participantTitle')}</h1></div>
      <Link to="/dashboard">{t('navigation.dashboard')}</Link></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {coach && <><form className="panel" onSubmit={makeTemplate}><h2>{t('coachingPage.template.new')}</h2>
      <label>{t('coachingPage.fields.title')}<input name="title" required /></label>
      <label>{t('coachingPage.fields.description')}<textarea name="description" /></label><button>{t('coachingPage.template.create')}</button></form>
      <section className="coaching-grid">{templates.map((template) =>
        <article className="panel" key={template.id}><h2>{template.title}</h2><p>{template.description}</p>
          <ul>{template.activities.map((activity) => <li key={activity.id}>{activity.name}: {formatNumber(activity.target_quantity)} {activity.unit_code} · {activity.schedule_type}</li>)}</ul>
          <form onSubmit={(event) => addActivity(event, template.id)}><h3>{t('coachingPage.activity.add')}</h3>
            <label>{t('coachingPage.fields.name')}<input name="name" required /></label>
            <label>{t('coachingPage.fields.target')}<input name="target" type="number" min="0.0001" step="0.0001" required /></label>
            <label>{t('coachingPage.fields.unit')}<select name="unit"><option value="minute">{t('coachingPage.units.minute')}</option><option value="page">{t('coachingPage.units.page')}</option><option value="repetition">{t('coachingPage.units.repetition')}</option><option value="kilometer">{t('coachingPage.units.kilometer')}</option></select></label>
            <label>{t('coachingPage.fields.frequency')}<select name="schedule"><option value="daily">{t('coachingPage.schedules.daily')}</option><option value="weekly">{t('coachingPage.schedules.weekly')}</option></select></label>
            <button className="secondary-button">{t('coachingPage.activity.action')}</button></form>
          <form onSubmit={(event) => send(event, template.id)}><h3>{t('coachingPage.assignment.assign')}</h3>
            <label>{t('coachingPage.fields.email')}<input name="email" type="email" required /></label>
            <label>{t('coachingPage.fields.startDate')}<input name="startDate" type="date" defaultValue={today()} required /></label>
            <button disabled={!template.activities.length}>{t('coachingPage.assignment.send')}</button></form>
        </article>)}</section></>}
    <section><h2>{t(coach ? 'coachingPage.assignment.sent' : 'coachingPage.assignment.invitations')}</h2>
      {assignments.length === 0 && <p className="empty-state">{t('coachingPage.assignment.empty')}</p>}
      {assignments.map((item) => <article className="panel assignment-row" key={item.id}>
        <div><strong>{item.template_title}</strong><span>{coach ? `${item.participant_name} · ${item.participant_email}` : t('coachingPage.assignment.starts', { date: item.start_date })}</span></div>
        <b>{t(`coachingPage.statuses.${item.status}`)}</b>{!coach && item.status === 'pending' && <div className="button-row">
          <button onClick={() => respond(item.id, 'accept')}>{t('coachingPage.assignment.accept')}</button>
          <button className="secondary-button" onClick={() => respond(item.id, 'reject')}>{t('coachingPage.assignment.reject')}</button></div>}
        {item.enrollment_id && <Link to={coach ? `/coach/enrollments/${item.enrollment_id}` : `/plans/${item.enrollment_id}`}>{t(coach ? 'coachingPage.assignment.review' : 'coachingPage.assignment.open')}</Link>}
      </article>)}</section>
  </main>
}
