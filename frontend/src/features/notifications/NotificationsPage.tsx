import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  saveNotificationPreferences,
  type NotificationPage,
  type NotificationPreferences,
} from './notifications-api'

export function NotificationsPage() {
  const { accessToken } = useAuth()
  const [page, setPage] = useState<NotificationPage | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [error, setError] = useState('')
  const [preferenceMessage, setPreferenceMessage] = useState('')
  const load = useCallback(() => {
    if (!accessToken) return
    listNotifications(accessToken, unreadOnly).then(setPage).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Notifications could not be loaded.'))
  }, [accessToken, unreadOnly])
  useEffect(load, [load])
  useEffect(() => {
    if (!accessToken) return
    getNotificationPreferences(accessToken).then(setPreferences).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Notification preferences could not be loaded.'))
  }, [accessToken])
  useEffect(() => {
    if (!preferenceMessage) return
    const timeoutId = window.setTimeout(() => setPreferenceMessage(''), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [preferenceMessage])

  async function read(id: string) { if (!accessToken) return; await markNotificationRead(accessToken, id); load() }
  async function readAll() { if (!accessToken) return; await markAllNotificationsRead(accessToken); load() }
  async function savePreferences() {
    if (!accessToken || !preferences) return
    try {
      setPreferences(await saveNotificationPreferences(accessToken, preferences))
      setPreferenceMessage('Notification preferences saved.')
      setError('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Notification preferences could not be saved.')
    }
  }

  return <main className="page-shell notifications-page">
    <div className="section-heading"><div><p className="eyebrow">Updates</p><h1>Notifications</h1><p>Plan invitations, coaching responses, and reminders appear here.</p></div>{(page?.unread ?? 0) > 0 && <button type="button" className="secondary-button icon-button" onClick={readAll}><CheckCheck aria-hidden="true" />Mark all read</button>}</div>
    {preferences && <section className="card notification-preferences"><div><h2>In-app notification preferences</h2><p>Choose which updates should appear in your notification feed.</p></div><label className="checkbox-label"><input type="checkbox" checked={preferences.invitation_updates_enabled} onChange={(event) => setPreferences({ ...preferences, invitation_updates_enabled: event.target.checked })} />Invitation and coaching response updates</label><label className="checkbox-label"><input type="checkbox" checked={preferences.automated_reminders_enabled} onChange={(event) => setPreferences({ ...preferences, automated_reminders_enabled: event.target.checked })} />Plan-ending and pending-invitation reminders</label><button type="button" onClick={savePreferences}>Save preferences</button>{preferenceMessage && <p className="form-success" role="status">{preferenceMessage}</p>}<small>Email delivery will be configured separately when a provider is available.</small></section>}
    <label className="checkbox-label notification-filter"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />Unread only</label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="notification-list">{page?.items.map((item) => <article className={`card notification-item ${item.read_at ? '' : 'unread'}`} key={item.id}><span className="notification-icon"><Bell aria-hidden="true" /></span><div><h2>{item.title}</h2><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small></div><div>{item.action_url && <Link to={item.action_url} onClick={() => read(item.id)}>Open</Link>}{!item.read_at && <button type="button" className="text-button" onClick={() => read(item.id)}>Mark read</button>}</div></article>)}{page && page.items.length === 0 && <div className="card empty-state"><Bell aria-hidden="true" /><h2>You’re all caught up</h2><p>New updates will appear here.</p></div>}</section>
  </main>
}
