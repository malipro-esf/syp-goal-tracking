import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../features/auth/useAuth'

export function AppHeader({ publicOnly = false }: { publicOnly?: boolean }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return <header className="app-header" aria-label="Application header">
    <Link className="header-brand" to={user ? '/dashboard' : '/'} aria-label="SYP home">
      <span aria-hidden="true">S</span><strong>SYP</strong><small>Progress over perfection</small>
    </Link>
    <nav aria-label="Primary navigation">
      {user && !publicOnly ? <>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/plans">Plans</NavLink>
        <NavLink to="/coaching">Coaching</NavLink>
      </> : <>
        <a href="/#how-it-works">How it works</a>
        <Link to="/login">Sign in</Link>
        <Link className="header-cta" to="/register">Get started</Link>
      </>}
    </nav>
    {user && !publicOnly && <div className="header-account"><span>{user.display_name}</span><button type="button" className="text-button" onClick={signOut}>Sign out</button></div>}
  </header>
}
