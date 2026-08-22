import { apiRequest } from '../../api/client'

export type ProgressEntry = {
  id: string
  activity_id: string
  quantity: string
  performed_on: string
  note: string | null
  source: string
  recorded_at: string
  updated_at: string
}
export type ProgressInput = { quantity: string; performed_on: string; note?: string | null }

const auth = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...init.headers, Authorization: `Bearer ${token}` },
})
const entryBase = (planId: string, activityId: string) =>
  `/api/v1/plans/${planId}/activities/${activityId}/progress-entries`

export const listProgressEntries = (token: string, planId: string) =>
  apiRequest<ProgressEntry[]>(`/api/v1/plans/${planId}/progress-entries`, auth(token))
export const createProgressEntry = (token: string, planId: string, activityId: string, input: ProgressInput) =>
  apiRequest<ProgressEntry>(entryBase(planId, activityId), auth(token, { method: 'POST', body: JSON.stringify(input) }))
export const updateProgressEntry = (token: string, planId: string, activityId: string, entryId: string, input: ProgressInput) =>
  apiRequest<ProgressEntry>(`${entryBase(planId, activityId)}/${entryId}`, auth(token, { method: 'PATCH', body: JSON.stringify(input) }))
export const deleteProgressEntry = (token: string, planId: string, activityId: string, entryId: string) =>
  apiRequest<void>(`${entryBase(planId, activityId)}/${entryId}`, auth(token, { method: 'DELETE' }))
