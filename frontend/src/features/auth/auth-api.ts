import { apiRequest } from '../../api/client'

export type User = { id: string; email: string; display_name: string; roles: string[] }
export type AuthResponse = { access_token: string; token_type: 'bearer'; user: User }
type Credentials = { email: string; password: string }

export const registerUser = (input: Credentials & { display_name: string }) =>
  apiRequest<AuthResponse>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(input) })
export const loginUser = (input: Credentials) =>
  apiRequest<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(input) })
export const refreshSession = () => apiRequest<AuthResponse>('/api/v1/auth/refresh', { method: 'POST' })
export const logoutUser = () => apiRequest<void>('/api/v1/auth/logout', { method: 'POST' })
