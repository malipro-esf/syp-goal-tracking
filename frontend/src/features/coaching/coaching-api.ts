import { apiRequest } from '../../api/client'
import type { ActivityInput } from '../activities/activities-api'

export type TemplateActivity = ActivityInput & { id: string }
export type PlanTemplate = {
  id: string
  title: string
  description: string | null
  activities: TemplateActivity[]
}
export type Assignment = {
  id: string
  template_title: string
  participant_name: string
  participant_email: string
  status: string
  start_date: string
  enrollment_id: string | null
}

const auth = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` },
})

export const listTemplates = (token: string) =>
  apiRequest<PlanTemplate[]>('/api/v1/coaching/templates', auth(token))
export const createTemplate = (token: string, input: { title: string; description: string | null }) =>
  apiRequest<PlanTemplate>('/api/v1/coaching/templates', auth(token, { method: 'POST', body: JSON.stringify(input) }))
export const addTemplateActivity = (token: string, id: string, input: ActivityInput) =>
  apiRequest<PlanTemplate>(`/api/v1/coaching/templates/${id}/activities`, auth(token, { method: 'POST', body: JSON.stringify(input) }))
export const assignTemplate = (token: string, id: string, input: { participant_email: string; start_date: string }) =>
  apiRequest<Assignment>(`/api/v1/coaching/templates/${id}/assignments`, auth(token, { method: 'POST', body: JSON.stringify(input) }))
export const listSent = (token: string) =>
  apiRequest<Assignment[]>('/api/v1/coaching/assignments/sent', auth(token))
export const listInvitations = (token: string) =>
  apiRequest<Assignment[]>('/api/v1/coaching/invitations', auth(token))
export const respondInvitation = (token: string, id: string, action: 'accept' | 'reject') =>
  apiRequest<Assignment>(`/api/v1/coaching/invitations/${id}/${action}`, auth(token, { method: 'POST' }))
