import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock3, Languages, Mail, Save, ShieldCheck, UserRound } from 'lucide-react'

import { ApiError } from '../../api/client'
import { supportedLanguages, type SupportedLanguage } from '../../i18n'
import { useAuth } from './useAuth'

const languageNames: Record<SupportedLanguage, string> = { en: 'English', fa: 'فارسی', tr: 'Türkçe', ar: 'العربية', de: 'Deutsch', ja: '日本語' }

export function ProfileSettingsPage() {
  const { i18n, t } = useTranslation()
  const { updateProfile, user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  if (!user) return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(''); setError('')
    const data = new FormData(event.currentTarget)
    try {
      const updated = await updateProfile({
        display_name: String(data.get('displayName')),
        bio: String(data.get('bio')).trim() || null,
        timezone: String(data.get('timezone')),
        preferred_language: String(data.get('language')) as SupportedLanguage,
      })
      await i18n.changeLanguage(updated.preferred_language)
      setMessage(t('profile.saved'))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('profile.error'))
    } finally { setSaving(false) }
  }

  return <main className="page-shell profile-page"><header className="page-header"><div><p className="eyebrow">{t('profile.eyebrow')}</p><h1 className="heading-with-icon"><UserRound aria-hidden="true" />{t('profile.title')}</h1><p>{t('profile.description')}</p></div></header>
    <div className="profile-grid"><form className="card profile-form" onSubmit={submit}>
      <label>{t('profile.displayName')}<input name="displayName" defaultValue={user.display_name} minLength={2} maxLength={100} required /></label>
      <label>{t('profile.bio')}<textarea name="bio" defaultValue={user.bio ?? ''} maxLength={500} rows={5} /><small>{t('profile.bioHint')}</small></label>
      <label><span className="label-with-icon"><Languages aria-hidden="true" />{t('profile.language')}</span><select name="language" defaultValue={user.preferred_language}>{supportedLanguages.map(code => <option key={code} value={code}>{languageNames[code]}</option>)}</select></label>
      <label><span className="label-with-icon"><Clock3 aria-hidden="true" />{t('profile.timezone')}</span><input name="timezone" defaultValue={user.timezone} required /><small>{t('profile.timezoneHint')}</small></label>
      {message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="icon-button" disabled={saving}><Save aria-hidden="true" />{saving ? t('profile.saving') : t('profile.save')}</button>
    </form><aside className="card account-summary"><h2>{t('profile.account')}</h2><dl><div><dt className="label-with-icon"><Mail aria-hidden="true" />{t('profile.email')}</dt><dd>{user.email}</dd></div><div><dt className="label-with-icon"><ShieldCheck aria-hidden="true" />{t('profile.roles')}</dt><dd>{user.roles.join(', ')}</dd></div></dl><p>{t('profile.accountHint')}</p></aside></div>
  </main>
}
