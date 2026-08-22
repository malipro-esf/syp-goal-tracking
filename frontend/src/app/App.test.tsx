import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { AuthProvider } from '../features/auth/AuthContext'
import { App } from './App'

afterEach(() => vi.restoreAllMocks())

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  )
}

test('redirects an anonymous visitor from the dashboard to login', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp('/dashboard')
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
})

test('logs in and displays the protected dashboard', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }))
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
    access_token: 'access-token',
    token_type: 'bearer',
    user: { id: '1', email: 'learner@example.com', display_name: 'SYP Learner', roles: ['participant'] },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

  renderApp('/login')
  const submit = await screen.findByRole('button', { name: 'Sign in' })
  await waitFor(() => expect(submit).toBeEnabled())
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'learner@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-battery-staple' } })
  fireEvent.submit(submit.closest('form')!)

  expect(await screen.findByRole('heading', { name: 'Hello, SYP Learner' })).toBeInTheDocument()
  expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/auth/login', expect.objectContaining({ method: 'POST' }))
})

test('shows and hides the password from the login form', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp('/login')

  const password = screen.getByLabelText('Password')
  expect(password).toHaveAttribute('type', 'password')
  expect(password).toHaveAttribute('minlength', '8')

  fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
  expect(password).toHaveAttribute('type', 'text')

  fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
  expect(password).toHaveAttribute('type', 'password')
})

test('shows the personal plan workspace for an authenticated user', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
    access_token: 'access-token',
    token_type: 'bearer',
    user: { id: '1', email: 'learner@example.com', display_name: 'SYP Learner', roles: ['participant'] },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  fetchMock.mockResolvedValueOnce(new Response('[]', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))

  renderApp('/plans')

  expect(await screen.findByRole('heading', { name: 'Your goals' })).toBeInTheDocument()
  expect(await screen.findByText('No plans yet. Create your first draft.')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/plans', expect.objectContaining({
    headers: { Authorization: 'Bearer access-token' },
  }))
})

test('shows activity unit and schedule controls inside a plan', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation(async (input) => {
    const url = String(input)
    const json = (body: unknown) => new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
    if (url === '/api/v1/auth/refresh') return json({
      access_token: 'access-token', token_type: 'bearer',
      user: { id: '1', email: 'learner@example.com', display_name: 'SYP Learner', timezone: 'UTC', roles: ['participant'] },
    })
    if (url === '/api/v1/plans/plan-1') return json({
      id: 'plan-1', title: 'IELTS', description: null, status: 'active',
      start_date: null, end_date: null, created_at: '2026-08-22T00:00:00Z', updated_at: '2026-08-22T00:00:00Z',
    })
    if (url === '/api/v1/plans/plan-1/activities') return json([{
      id: 'activity-1', enrollment_id: 'plan-1', name: 'Listening', description: null,
      measurement_dimension: 'duration', unit_code: 'minute', custom_unit_label: null,
      display_order: 0, status: 'active',
      current_target: { target_quantity: '30.0000', effective_from: '2026-08-22', effective_until: null, reason: null },
      current_schedule: { schedule_type: 'daily', weekdays: null, effective_from: '2026-08-22', effective_until: null },
    }])
    if (url === '/api/v1/plans/plan-1/progress-entries') return json([])
    if (url.startsWith('/api/v1/plans/plan-1/progress-report?')) return json({
      start_date: '2026-08-17', end_date: '2026-08-23', overall_adherence_percent: '60.00',
      activities: [{ activity_id: 'activity-1', name: 'Listening', unit: 'minute', expected: '150.0000', actual: '90.0000', attainment_percent: '60.00', adherence_percent: '60.00', completed_occurrences: 2, partial_occurrences: 1, missed_occurrences: 1, upcoming_occurrences: 1 }],
    })
    return new Response('{}', { status: 404 })
  })

  renderApp('/plans/plan-1')

  expect(await screen.findByRole('heading', { name: 'Activities' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Minutes' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Weekly quota' })).toBeInTheDocument()
  expect(await screen.findByText('Record effort')).toBeInTheDocument()
  expect((await screen.findAllByText('60%')).length).toBeGreaterThan(0)

  fireEvent.change(screen.getAllByLabelText('Frequency')[0], { target: { value: 'selected_days' } })
  expect(screen.getByText('Mon')).toBeInTheDocument()
  expect(screen.getByText('Sun')).toBeInTheDocument()
})

test('shows the plan template workspace to a coach', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation(async (input) => {
    const url = String(input)
    const json = (body: unknown) => new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
    if (url === '/api/v1/auth/refresh') return json({
      access_token: 'coach-token', token_type: 'bearer',
      user: { id: '2', email: 'coach@example.com', display_name: 'Coach', timezone: 'UTC', roles: ['coach'] },
    })
    if (url === '/api/v1/coaching/templates') return json([{
      id: 'template-1', title: 'Running foundation', description: 'A starter plan',
      activities: [{ id: 'activity-1', name: 'Easy run', target_quantity: '5.0000', unit_code: 'kilometer', schedule_type: 'weekly' }],
    }])
    if (url === '/api/v1/coaching/assignments/sent') return json([])
    return new Response('{}', { status: 404 })
  })

  renderApp('/coaching')

  expect(await screen.findByRole('heading', { name: 'Plan templates & assignments' })).toBeInTheDocument()
  expect(await screen.findByText('Easy run: 5 kilometer · weekly')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Send invitation' })).toBeEnabled()
})
