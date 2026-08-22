import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { ApiError } from '../../api/client'
import { useAuth } from './useAuth'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { isLoading, login, register, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (!isLoading && user) return <Navigate to="/dashboard" replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const data = new FormData(event.currentTarget)
    try {
      const email = String(data.get('email'))
      const password = String(data.get('password'))
      if (mode === 'register') await register(email, password, String(data.get('displayName')))
      else await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const registering = mode === 'register'
  return (
    <main className="page-shell">
      <section className="auth-card">
        <p className="eyebrow">Progress over perfection.</p>
        <h1>{registering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="description">
          {registering ? 'Start turning plans into measurable progress.' : 'Continue working on your goals.'}
        </p>
        <form onSubmit={submit}>
          {registering && <label>Display name<input name="displayName" autoComplete="name" minLength={2} maxLength={100} required /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={12} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting || isLoading}>
            {submitting ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="form-switch">
          {registering ? 'Already registered?' : 'New to SYP?'}{' '}
          <Link to={registering ? '/login' : '/register'}>{registering ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </section>
    </main>
  )
}
