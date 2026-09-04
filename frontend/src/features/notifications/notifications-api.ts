import { apiRequest } from '../../api/client'

export type NotificationItem = { id: string; kind: string; title: string; message: string; action_url: string | null; read_at: string | null; created_at: string }
export type NotificationPage = { items: NotificationItem[]; total: number; unread: number; page: number; page_size: number }
export type NotificationPreferences = { invitation_updates_enabled: boolean; automated_reminders_enabled: boolean }

const headers = (token: string) => ({ Authorization: `Bearer ${token}` })

export const unreadNotificationCount = (token: string) => apiRequest<{ unread: number }>('/api/v1/notifications/unread-count', { headers: headers(token) })
export const listNotifications = (token: string, unreadOnly = false) => apiRequest<NotificationPage>(`/api/v1/notifications?unread_only=${unreadOnly}`, { headers: headers(token) })
export const markNotificationRead = (token: string, id: string) => apiRequest<void>(`/api/v1/notifications/${id}/read`, { method: 'POST', headers: headers(token) })
export const markAllNotificationsRead = (token: string) => apiRequest<void>('/api/v1/notifications/read-all', { method: 'POST', headers: headers(token) })
export const getNotificationPreferences = (token: string) => apiRequest<NotificationPreferences>('/api/v1/notifications/preferences', { headers: headers(token) })
export const saveNotificationPreferences = (token: string, preferences: NotificationPreferences) => apiRequest<NotificationPreferences>('/api/v1/notifications/preferences', { method: 'PUT', headers: headers(token), body: JSON.stringify(preferences) })
