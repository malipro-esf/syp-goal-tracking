import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { askCoach } from './ai-coach-api'

export function AiCoachPanel({ planId }: { planId: string }) {
  const { accessToken } = useAuth()
  const { t } = useTranslation()
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
      setError(caught instanceof ApiError ? caught.message : t('execution.errors.ai'))
    } finally { setLoading(false) }
  }

  return <section className="ai-coach-panel"><p className="eyebrow">{t('execution.ai.eyebrow')}</p><h2>{t('execution.ai.title')}</h2>
    <p>{t('execution.ai.description')}</p>
    <form className="panel" onSubmit={submit}>
      <label>{t('execution.ai.question')}<textarea name="question" minLength={3} maxLength={1000} rows={4} placeholder={t('execution.ai.placeholder')} required /></label>
      <label className="consent-row"><input type="checkbox" required />{t('execution.ai.consent')}</label>
      <button disabled={loading}>{loading ? t('execution.ai.analyzing') : t('execution.ai.ask')}</button>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {answer && <article className="panel ai-answer"><strong>{t('execution.ai.answer')}</strong><p>{answer}</p></article>}
  </section>
}
