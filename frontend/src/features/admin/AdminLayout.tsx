import type { ReactNode } from 'react'
import { Activity, ClipboardList, LayoutDashboard, Mail, Settings, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'

type AdminSection = 'overview' | 'users' | 'plans' | 'assignments' | 'audit'

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
  const { user } = useAuth()

  return <main className="admin-shell admin-workspace">
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/admin"><span>A</span><strong>SYP Admin</strong></Link>
      <div className="sidebar-plan"><small>Administration workspace</small><strong>{user?.display_name}</strong><span>Administrator</span></div>
      <nav className="admin-nav" aria-label="Administration navigation">
        <Link className={active === 'overview' ? 'active' : ''} to="/admin"><LayoutDashboard aria-hidden="true" />Overview</Link>
        <Link className={active === 'users' ? 'active' : ''} to="/admin#users"><Users aria-hidden="true" />Users</Link>
        <Link className={active === 'plans' ? 'active' : ''} to="/admin/plans"><ClipboardList aria-hidden="true" />Plans</Link>
        <Link className={active === 'assignments' ? 'active' : ''} to="/admin/assignments"><Mail aria-hidden="true" />Invitations</Link>
        <Link className={active === 'audit' ? 'active' : ''} to="/admin#audit"><Activity aria-hidden="true" />Audit log</Link>
        <Link to="/settings/profile"><Settings aria-hidden="true" />Profile settings</Link>
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
