import { useEffect, useState } from 'react'

const STORAGE_KEY = 'syp-cookie-preferences'
type Consent = { preferences: boolean; decidedAt: string }

export function CookiePreferences() {
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
  return <aside className="cookie-panel" role="dialog" aria-modal="false" aria-labelledby="cookie-title"><div><h2 id="cookie-title">Cookie preferences</h2><p>SYP uses essential cookies for secure sign-in. Optional preference storage remembers choices such as language and appearance. We do not currently use advertising cookies.</p><label className="checkbox-label"><input type="checkbox" checked disabled />Essential storage (required)</label><label className="checkbox-label"><input type="checkbox" checked={preferences} onChange={(event) => setPreferences(event.target.checked)} />Preference storage</label></div><div className="button-row"><button type="button" className="secondary-button" onClick={() => save(false)}>Essential only</button><button type="button" onClick={() => save(preferences)}>Save preferences</button></div></aside>
}
