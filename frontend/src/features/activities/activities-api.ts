import { apiRequest } from '../../api/client'

export type UnitCode = 'minute' | 'hour' | 'page' | 'repetition' | 'number' | 'meter' | 'kilometer' | 'custom'
export type ScheduleType = 'daily' | 'weekly' | 'selected_days'
export type ExpectationInput = {
  target_quantity: string
  schedule_type: ScheduleType
  weekdays: number[] | null
  effective_from: string
  reason?: string | null
}
export type ActivityInput = ExpectationInput & {
  name: string
  description?: string | null
  unit_code: UnitCode
  custom_unit_label?: string | null
  display_order?: number
}
export type Activity = {
  id: string
  enrollment_id: string
  name: string
  description: string | null
  measurement_dimension: string
  unit_code: UnitCode
  custom_unit_label: string | null
  display_order: number
  status: string
  current_target: { target_quantity: string; effective_from: string; effective_until: string | null; reason: string | null }
  current_schedule: { schedule_type: ScheduleType; weekdays: number[] | null; effective_from: string; effective_until: string | null }
}

const auth = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...init.headers, Authorization: `Bearer ${token}` },
})
const base = (planId: string) => `/api/v1/plans/${planId}/activities`

export const listActivities = (token: string, planId: string) =>
  apiRequest<Activity[]>(base(planId), auth(token))
export const createActivity = (token: string, planId: string, input: ActivityInput) =>
  apiRequest<Activity>(base(planId), auth(token, { method: 'POST', body: JSON.stringify(input) }))
export const reviseActivity = (token: string, planId: string, activityId: string, input: ExpectationInput) =>
  apiRequest<Activity>(`${base(planId)}/${activityId}/expectations`, auth(token, { method: 'POST', body: JSON.stringify(input) }))
