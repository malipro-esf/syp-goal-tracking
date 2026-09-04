import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { unreadNotificationCount } from './notifications-api'

export function NotificationBell() {
  const { accessToken, user } = useAuth()
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (!accessToken || !user) return
    let active = true
    const refresh = () => unreadNotificationCount(accessToken).then((result) => { if (active) setUnread(result.unread) }).catch(() => undefined)
    refresh()
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    window.addEventListener('notifications-changed', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('notifications-changed', refresh) }
  }, [accessToken, user])
  return <Link className="notification-bell" to="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}><Bell aria-hidden="true" />{unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}</Link>
}
