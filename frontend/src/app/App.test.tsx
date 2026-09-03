import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { AuthProvider } from '../features/auth/AuthContext'
import i18n from '../i18n'
import { App } from './App'

afterEach(async () => {
  vi.restoreAllMocks()
  localStorage.clear()
  await i18n.changeLanguage('en')
})

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  )
}

test('renders a crawlable public landing page with product metadata', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp('/')

  expect(screen.getByRole('heading', { name: /Turn your effort into visible progress/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /A partial result is still a real result/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Useful for participants/i })).toBeInTheDocument()
  await waitFor(() => expect(document.title).toBe('SYP — Smart Goal Tracking & AI Coaching'))
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
})

test('switches between Finnish, Korean, Hindi, Brazilian Portuguese, French, Spanish, Simplified Chinese, Japanese, German, Turkish, and right-to-left languages', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp('/')

  const language = screen.getByLabelText('Language')
  fireEvent.change(language, { target: { value: 'fi' } })
  expect(await screen.findByRole('link', { name: 'Kirjaudu sisään' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'fi')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('Kieli'), { target: { value: 'ko' } })
  expect(await screen.findByRole('link', { name: '로그인' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'ko')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('언어'), { target: { value: 'hi' } })
  expect(await screen.findByRole('link', { name: 'साइन इन' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'hi')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('भाषा'), { target: { value: 'pt-BR' } })
  expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'pt-BR')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'fr' } })
  expect(await screen.findByRole('link', { name: 'Se connecter' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'fr')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('Langue'), { target: { value: 'es' } })
  expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'es')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'zh-CN' } })
  expect(await screen.findByRole('link', { name: '登录' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'zh-CN')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('语言'), { target: { value: 'ja' } })
  expect(await screen.findByRole('link', { name: 'ログイン' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'ja')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('言語'), { target: { value: 'de' } })
  expect(await screen.findByRole('link', { name: 'Anmelden' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'de')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('Sprache'), { target: { value: 'tr' } })
  expect(await screen.findByRole('link', { name: 'Giriş yap' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'tr')
  expect(document.documentElement).toHaveAttribute('dir', 'ltr')

  fireEvent.change(screen.getByLabelText('Dil'), { target: { value: 'fa' } })
  expect(await screen.findByRole('link', { name: 'ورود' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'fa')
  expect(document.documentElement).toHaveAttribute('dir', 'rtl')

  fireEvent.change(screen.getByLabelText('زبان'), { target: { value: 'ar' } })
  expect(await screen.findByRole('link', { name: 'تسجيل الدخول' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('lang', 'ar')
  expect(document.documentElement).toHaveAttribute('dir', 'rtl')
})

test('localizes login and registration forms', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  await i18n.changeLanguage('fa')
  const loginView = renderApp('/login')

  expect(await screen.findByRole('heading', { name: 'خوش آمدید' })).toBeInTheDocument()
  expect(screen.getByLabelText('ایمیل')).toBeInTheDocument()
  expect(screen.getByLabelText('رمز عبور')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'ورود' })).toBeInTheDocument()
  loginView.unmount()

  await i18n.changeLanguage('ar')
  renderApp('/register')
  expect(await screen.findByRole('heading', { name: 'أنشئ حسابك' })).toBeInTheDocument()
  expect(screen.getByLabelText('الاسم الظاهر')).toBeInTheDocument()
  expect(screen.getByLabelText('نوع الحساب')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'إنشاء الحساب' })).toBeInTheDocument()
})

test('renders the public how-it-works workflow with crawlable metadata', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp('/how-it-works')

  expect(screen.getByRole('heading', { name: /practical system for turning intention into progress/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'The Progress Engine owns the numbers.' })).toBeInTheDocument()
  expect(screen.getByText('Planned 30 minutes, completed 18.', { exact: false })).toBeInTheDocument()
  await waitFor(() => expect(document.title).toBe('How SYP works | See Your Progress'))
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
})

test('renders the public feature catalog with crawlable metadata', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp('/features')

  expect(screen.getByRole('heading', { name: /Everything you need to turn goals/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Deterministic reports' })).toBeInTheDocument()
  expect(screen.getByText('125%')).toBeInTheDocument()
  expect(screen.getByText('100%')).toBeInTheDocument()
  await waitFor(() => expect(document.title).toBe('Features | SYP Goal Tracking & Coaching'))
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
})

test('renders the public coaches page with clear ownership and crawlable metadata', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp('/for-coaches')

  expect(screen.getByRole('heading', { name: /Coach with evidence/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Clear ownership makes coaching safer/i })).toBeInTheDocument()
  expect(screen.getByText(/independent draft plan snapshot/i)).toBeInTheDocument()
  await waitFor(() => expect(document.title).toBe('Goal Coaching Platform for Coaches | SYP'))
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
})

test('redirects an anonymous visitor from the dashboard to login', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp('/dashboard')
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
})

test('updates the signed-in user profile and preferred language', async () => {
  const user = { id: '1', email: 'learner@example.com', display_name: 'Learner', bio: null, timezone: 'UTC', preferred_language: 'en' as const, gender: null, gender_theme_enabled: false, roles: ['participant'] }
  const updated = { ...user, display_name: 'زبان‌آموز', bio: 'IELTS learner', timezone: 'Europe/Bucharest', preferred_language: 'fa' as const, gender: 'woman' as const, gender_theme_enabled: true }
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/auth/refresh')) return new Response(JSON.stringify({ access_token: 'token', token_type: 'bearer', user }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (url.endsWith('/notifications/unread-count')) return new Response(JSON.stringify({ unread: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (url.endsWith('/users/me') && init?.method === 'PATCH') return new Response(JSON.stringify(updated), { status: 200, headers: { 'Content-Type': 'application/json' } })
    return new Response('{}', { status: 404 })
  })

  const view = renderApp('/settings/profile')
  expect(await screen.findByRole('heading', { name: 'Profile and settings' })).toBeInTheDocument()
  expect(view.container.querySelectorAll('.app-header')).toHaveLength(1)
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'زبان‌آموز' } })
  fireEvent.change(screen.getByLabelText(/^Short bio/), { target: { value: 'IELTS learner' } })
  fireEvent.change(screen.getByLabelText('Preferred language'), { target: { value: 'fa' } })
  fireEvent.change(screen.getByLabelText(/^Timezone/), { target: { value: 'Europe/Bucharest' } })
  fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'woman' } })
  fireEvent.click(screen.getByLabelText('Use colors based on my selected gender'))
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByRole('heading', { name: 'پروفایل و تنظیمات' })).toBeInTheDocument()
  expect(document.documentElement).toHaveAttribute('dir', 'rtl')
  expect(document.documentElement).toHaveAttribute('data-appearance', 'woman')
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/me', expect.objectContaining({ method: 'PATCH' }))
})

test('logs in and displays the protected dashboard', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  const plans = [{
    id: 'plan-1', title: 'Learn Python', description: null, status: 'active',
    start_date: null, end_date: null, created_at: '2026-08-20T00:00:00Z', updated_at: '2026-08-24T00:00:00Z',
  }]
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/auth/refresh')) return new Response('{}', { status: 401 })
    if (url.endsWith('/auth/login') && init?.method === 'POST') return new Response(JSON.stringify({
      access_token: 'access-token', token_type: 'bearer',
      user: { id: '1', email: 'learner@example.com', display_name: 'SYP Learner', roles: ['participant'] },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (url.endsWith('/notifications/unread-count')) return new Response(JSON.stringify({ unread: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (url.endsWith('/coaching/invitations')) return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (url.endsWith('/plans')) return new Response(JSON.stringify(plans), { status: 200, headers: { 'Content-Type': 'application/json' } })
    return new Response('{}', { status: 404 })
  })

  renderApp('/login')
  const submit = await screen.findByRole('button', { name: 'Sign in' })
  await waitFor(() => expect(submit).toBeEnabled())
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'learner@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-battery-staple' } })
  fireEvent.submit(submit.closest('form')!)

  expect(await screen.findByRole('heading', { name: 'Hello, SYP Learner' })).toBeInTheDocument()
  expect(await screen.findByText('Learn Python')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Plan summary' })).toHaveTextContent('Active plans1')
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({ method: 'POST' }))
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/plans', expect.objectContaining({ headers: { Authorization: 'Bearer access-token' } }))

  fireEvent.click(screen.getByRole('link', { name: 'Home' }))
  expect(await screen.findByRole('heading', { name: /Turn your effort into visible progress/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
  expect(await screen.findByRole('heading', { name: 'Hello, SYP Learner' })).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'fa' } })
  expect(await screen.findByRole('heading', { name: 'سلام، SYP Learner' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'خلاصه برنامه‌ها' })).toHaveTextContent('برنامه‌های فعال1')
  expect(screen.getByRole('heading', { name: 'برنامه‌های اخیر' })).toBeInTheDocument()
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
  fetchMock.mockImplementation(async (input) => {
    const url = String(input)
    if (url.endsWith('/auth/refresh')) return new Response(JSON.stringify({
      access_token: 'access-token', token_type: 'bearer',
      user: { id: '1', email: 'learner@example.com', display_name: 'SYP Learner', roles: ['participant'] },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (url.endsWith('/notifications/unread-count')) return new Response(JSON.stringify({ unread: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (url.endsWith('/plans')) return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
    return new Response('{}', { status: 404 })
  })

  renderApp('/plans')

  expect(await screen.findByRole('banner', { name: 'Application header' })).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Your goals' })).toBeInTheDocument()
  expect(await screen.findByText('No plans yet. Create your first draft.')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Search plans')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'All' })).toHaveClass('active')
  expect(screen.queryByLabelText('Close creation form')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Create a plan' }))
  expect(screen.getByLabelText('Close creation form')).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Close creation form'))
  expect(screen.queryByLabelText('Close creation form')).not.toBeInTheDocument()
  expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/plans', expect.objectContaining({
    headers: { Authorization: 'Bearer access-token' },
  }))
  await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow'))
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
    if (url === '/api/v1/ai-coach/ask') return json({
      run_id: 'run-1', answer: 'Listening is at 60%. Try a smaller daily session.',
    })
    return new Response('{}', { status: 404 })
  })

  renderApp('/plans/plan-1')

  expect(await screen.findByRole('heading', { name: 'Plan details' })).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Progress snapshot' })).toBeInTheDocument()
  expect(await screen.findByRole('img', { name: 'Weekly overall adherence 60 percent' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: 'Activities' }))
  expect(await screen.findByRole('heading', { name: 'Activities' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Minutes' })).toBeInTheDocument()
  expect(screen.getAllByRole('option', { name: 'Weekly quota' }).length).toBeGreaterThan(0)
  expect(await screen.findByText('Record effort')).toBeInTheDocument()

  fireEvent.change(screen.getAllByLabelText('Frequency')[0], { target: { value: 'selected_days' } })
  expect(screen.getByText('Mon')).toBeInTheDocument()
  expect(screen.getByText('Sun')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('tab', { name: 'Progress' }))
  expect((await screen.findAllByText('60%')).length).toBeGreaterThan(0)

  fireEvent.click(screen.getByRole('tab', { name: 'AI Coach' }))
  expect(screen.getByRole('heading', { name: 'Ask your progress coach' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Why am I behind?' } })
  fireEvent.click(screen.getByText(/I agree to send relevant progress data/))
  fireEvent.click(screen.getByRole('button', { name: 'Ask AI coach' }))
  expect(await screen.findByText('Listening is at 60%. Try a smaller daily session.')).toBeInTheDocument()
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
      default_start_date: '2026-09-07', default_end_date: '2026-10-07',
      activities: [{ id: 'activity-1', name: 'Easy run', target_quantity: '5.0000', unit_code: 'kilometer', schedule_type: 'weekly' }],
    }])
    if (url === '/api/v1/coaching/assignments/sent') return json([
      { id: 'assignment-1', template_title: 'Running foundation', participant_name: 'Pending Learner', participant_email: 'pending@example.com', status: 'pending', start_date: '2026-08-31', enrollment_id: null },
      { id: 'assignment-2', template_title: 'Running foundation', participant_name: 'Accepted Learner', participant_email: 'accepted@example.com', status: 'accepted', start_date: '2026-08-30', enrollment_id: 'enrollment-2' },
    ])
    return new Response('{}', { status: 404 })
  })

  renderApp('/coaching')

  expect(await screen.findByRole('heading', { name: 'Plan templates & assignments' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/how-it-works')
  expect(await screen.findByText('Easy run: 5 Kilometer · Weekly')).toBeInTheDocument()
  expect(screen.getAllByLabelText('Start date').some((input) => (input as HTMLInputElement).value === '2026-09-07')).toBe(true)
  expect(screen.getByRole('button', { name: 'Send invitation' })).toBeEnabled()
  expect(screen.getByText('Pending Learner · pending@example.com')).toBeInTheDocument()
  expect(screen.getByText('Accepted Learner · accepted@example.com')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Pending\s*1/ }))
  expect(screen.getByText('Pending Learner · pending@example.com')).toBeInTheDocument()
  expect(screen.queryByText('Accepted Learner · accepted@example.com')).not.toBeInTheDocument()
})

test('lets a coach search and filter participants on a dedicated page', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    const json = (body: unknown) => new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
    if (url === '/api/v1/auth/refresh') return json({
      access_token: 'coach-token', token_type: 'bearer',
      user: { id: '2', email: 'coach@example.com', display_name: 'Coach', timezone: 'UTC', roles: ['coach'] },
    })
    if (url === '/api/v1/coaching/assignments/sent') return json([
      { id: 'assignment-1', template_title: 'IELTS', participant_name: 'Ada Learner', participant_email: 'ada@example.com', status: 'accepted', start_date: '2026-08-31', enrollment_id: 'enrollment-1' },
      { id: 'assignment-2', template_title: 'Running', participant_name: 'Ben Learner', participant_email: 'ben@example.com', status: 'pending', start_date: '2026-08-31', enrollment_id: null },
    ])
    return new Response('{}', { status: 404 })
  })

  renderApp('/coach/participants')

  expect(await screen.findByRole('heading', { name: 'Participants' })).toBeInTheDocument()
  expect(await screen.findByText('Ada Learner')).toBeInTheDocument()
  expect(await screen.findByText('Ben Learner')).toBeInTheDocument()
  fireEvent.change(screen.getByPlaceholderText('Search participants'), { target: { value: 'Ada' } })
  expect(screen.getByText('Ada Learner')).toBeInTheDocument()
  expect(screen.queryByText('Ben Learner')).not.toBeInTheDocument()
})

test('shows and clears the participant pending invitation badge', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const json = (body: unknown) => new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
    if (url === '/api/v1/auth/refresh') return json({
      access_token: 'participant-token', token_type: 'bearer',
      user: { id: '1', email: 'learner@example.com', display_name: 'Learner', timezone: 'UTC', roles: ['participant'] },
    })
    if (url === '/api/v1/coaching/invitations/assignment-1/accept' && init?.method === 'POST') return json({
      id: 'assignment-1', template_title: 'IELTS', participant_name: 'Learner', participant_email: 'learner@example.com', status: 'accepted', start_date: '2026-09-02', enrollment_id: 'enrollment-1',
    })
    if (url === '/api/v1/coaching/invitations') return json([
      { id: 'assignment-1', template_title: 'IELTS', participant_name: 'Learner', participant_email: 'learner@example.com', status: 'pending', start_date: '2026-09-02', enrollment_id: null },
      { id: 'assignment-2', template_title: 'Running', participant_name: 'Learner', participant_email: 'learner@example.com', status: 'accepted', start_date: '2026-08-20', enrollment_id: 'enrollment-2' },
    ])
    return new Response('{}', { status: 404 })
  })

  renderApp('/coaching')

  expect(await screen.findByRole('link', { name: /Invitations\s*1/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
  await waitFor(() => expect(screen.queryByRole('link', { name: /Invitations\s*1/ })).not.toBeInTheDocument())
})

test('shows authorized participant progress and feedback to a coach', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    const json = (body: unknown) => new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
    if (url === '/api/v1/auth/refresh') return json({
      access_token: 'coach-token', token_type: 'bearer',
      user: { id: '2', email: 'coach@example.com', display_name: 'Coach', timezone: 'UTC', roles: ['coach'] },
    })
    if (url === '/api/v1/coaching/enrollments/enrollment-1') return json({
      id: 'enrollment-1', title: 'Running foundation', description: null, status: 'active',
      start_date: '2026-08-17', end_date: null, source_assignment_id: 'assignment-1',
      created_at: '2026-08-17T00:00:00Z', updated_at: '2026-08-17T00:00:00Z',
    })
    if (url.startsWith('/api/v1/plans/enrollment-1/progress-report?')) return json({
      start_date: '2026-08-17', end_date: '2026-08-23', overall_adherence_percent: '75.00',
      activities: [{ activity_id: 'activity-1', name: 'Running', unit: 'kilometer', expected: '20.0000', actual: '15.0000', attainment_percent: '75.00', adherence_percent: '75.00', completed_occurrences: 2, partial_occurrences: 1, missed_occurrences: 1, upcoming_occurrences: 0 }],
    })
    if (url === '/api/v1/coaching/enrollments/enrollment-1/feedback') return json([{
      id: 'feedback-1', enrollment_id: 'enrollment-1', coach_user_id: '2', coach_name: 'Coach',
      message: 'Good consistency this week.', created_at: '2026-08-22T10:00:00Z',
    }])
    return new Response('{}', { status: 404 })
  })

  renderApp('/coach/enrollments/enrollment-1')

  expect(await screen.findByRole('heading', { name: 'Progress & feedback' })).toBeInTheDocument()
  expect(await screen.findByLabelText('End date')).toBeEnabled()
  expect((await screen.findAllByText('75%')).length).toBeGreaterThan(0)
  expect(await screen.findByText('Good consistency this week.')).toBeInTheDocument()
  expect(screen.getByLabelText('Feedback for participant')).toBeInTheDocument()
})
