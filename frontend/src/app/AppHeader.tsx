import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../features/auth/useAuth'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AppHeader({ publicOnly = false }: { publicOnly?: boolean }) {
  const { logout, user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return <header className="app-header" aria-label="Application header">
    <Link className="header-brand" to={user ? '/dashboard' : '/'} aria-label="SYP home">
      <span aria-hidden="true">S</span><strong>SYP</strong><small>{t('brand.tagline')}</small>
    </Link>
    <nav aria-label="Primary navigation">
      {user && !publicOnly ? <>
        <NavLink to="/dashboard">{t('navigation.dashboard')}</NavLink>
        <NavLink to="/plans">{t('navigation.plans')}</NavLink>
        <NavLink to="/coaching">{t('navigation.coaching')}</NavLink>
      </> : <>
        <NavLink to="/features">{t('navigation.features')}</NavLink>
        <NavLink to="/how-it-works">{t('navigation.howItWorks')}</NavLink>
        <NavLink to="/for-coaches">{t('navigation.forCoaches')}</NavLink>
        <Link to="/login">{t('navigation.signIn')}</Link>
        <Link className="header-cta" to="/register">{t('navigation.getStarted')}</Link>
      </>}
    </nav>
    <div className="header-tools"><LanguageSwitcher />{user && !publicOnly && <div className="header-account"><Link to="/settings/profile">{user.display_name}</Link><button type="button" className="text-button" onClick={signOut}>{t('navigation.signOut')}</button></div>}</div>
  </header>
}
