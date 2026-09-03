import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ApiError } from '../../api/client'
import { AppHeader } from '../../app/AppHeader'
import { useAuth } from '../auth/useAuth'
import { listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationPage } from './notifications-api'

export function NotificationsPage() {
  const { accessToken } = useAuth()
  const [page, setPage] = useState<NotificationPage | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    if (!accessToken) return
    listNotifications(accessToken, unreadOnly).then(setPage).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Notifications could not be loaded.'))
  }, [accessToken, unreadOnly])
  useEffect(load, [load])
  async function read(id: string) { if (!accessToken) return; await markNotificationRead(accessToken, id); load() }
  async function readAll() { if (!accessToken) return; await markAllNotificationsRead(accessToken); load() }
  return <><AppHeader /><main className="page-shell notifications-page"><div className="section-heading"><div><p className="eyebrow">Updates</p><h1>Notifications</h1><p>Plan invitations and coaching responses appear here.</p></div>{(page?.unread ?? 0) > 0 && <button type="button" className="secondary-button icon-button" onClick={readAll}><CheckCheck aria-hidden="true" />Mark all read</button>}</div><label className="checkbox-label notification-filter"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />Unread only</label>{error && <p className="form-error" role="alert">{error}</p>}<section className="notification-list">{page?.items.map((item) => <article className={`card notification-item ${item.read_at ? '' : 'unread'}`} key={item.id}><span className="notification-icon"><Bell aria-hidden="true" /></span><div><h2>{item.title}</h2><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small></div><div>{item.action_url && <Link to={item.action_url} onClick={() => read(item.id)}>Open</Link>}{!item.read_at && <button type="button" className="text-button" onClick={() => read(item.id)}>Mark read</button>}</div></article>)}{page && page.items.length === 0 && <div className="card empty-state"><Bell aria-hidden="true" /><h2>You’re all caught up</h2><p>New updates will appear here.</p></div>}</section></main></>
}
