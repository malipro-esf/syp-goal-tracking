import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, CircleUserRound, ClipboardList, LayoutDashboard, ListChecks, LogIn, LogOut, Rocket, Settings, Sparkles } from 'lucide-react'

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
      <span aria-hidden="true">S</span><strong>SYP</strong><small>See Your Progress</small>
    </Link>
    <nav aria-label="Primary navigation">
      {user && !publicOnly ? <>
        <NavLink to="/dashboard"><LayoutDashboard aria-hidden="true" />{t('navigation.dashboard')}</NavLink>
        <NavLink to="/plans"><ClipboardList aria-hidden="true" />{t('navigation.plans')}</NavLink>
        <NavLink to="/coaching"><Bot aria-hidden="true" />{t('navigation.coaching')}</NavLink>
      </> : <>
        <NavLink to="/features"><Sparkles aria-hidden="true" />{t('navigation.features')}</NavLink>
        <NavLink to="/how-it-works"><ListChecks aria-hidden="true" />{t('navigation.howItWorks')}</NavLink>
        <NavLink to="/for-coaches"><CircleUserRound aria-hidden="true" />{t('navigation.forCoaches')}</NavLink>
        <Link to="/login"><LogIn aria-hidden="true" />{t('navigation.signIn')}</Link>
        <Link className="header-cta" to="/register"><Rocket aria-hidden="true" />{t('navigation.getStarted')}</Link>
      </>}
    </nav>
    <div className="header-tools"><LanguageSwitcher />{user && !publicOnly && <div className="header-account"><Link to="/settings/profile"><Settings aria-hidden="true" />{user.display_name}</Link><button type="button" className="text-button icon-button" onClick={signOut}><LogOut aria-hidden="true" />{t('navigation.signOut')}</button></div>}</div>
  </header>
}
