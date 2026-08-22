import { createContext } from 'react'
import type { User } from './auth-api'

export type AuthContextValue = {
  accessToken: string | null
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string, accountType: 'participant' | 'coach') => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
