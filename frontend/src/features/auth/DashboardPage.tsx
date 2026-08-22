import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function DashboardPage() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  async function signOut() { await logout(); navigate('/login', { replace: true }) }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <p className="eyebrow">Authenticated workspace</p>
        <h1>Hello, {user?.display_name}</h1>
        <p className="description">Your secure session is working. Plans and progress arrive in later milestones.</p>
        <dl className="profile-list">
          <div><dt>Email</dt><dd>{user?.email}</dd></div>
          <div><dt>Role</dt><dd>{user?.roles.join(', ')}</dd></div>
          <div><dt>Timezone</dt><dd>{user?.timezone}</dd></div>
        </dl>
        <div className="button-row">
          <Link className="primary-link" to="/plans">Manage plans</Link>
          <button type="button" className="secondary-button" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </main>
  )
}
