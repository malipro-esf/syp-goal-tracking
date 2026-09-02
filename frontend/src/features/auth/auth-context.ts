import { createContext } from 'react'
import type { User } from './auth-api'

export type AuthContextValue = {
  accessToken: string | null
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string, accountType: 'participant' | 'coach') => Promise<void>
  logout: () => Promise<void>
  updateProfile: (input: Pick<User, 'display_name' | 'bio' | 'timezone' | 'preferred_language' | 'country_code' | 'gender' | 'gender_theme_enabled'>) => Promise<User>
  uploadProfilePhoto: (photo: File) => Promise<void>
  removeProfilePhoto: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
