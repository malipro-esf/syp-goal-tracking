import { apiRequest } from '../../api/client'

export type PlanStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
export type Plan = {
  id: string
  title: string
  description: string | null
  status: PlanStatus
  start_date: string | null
  end_date: string | null
  source_assignment_id: string | null
  created_at: string
  updated_at: string
}
export type PlanInput = {
  title: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
}

const authorized = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...init.headers, Authorization: `Bearer ${token}` },
})

export const listPlans = (token: string) =>
  apiRequest<Plan[]>('/api/v1/plans', authorized(token))
export const getPlan = (token: string, id: string) =>
  apiRequest<Plan>(`/api/v1/plans/${id}`, authorized(token))
export const createPlan = (token: string, input: PlanInput) =>
  apiRequest<Plan>('/api/v1/plans', authorized(token, { method: 'POST', body: JSON.stringify(input) }))
export const updatePlan = (token: string, id: string, input: PlanInput) =>
  apiRequest<Plan>(`/api/v1/plans/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(input) }))
export const transitionPlan = (token: string, id: string, action: string) =>
  apiRequest<Plan>(`/api/v1/plans/${id}/${action}`, authorized(token, { method: 'POST' }))
