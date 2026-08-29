import { useEffect } from 'react'

export function SuccessToast({ message, onDismiss, duration = 4000, className = '' }: {
  message: string
  onDismiss: () => void
  duration?: number
  className?: string
}) {
  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timeout)
  }, [duration, message, onDismiss])

  if (!message) return null

  return <p className={`form-success${className ? ` ${className}` : ''}`} role="status" aria-live="polite">{message}</p>
}
