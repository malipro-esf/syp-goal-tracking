import { apiRequest } from '../../api/client'

export type User = { id: string; email: string; display_name: string; bio: string | null; timezone: string; preferred_language: 'en' | 'fa' | 'tr' | 'ar' | 'de' | 'ja' | 'zh-CN' | 'es' | 'fr' | 'pt-BR' | 'hi'; roles: string[] }
export type AuthResponse = { access_token: string; token_type: 'bearer'; user: User }
type Credentials = { email: string; password: string }

export const registerUser = (input: Credentials & { display_name: string; timezone: string; preferred_language: User['preferred_language']; account_type: 'participant' | 'coach' }) =>
  apiRequest<AuthResponse>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(input) })
export const loginUser = (input: Credentials) =>
  apiRequest<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(input) })
export const refreshSession = () => apiRequest<AuthResponse>('/api/v1/auth/refresh', { method: 'POST' })
export const logoutUser = () => apiRequest<void>('/api/v1/auth/logout', { method: 'POST' })
export const updateProfile = (token: string, input: Pick<User, 'display_name' | 'bio' | 'timezone' | 'preferred_language'>) =>
  apiRequest<User>('/api/v1/users/me', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(input) })
