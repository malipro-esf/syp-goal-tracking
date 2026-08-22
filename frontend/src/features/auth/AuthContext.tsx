import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { ApiError } from '../../api/client'
import { loginUser, logoutUser, refreshSession, registerUser, type AuthResponse } from './auth-api'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    refreshSession().then(setSession).catch((error: unknown) => {
      if (!(error instanceof ApiError && error.status === 401)) console.error('Session restoration failed', error)
    }).finally(() => setIsLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    accessToken: session?.access_token ?? null,
    user: session?.user ?? null,
    isLoading,
    login: async (email, password) => setSession(await loginUser({ email, password })),
    register: async (email, password, displayName) =>
      setSession(await registerUser({
        email,
        password,
        display_name: displayName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })),
    logout: async () => { try { await logoutUser() } finally { setSession(null) } },
  }), [isLoading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
