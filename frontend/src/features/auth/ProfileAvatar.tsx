import { useEffect, useState } from 'react'

import { useAuth } from './useAuth'

function AuthenticatedPhoto({ accessToken }: { accessToken: string }) {
  const [source, setSource] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => { const refresh = () => setRevision((value) => value + 1); window.addEventListener('profile-photo-updated', refresh); return () => window.removeEventListener('profile-photo-updated', refresh) }, [])
  useEffect(() => {
    let objectUrl = ''
    fetch('/api/v1/users/me/profile-photo', { headers: { Authorization: `Bearer ${accessToken}` }, credentials: 'include' })
      .then((response) => response.ok ? response.blob() : Promise.reject(new Error('Photo unavailable')))
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setSource(objectUrl) })
      .catch(() => setSource(''))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [accessToken, revision])
  return source ? <img src={source} alt="" /> : null
}

export function ProfileAvatar({ className = '' }: { className?: string }) {
  const { accessToken, user } = useAuth()
  const initial = user?.display_name.trim().charAt(0).toUpperCase() || 'S'
  return <span className={`profile-avatar ${className}`} aria-hidden="true">{accessToken && user?.has_profile_photo ? <AuthenticatedPhoto accessToken={accessToken} /> : initial}</span>
}
