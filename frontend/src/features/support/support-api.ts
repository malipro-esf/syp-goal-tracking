import { apiRequest } from '../../api/client'

export type SupportCategory = 'account' | 'plans' | 'coaching' | 'technical' | 'feedback' | 'other'
export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type SupportRequest = { id: string; name: string; email: string; category: SupportCategory; subject: string; message: string; status: SupportStatus; admin_note: string | null; viewed_at: string | null; created_at: string; updated_at: string }
export type SupportRequestPage = { items: SupportRequest[]; total: number; page: number; page_size: number }

export const submitSupportRequest = (input: { name: string; email: string; category: SupportCategory; subject: string; message: string }) =>
  apiRequest<SupportRequest>('/api/v1/support/requests', { method: 'POST', body: JSON.stringify(input) })

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })
export const listAdminSupportRequests = (token: string, query: URLSearchParams) => apiRequest<SupportRequestPage>(`/api/v1/admin/support-requests?${query}`, { headers: authHeaders(token) })
export const updateAdminSupportRequest = (token: string, id: string, input: { status: SupportStatus; admin_note: string | null }) => apiRequest<SupportRequest>(`/api/v1/admin/support-requests/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(input) })
export const unreadAdminSupportRequestCount = (token: string) => apiRequest<{ unread: number }>('/api/v1/admin/support-requests/unread-count', { headers: authHeaders(token) })
export const markAdminSupportRequestsViewed = (token: string) => apiRequest<void>('/api/v1/admin/support-requests/viewed', { method: 'POST', headers: authHeaders(token) })
