import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import fa from './locales/fa.json'
import tr from './locales/tr.json'

export const supportedLanguages = ['en', 'fa', 'tr'] as const
export type SupportedLanguage = typeof supportedLanguages[number]

function initialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem('syp-language')
  if (supportedLanguages.includes(saved as SupportedLanguage)) return saved as SupportedLanguage
  const browserLanguage = navigator.language.split('-')[0]
  return supportedLanguages.includes(browserLanguage as SupportedLanguage) ? browserLanguage as SupportedLanguage : 'en'
}

function updateDocumentLanguage(language: string) {
  const resolved = language.split('-')[0]
  document.documentElement.lang = resolved
  document.documentElement.dir = resolved === 'fa' ? 'rtl' : 'ltr'
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fa: { translation: fa }, tr: { translation: tr } },
  lng: initialLanguage(),
  fallbackLng: 'en',
  supportedLngs: supportedLanguages,
  interpolation: { escapeValue: false },
})

updateDocumentLanguage(i18n.language)
i18n.on('languageChanged', (language) => {
  localStorage.setItem('syp-language', language)
  updateDocumentLanguage(language)
})

export default i18n
