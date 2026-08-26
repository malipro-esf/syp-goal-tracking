import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { ApiError } from '../../api/client'
import i18n from '../../i18n'
import { loginUser, logoutUser, refreshSession, registerUser, updateProfile, type AuthResponse } from './auth-api'
import { AuthContext, type AuthContextValue } from './auth-context'

function applyAppearance(user: AuthResponse['user'] | null) {
  const appearance = user?.gender_theme_enabled ? user.gender : null
  if (appearance) document.documentElement.dataset.appearance = appearance
  else delete document.documentElement.dataset.appearance
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const applySession = useCallback((next: AuthResponse) => {
    setSession(next)
    if (next.user.preferred_language) void i18n.changeLanguage(next.user.preferred_language)
    applyAppearance(next.user)
  }, [])

  useEffect(() => {
    applyAppearance(null)
    refreshSession().then(applySession).catch((error: unknown) => {
      if (!(error instanceof ApiError && error.status === 401)) console.error('Session restoration failed', error)
    }).finally(() => setIsLoading(false))
  }, [applySession])

  const value = useMemo<AuthContextValue>(() => ({
    accessToken: session?.access_token ?? null,
    user: session?.user ?? null,
    isLoading,
    login: async (email, password) => applySession(await loginUser({ email, password })),
    register: async (email, password, displayName, accountType) =>
      applySession(await registerUser({
        email,
        password,
        display_name: displayName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        preferred_language: (i18n.resolvedLanguage ?? 'en') as 'en' | 'fa' | 'tr' | 'ar' | 'de' | 'ja' | 'zh-CN' | 'es' | 'fr' | 'pt-BR' | 'hi' | 'ko' | 'fi',
        account_type: accountType,
      })),
    logout: async () => { try { await logoutUser() } finally { setSession(null); applyAppearance(null) } },
    updateProfile: async (input) => {
      if (!session) throw new Error('Authentication is required.')
      const user = await updateProfile(session.access_token, input)
      setSession({ ...session, user })
      applyAppearance(user)
      return user
    },
  }), [applySession, isLoading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
