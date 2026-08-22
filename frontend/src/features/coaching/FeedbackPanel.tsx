import { useEffect, useState, type FormEvent } from 'react'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { createFeedback, listFeedback, type Feedback } from './coaching-api'

export function FeedbackPanel({ enrollmentId, canWrite = false }: {
  enrollmentId: string
  canWrite?: boolean
}) {
  const { accessToken } = useAuth()
  const [items, setItems] = useState<Feedback[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (accessToken) listFeedback(accessToken, enrollmentId).then(setItems).catch((caught: unknown) =>
      setError(caught instanceof ApiError ? caught.message : 'Could not load feedback.'))
  }, [accessToken, enrollmentId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!accessToken) return
    const form = event.currentTarget
    const message = String(new FormData(form).get('message'))
    try {
      const created = await createFeedback(accessToken, enrollmentId, message)
      setItems((current) => [created, ...current]); form.reset(); setError('')
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not leave feedback.') }
  }

  return <section className="feedback-panel"><p className="eyebrow">Coach communication</p><h2>Feedback</h2>
    {canWrite && <form className="panel" onSubmit={submit}><label>Feedback for participant
      <textarea name="message" maxLength={2000} rows={4} required /></label><button>Send feedback</button></form>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {items.length === 0 && <p className="empty-state">No coach feedback yet.</p>}
    {items.map((item) => <article className="panel feedback-item" key={item.id}>
      <div><strong>{item.coach_name}</strong><time>{new Date(item.created_at).toLocaleString()}</time></div>
      <p>{item.message}</p></article>)}
  </section>
}
