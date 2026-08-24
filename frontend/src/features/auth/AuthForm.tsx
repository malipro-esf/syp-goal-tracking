import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'

import { ApiError } from '../../api/client'
import { AppHeader } from '../../app/AppHeader'
import { useAuth } from './useAuth'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { isLoading, login, register, user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  if (!isLoading && user) return <Navigate to="/dashboard" replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const data = new FormData(event.currentTarget)
    try {
      const email = String(data.get('email'))
      const password = String(data.get('password'))
      if (mode === 'register') await register(email, password, String(data.get('displayName')), String(data.get('accountType')) as 'participant' | 'coach')
      else await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('auth.errors.unexpected'))
    } finally {
      setSubmitting(false)
    }
  }

  const registering = mode === 'register'
  return <><AppHeader publicOnly />
    <main className="page-shell auth-page-shell">
      <section className="auth-card">
        <p className="eyebrow">{t('auth.eyebrow')}</p>
        <h1>{t(registering ? 'auth.register.title' : 'auth.login.title')}</h1>
        <p className="description">
          {t(registering ? 'auth.register.description' : 'auth.login.description')}
        </p>
        <form onSubmit={submit}>
          {registering && <label>{t('auth.fields.displayName')}<input name="displayName" autoComplete="name" minLength={2} maxLength={100} required /></label>}
          {registering && <label>{t('auth.fields.accountType')}<select name="accountType" defaultValue="participant"><option value="participant">{t('auth.roles.participant')}</option><option value="coach">{t('auth.roles.coach')}</option></select></label>}
          <label>{t('auth.fields.email')}<input name="email" type="email" autoComplete="email" required /></label>
          <label>
            {t('auth.fields.password')}
            <span className="password-field">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={registering ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={t(showPassword ? 'auth.password.hide' : 'auth.password.show')}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="icon-button" disabled={submitting || isLoading}>
            {registering ? <UserPlus aria-hidden="true" /> : <LogIn aria-hidden="true" />}
            {submitting ? t('auth.actions.wait') : t(registering ? 'auth.actions.create' : 'auth.actions.signIn')}
          </button>
        </form>
        <p className="form-switch">
          {t(registering ? 'auth.switch.registered' : 'auth.switch.new')}{' '}
          <Link to={registering ? '/login' : '/register'}>{t(registering ? 'auth.actions.signIn' : 'auth.actions.createLong')}</Link>
        </p>
      </section>
    </main>
  </>
}
