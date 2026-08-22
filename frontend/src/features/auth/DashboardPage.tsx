import { Link } from 'react-router-dom'
import { useAuth } from './useAuth'

export function DashboardPage() {
  const { user } = useAuth()

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
          <Link className="primary-link" to="/coaching">{user?.roles.includes('coach') ? 'Coach workspace' : 'Plan invitations'}</Link>
        </div>
      </section>
    </main>
  )
}
