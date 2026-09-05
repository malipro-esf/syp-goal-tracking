import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import {
  deleteAllNotifications,
  deleteNotification,
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  saveNotificationPreferences,
  type NotificationCategory,
  type NotificationPage,
  type NotificationPreferences,
} from './notifications-api'

const PAGE_SIZE = 10
const notifyBadgeChanged = () => window.dispatchEvent(new Event('notifications-changed'))

export function NotificationsPage() {
  const { accessToken } = useAuth()
  const [notificationPage, setNotificationPage] = useState<NotificationPage | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [category, setCategory] = useState<NotificationCategory>('')
  const [pageNumber, setPageNumber] = useState(1)
  const [error, setError] = useState('')
  const [preferenceMessage, setPreferenceMessage] = useState('')

  const load = useCallback(() => {
    if (!accessToken) return
    listNotifications(accessToken, { unreadOnly, category, page: pageNumber, pageSize: PAGE_SIZE })
      .then(setNotificationPage)
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Notifications could not be loaded.'))
  }, [accessToken, category, pageNumber, unreadOnly])

  useEffect(load, [load])
  useEffect(() => {
    if (!accessToken) return
    getNotificationPreferences(accessToken)
      .then(setPreferences)
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Notification preferences could not be loaded.'))
  }, [accessToken])
  useEffect(() => {
    if (!preferenceMessage) return
    const timeoutId = window.setTimeout(() => setPreferenceMessage(''), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [preferenceMessage])

  function refreshAfterMutation() {
    notifyBadgeChanged()
    load()
  }

  async function read(id: string) { if (!accessToken) return; await markNotificationRead(accessToken, id); refreshAfterMutation() }
  async function readAll() { if (!accessToken) return; await markAllNotificationsRead(accessToken); refreshAfterMutation() }
  async function remove(id: string) {
    if (!accessToken) return
    await deleteNotification(accessToken, id)
    notifyBadgeChanged()
    if (notificationPage?.items.length === 1 && pageNumber > 1) setPageNumber((current) => current - 1)
    else load()
  }
  async function clearAll() {
    if (!accessToken || !window.confirm('Delete all notifications? This cannot be undone.')) return
    await deleteAllNotifications(accessToken)
    setPageNumber(1)
    setNotificationPage({ items: [], total: 0, unread: 0, page: 1, page_size: PAGE_SIZE })
    notifyBadgeChanged()
  }
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

  const totalPages = Math.max(1, Math.ceil((notificationPage?.total ?? 0) / PAGE_SIZE))

  return <main className="page-shell notifications-page">
    <div className="section-heading">
      <div><p className="eyebrow">Updates</p><h1>Notifications</h1><p>Plan invitations, coaching responses, and reminders appear here.</p></div>
      <div className="notification-heading-actions">
        {(notificationPage?.unread ?? 0) > 0 && <button type="button" className="secondary-button icon-button" onClick={readAll}><CheckCheck aria-hidden="true" />Mark all read</button>}
        {(notificationPage?.total ?? 0) > 0 && <button type="button" className="danger-button icon-button" onClick={clearAll}><Trash2 aria-hidden="true" />Clear all</button>}
      </div>
    </div>
    {preferences && <section className="card notification-preferences">
      <div><h2>In-app notification preferences</h2><p>Choose which updates should appear in your notification feed.</p></div>
      <label className="checkbox-label"><input type="checkbox" checked={preferences.invitation_updates_enabled} onChange={(event) => setPreferences({ ...preferences, invitation_updates_enabled: event.target.checked })} />Invitation and coaching response updates</label>
      <label className="checkbox-label"><input type="checkbox" checked={preferences.automated_reminders_enabled} onChange={(event) => setPreferences({ ...preferences, automated_reminders_enabled: event.target.checked })} />Plan-ending and pending-invitation reminders</label>
      <button type="button" onClick={savePreferences}>Save preferences</button>
      {preferenceMessage && <p className="form-success" role="status">{preferenceMessage}</p>}
      <small>Email delivery will be configured separately when a provider is available.</small>
    </section>}
    <div className="notification-filters">
      <label>Category<select value={category} onChange={(event) => { setCategory(event.target.value as NotificationCategory); setPageNumber(1) }}><option value="">All</option><option value="invitations">Invitations and responses</option><option value="reminders">Reminders</option></select></label>
      <label className="checkbox-label"><input type="checkbox" checked={unreadOnly} onChange={(event) => { setUnreadOnly(event.target.checked); setPageNumber(1) }} />Unread only</label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="notification-list">
      {notificationPage?.items.map((item) => <article className={`card notification-item ${item.read_at ? '' : 'unread'}`} key={item.id}>
        <span className="notification-icon"><Bell aria-hidden="true" /></span>
        <div><h2>{item.title}</h2><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small></div>
        <div>{item.action_url && <Link to={item.action_url} onClick={() => read(item.id)}>Open</Link>}{!item.read_at && <button type="button" className="text-button" onClick={() => read(item.id)}>Mark read</button>}<button type="button" className="text-button notification-delete" aria-label={`Delete ${item.title}`} onClick={() => remove(item.id)}><Trash2 aria-hidden="true" /></button></div>
      </article>)}
      {notificationPage && notificationPage.items.length === 0 && <div className="card empty-state"><Bell aria-hidden="true" /><h2>You’re all caught up</h2><p>New updates will appear here.</p></div>}
    </section>
    {notificationPage && notificationPage.total > PAGE_SIZE && <nav className="notification-pagination" aria-label="Notification pages"><button type="button" className="secondary-button icon-button" disabled={pageNumber === 1} onClick={() => setPageNumber((current) => current - 1)}><ChevronLeft aria-hidden="true" />Previous</button><span>Page {pageNumber} of {totalPages}</span><button type="button" className="secondary-button icon-button" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((current) => current + 1)}>Next<ChevronRight aria-hidden="true" /></button></nav>}
  </main>
}
