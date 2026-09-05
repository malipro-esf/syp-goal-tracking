import { apiRequest } from '../../api/client'

export type NotificationItem = { id: string; kind: string; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }
export type NotificationPage = { items: NotificationItem[]; total: number; unread: number; page: number; page_size: number }
export type NotificationPreferences = { invitation_updates_enabled: boolean; automated_reminders_enabled: boolean }
export type NotificationCategory = '' | 'invitations' | 'reminders'

const headers = (token: string) => ({ Authorization: `Bearer ${token}` })

export const unreadNotificationCount = (token: string) => apiRequest<{ unread: number }>('/api/v1/notifications/unread-count', { headers: headers(token) })
export const listNotifications = (token: string, options: { unreadOnly?: boolean; category?: NotificationCategory; page?: number; pageSize?: number } = {}) => {
  const params = new URLSearchParams({ unread_only: String(options.unreadOnly ?? false), page: String(options.page ?? 1), page_size: String(options.pageSize ?? 25) })
  if (options.category) params.set('category', options.category)
  return apiRequest<NotificationPage>(`/api/v1/notifications?${params}`, { headers: headers(token) })
}
export const markNotificationRead = (token: string, id: string) => apiRequest<void>(`/api/v1/notifications/${id}/read`, { method: 'POST', headers: headers(token) })
export const markAllNotificationsRead = (token: string) => apiRequest<void>('/api/v1/notifications/read-all', { method: 'POST', headers: headers(token) })
export const deleteNotification = (token: string, id: string) => apiRequest<void>(`/api/v1/notifications/${id}`, { method: 'DELETE', headers: headers(token) })
export const deleteAllNotifications = (token: string) => apiRequest<void>('/api/v1/notifications', { method: 'DELETE', headers: headers(token) })
export const getNotificationPreferences = (token: string) => apiRequest<NotificationPreferences>('/api/v1/notifications/preferences', { headers: headers(token) })
export const saveNotificationPreferences = (token: string, preferences: NotificationPreferences) => apiRequest<NotificationPreferences>('/api/v1/notifications/preferences', { method: 'PUT', headers: headers(token), body: JSON.stringify(preferences) })
