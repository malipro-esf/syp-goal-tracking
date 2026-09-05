import { useEffect, useState, type ReactNode } from 'react'
import { Activity, BarChart3, ClipboardList, LayoutDashboard, LifeBuoy, Mail, Settings, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { unreadAdminSupportRequestCount } from '../support/support-api'

type AdminSection = 'overview' | 'users' | 'plans' | 'assignments' | 'reports' | 'support' | 'audit' | 'settings'

export function AdminLayout({
  active,
  title,
  description,
  children,
}: {
  active: AdminSection
  title: string
  description: string
  children: ReactNode
}) {
  const { accessToken, user } = useAuth()
  const [unreadSupport, setUnreadSupport] = useState(0)
  useEffect(() => {
    if (!accessToken) return
    let active = true
    const refresh = () => unreadAdminSupportRequestCount(accessToken).then((result) => { if (active) setUnreadSupport(result.unread) }).catch(() => undefined)
    refresh()
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    window.addEventListener('support-requests-viewed', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('support-requests-viewed', refresh) }
  }, [accessToken])

  return <main className="admin-shell admin-workspace">
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/admin"><span>A</span><strong>SYP Admin</strong></Link>
      <div className="sidebar-plan"><small>Administration workspace</small><strong>{user?.display_name}</strong><span>Administrator</span></div>
      <nav className="admin-nav" aria-label="Administration navigation">
        <Link className={active === 'overview' ? 'active' : ''} to="/admin"><LayoutDashboard aria-hidden="true" />Overview</Link>
        <Link className={active === 'users' ? 'active' : ''} to="/admin/users"><Users aria-hidden="true" />Users</Link>
        <Link className={active === 'plans' ? 'active' : ''} to="/admin/plans"><ClipboardList aria-hidden="true" />Plans</Link>
        <Link className={active === 'assignments' ? 'active' : ''} to="/admin/assignments"><Mail aria-hidden="true" />Invitations</Link>
        <Link className={active === 'reports' ? 'active' : ''} to="/admin/reports"><BarChart3 aria-hidden="true" />Reports</Link>
        <Link className={active === 'support' ? 'active' : ''} to="/admin/support"><LifeBuoy aria-hidden="true" />Support requests{unreadSupport > 0 && <span className="nav-count-badge" aria-label={`${unreadSupport} unread support requests`}>{unreadSupport > 99 ? '99+' : unreadSupport}</span>}</Link>
        <Link className={active === 'audit' ? 'active' : ''} to="/admin/audit"><Activity aria-hidden="true" />Audit log</Link>
        <Link className={active === 'settings' ? 'active' : ''} to="/admin/settings"><Settings aria-hidden="true" />System settings</Link>
      </nav>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar admin-workspace-header">
        <div><p className="eyebrow">Administration</p><h1>{title}</h1><p>{description}</p></div>
        <span className="admin-access-label"><ShieldCheck aria-hidden="true" />Administrator access</span>
      </header>
      <div className="admin-content admin-page">{children}</div>
    </section>
  </main>
}
