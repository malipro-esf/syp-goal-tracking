import { useEffect, useState, type FormEvent } from 'react'
import { ChevronDown, LifeBuoy, Send } from 'lucide-react'

import { ApiError } from '../../api/client'
import { AppHeader } from '../../app/AppHeader'
import { SiteFooter } from '../../app/SiteFooter'
import { useAuth } from '../auth/useAuth'
import { submitSupportRequest, type SupportCategory } from './support-api'

const faqs = [
  ['How do I accept a coaching invitation?', 'Open Invitations, select the pending invitation, and choose Accept. The assigned plan will then appear in Plans.'],
  ['Can a participant change an assigned plan?', 'No. Coach-managed plan dates and activities are locked. Participants can record their actual activity and review progress.'],
  ['Where can I record completed activities?', 'Open your active plan and select Activities, expand an activity, enter the result and date, then save it.'],
  ['Why am I not receiving a notification?', 'Check your notification preferences. Email delivery is not available yet, but enabled updates appear in the in-app notification feed.'],
]

export function SupportPage() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.display_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [category, setCategory] = useState<SupportCategory>('account')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.display_name)
    setEmail(user.email)
  }, [user])
  useEffect(() => {
    if (!statusMessage) return
    const timeoutId = window.setTimeout(() => setStatusMessage(''), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [statusMessage])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const created = await submitSupportRequest({ name, email, category, subject, message })
      setStatusMessage(`Your request was received. Reference: ${created.id.slice(0, 8).toUpperCase()}`)
      setSubject('')
      setMessage('')
      setError('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Your support request could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return <><AppHeader /><main className="support-page">
    <header className="support-hero"><p className="eyebrow">Help center</p><h1>How can we help?</h1><p>Find a quick answer or send a request to the SYP support team.</p></header>
    <div className="support-grid">
      <section><div className="section-heading"><div><p className="eyebrow">Common questions</p><h2>Help topics</h2></div></div><div className="faq-list">{faqs.map(([question, answer]) => <details className="card" key={question}><summary>{question}<ChevronDown aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>
      <section className="card support-form-card"><LifeBuoy aria-hidden="true" /><div><p className="eyebrow">Contact us</p><h2>Send a support request</h2><p>We normally review new requests within two business days.</p></div>
        <form onSubmit={submit}>
          <div className="support-form-row"><label>Name<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div>
          <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)}><option value="account">Account</option><option value="plans">Plans</option><option value="coaching">Coaching</option><option value="technical">Technical issue</option><option value="feedback">Feedback</option><option value="other">Other</option></select></label>
          <label>Subject<input required minLength={3} maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label>Message<textarea required minLength={10} maxLength={5000} rows={7} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}{statusMessage && <p className="form-success" role="status">{statusMessage}</p>}
          <button type="submit" className="icon-button" disabled={submitting}><Send aria-hidden="true" />{submitting ? 'Sending…' : 'Send request'}</button>
        </form>
      </section>
    </div>
  </main><SiteFooter /></>
}
