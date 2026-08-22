import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

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
      setError(caught instanceof ApiError ? caught.message : 'Could not load coaching.'))
  }, [accessToken, coach])

  async function makeTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!accessToken) return
    const form = event.currentTarget; const data = new FormData(form)
    try {
      const item = await createTemplate(accessToken, {
        title: String(data.get('title')), description: String(data.get('description')) || null,
      })
      setTemplates((items) => [item, ...items]); form.reset(); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not create plan template.') }
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
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not add activity.') }
  }

  async function send(event: FormEvent<HTMLFormElement>, templateId: string) {
    event.preventDefault(); if (!accessToken) return
    const form = event.currentTarget; const data = new FormData(form)
    try {
      const item = await assignTemplate(accessToken, templateId, {
        participant_email: String(data.get('email')), start_date: String(data.get('startDate')),
      })
      setAssignments((items) => [item, ...items]); form.reset(); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not send invitation.') }
  }

  async function respond(id: string, action: 'accept' | 'reject') {
    if (!accessToken) return
    try {
      const updated = await respondInvitation(accessToken, id, action)
      setAssignments((items) => items.map((item) => item.id === id ? updated : item))
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not answer invitation.') }
  }

  return <main className="page-shell wide-shell">
    <header className="page-header"><div><p className="eyebrow">Coach collaboration</p>
      <h1>{coach ? 'Plan templates & assignments' : 'Plan invitations'}</h1></div>
      <Link to="/dashboard">Dashboard</Link></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {coach && <><form className="panel" onSubmit={makeTemplate}><h2>New reusable plan template</h2>
      <label>Title<input name="title" required /></label>
      <label>Description<textarea name="description" /></label><button>Create plan template</button></form>
      <section className="coaching-grid">{templates.map((template) =>
        <article className="panel" key={template.id}><h2>{template.title}</h2><p>{template.description}</p>
          <ul>{template.activities.map((activity) => <li key={activity.id}>{activity.name}: {formatNumber(activity.target_quantity)} {activity.unit_code} · {activity.schedule_type}</li>)}</ul>
          <form onSubmit={(event) => addActivity(event, template.id)}><h3>Add activity</h3>
            <label>Name<input name="name" required /></label>
            <label>Target<input name="target" type="number" min="0.0001" step="0.0001" required /></label>
            <label>Unit<select name="unit"><option value="minute">Minute</option><option value="page">Page</option><option value="repetition">Repetition</option><option value="kilometer">Kilometer</option></select></label>
            <label>Frequency<select name="schedule"><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
            <button className="secondary-button">Add activity</button></form>
          <form onSubmit={(event) => send(event, template.id)}><h3>Assign to participant</h3>
            <label>Email<input name="email" type="email" required /></label>
            <label>Start date<input name="startDate" type="date" defaultValue={today()} required /></label>
            <button disabled={!template.activities.length}>Send invitation</button></form>
        </article>)}</section></>}
    <section><h2>{coach ? 'Sent assignments' : 'Invitations'}</h2>
      {assignments.length === 0 && <p className="empty-state">Nothing here yet.</p>}
      {assignments.map((item) => <article className="panel assignment-row" key={item.id}>
        <div><strong>{item.template_title}</strong><span>{coach ? `${item.participant_name} · ${item.participant_email}` : `Starts ${item.start_date}`}</span></div>
        <b>{item.status}</b>{!coach && item.status === 'pending' && <div className="button-row">
          <button onClick={() => respond(item.id, 'accept')}>Accept</button>
          <button className="secondary-button" onClick={() => respond(item.id, 'reject')}>Reject</button></div>}
        {item.enrollment_id && <Link to={`/plans/${item.enrollment_id}`}>Open plan</Link>}
      </article>)}</section>
  </main>
}
