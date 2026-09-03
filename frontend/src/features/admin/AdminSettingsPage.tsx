import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiError, apiRequest } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { AdminLayout } from './AdminLayout'

type Settings = { registration_enabled: boolean; stale_invitation_days: number; profile_photo_max_mb: number; automatic_plan_completion_enabled: boolean }

export function AdminSettingsPage() {
  const { accessToken, user } = useAuth()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const isAdmin = user?.roles.includes('admin')
  useEffect(() => { if (accessToken && isAdmin) apiRequest<Settings>('/api/v1/admin/settings', { headers: { Authorization: `Bearer ${accessToken}` } }).then(setSettings).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Settings could not be loaded.')) }, [accessToken, isAdmin])
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  async function save() {
    if (!settings || !window.confirm('Save these system-wide settings?')) return
    try { const updated = await apiRequest<Settings>('/api/v1/admin/settings', { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(settings) }); setSettings(updated); setMessage('System settings saved.'); setError('') }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Settings could not be saved.'); setMessage('') }
  }
  return <AdminLayout active="settings" title="System settings" description="Manage application-wide operational defaults.">{message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}{settings && <section className="card admin-settings-form"><label className="checkbox-label"><input type="checkbox" checked={settings.registration_enabled} onChange={(event) => setSettings({ ...settings, registration_enabled: event.target.checked })} />Allow new account registration</label><label>Stale invitation threshold (days)<input type="number" min="1" max="365" value={settings.stale_invitation_days} onChange={(event) => setSettings({ ...settings, stale_invitation_days: Number(event.target.value) })} /></label><label>Maximum profile photo size (MB)<input type="number" min="1" max="10" value={settings.profile_photo_max_mb} onChange={(event) => setSettings({ ...settings, profile_photo_max_mb: Number(event.target.value) })} /></label><label className="checkbox-label"><input type="checkbox" checked={settings.automatic_plan_completion_enabled} onChange={(event) => setSettings({ ...settings, automatic_plan_completion_enabled: event.target.checked })} />Automatically complete expired plans</label><small>Automatic-completion changes take effect on the next scheduled check.</small><button type="button" onClick={save}>Save system settings</button></section>}</AdminLayout>
}
