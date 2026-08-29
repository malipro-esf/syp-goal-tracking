import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock3, Languages, Mail, Palette, Save, ShieldCheck, UserRound } from 'lucide-react'

import { ApiError } from '../../api/client'
import { SuccessToast } from '../../components/SuccessToast'
import { supportedLanguages, type SupportedLanguage } from '../../i18n'
import { detectBrowserTimezone, getSupportedTimezones } from './timezones'
import { useAuth } from './useAuth'

const languageNames: Record<SupportedLanguage, string> = { en: 'English', fa: 'فارسی', tr: 'Türkçe', ar: 'العربية', da: 'Dansk', de: 'Deutsch', el: 'Ελληνικά', ja: '日本語', 'zh-CN': '简体中文', es: 'Español', sv: 'Svenska', fr: 'Français', 'pt-BR': 'Português (Brasil)', hi: 'हिन्दी', ko: '한국어', fi: 'Suomi', nb: 'Norsk bokmål', it: 'Italiano' }

export function ProfileSettingsPage() {
  const { i18n, t } = useTranslation()
  const { updateProfile, user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedGender, setSelectedGender] = useState(user?.gender ?? '')
  const [genderThemeEnabled, setGenderThemeEnabled] = useState(user?.gender_theme_enabled ?? false)
  const browserTimezone = detectBrowserTimezone()
  const timezoneOptions = getSupportedTimezones(user?.timezone ?? browserTimezone)
  useEffect(() => {
    setSelectedGender(user?.gender ?? '')
    setGenderThemeEnabled(user?.gender_theme_enabled ?? false)
  }, [user?.gender, user?.gender_theme_enabled])
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
        gender: (String(data.get('gender')) || null) as 'man' | 'woman' | null,
        gender_theme_enabled: data.get('genderThemeEnabled') === 'on',
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
      <label><span className="label-with-icon"><Clock3 aria-hidden="true" />{t('profile.timezone')}</span><input name="timezone" defaultValue={user.timezone || browserTimezone} list="syp-timezones" autoComplete="off" required /><datalist id="syp-timezones">{timezoneOptions.map(timezone => <option key={timezone} value={timezone} />)}</datalist><small>{t('profile.timezoneHint')}</small></label>
      <fieldset className="appearance-settings"><legend><span className="label-with-icon"><Palette aria-hidden="true" />{t('profile.appearance.title')}</span></legend>
        <label>{t('profile.appearance.gender')}<select name="gender" value={selectedGender} onChange={(event) => { const gender = event.target.value; setSelectedGender(gender); if (!gender) setGenderThemeEnabled(false) }}><option value="">{t('profile.appearance.notSpecified')}</option><option value="man">{t('profile.appearance.man')}</option><option value="woman">{t('profile.appearance.woman')}</option></select></label>
        <label className="checkbox-label"><input type="checkbox" name="genderThemeEnabled" checked={genderThemeEnabled} disabled={!selectedGender} onChange={(event) => setGenderThemeEnabled(event.target.checked)} /> <span>{t('profile.appearance.enable')}</span></label>
        <small>{t('profile.appearance.hint')}</small>
      </fieldset>
      <SuccessToast message={message} onDismiss={() => setMessage('')} />{error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="icon-button" disabled={saving}><Save aria-hidden="true" />{saving ? t('profile.saving') : t('profile.save')}</button>
    </form><aside className="card account-summary"><h2>{t('profile.account')}</h2><dl><div><dt className="label-with-icon"><Mail aria-hidden="true" />{t('profile.email')}</dt><dd>{user.email}</dd></div><div><dt className="label-with-icon"><ShieldCheck aria-hidden="true" />{t('profile.roles')}</dt><dd>{user.roles.join(', ')}</dd></div></dl><p>{t('profile.accountHint')}</p></aside></div>
  </main>
}
