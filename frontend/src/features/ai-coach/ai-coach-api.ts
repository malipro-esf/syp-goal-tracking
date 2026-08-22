import { apiRequest } from '../../api/client'

export type CoachAnswer = { run_id: string; answer: string }

export const askCoach = (token: string, planId: string, question: string) =>
  apiRequest<CoachAnswer>('/api/v1/ai-coach/ask', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      plan_id: planId, question, consent_to_ai_processing: true,
    }),
  })
