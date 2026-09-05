import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'syp-cookie-preferences'
type Consent = { preferences: boolean; decidedAt: string }

export function CookiePreferences() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(() => !localStorage.getItem(STORAGE_KEY))
  const [preferences, setPreferences] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Consent).preferences }
    catch { return true }
  })

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener('open-cookie-preferences', show)
    return () => window.removeEventListener('open-cookie-preferences', show)
  }, [])

  function save(nextPreferences: boolean) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ preferences: nextPreferences, decidedAt: new Date().toISOString() } satisfies Consent))
    setPreferences(nextPreferences)
    setOpen(false)
  }

  if (!open) return null
  return <aside className="cookie-panel" role="dialog" aria-modal="false" aria-labelledby="cookie-title"><div><h2 id="cookie-title">{t('trust.cookies.title')}</h2><p>{t('trust.cookies.description')}</p><label className="checkbox-label"><input type="checkbox" checked disabled />{t('trust.cookies.essential')}</label><label className="checkbox-label"><input type="checkbox" checked={preferences} onChange={(event) => setPreferences(event.target.checked)} />{t('trust.cookies.preferences')}</label></div><div className="button-row"><button type="button" className="secondary-button" onClick={() => save(false)}>{t('trust.cookies.essentialOnly')}</button><button type="button" onClick={() => save(preferences)}>{t('trust.cookies.save')}</button></div></aside>
}
