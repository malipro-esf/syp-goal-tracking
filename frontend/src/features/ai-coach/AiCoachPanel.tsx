import { useState, type FormEvent } from 'react'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { askCoach } from './ai-coach-api'

export function AiCoachPanel({ planId }: { planId: string }) {
  const { accessToken } = useAuth()
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!accessToken) return
    const form = event.currentTarget
    setLoading(true); setError(''); setAnswer('')
    try {
      const result = await askCoach(accessToken, planId, String(new FormData(form).get('question')))
      setAnswer(result.answer)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The AI coach is temporarily unavailable.')
    } finally { setLoading(false) }
  }

  return <section className="ai-coach-panel"><p className="eyebrow">Optional AI guidance</p><h2>Ask your progress coach</h2>
    <p>The AI can read this plan’s progress through controlled tools. It cannot change your plan or records.</p>
    <form className="panel" onSubmit={submit}>
      <label>Your question<textarea name="question" minLength={3} maxLength={1000} rows={4} placeholder="Why am I falling behind, and what should I focus on?" required /></label>
      <label className="consent-row"><input type="checkbox" required />I agree to send relevant progress data to OpenAI for this answer.</label>
      <button disabled={loading}>{loading ? 'Analyzing…' : 'Ask AI coach'}</button>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {answer && <article className="panel ai-answer"><strong>AI-generated guidance</strong><p>{answer}</p></article>}
  </section>
}
