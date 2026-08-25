import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import ar from './locales/ar.json'
import de from './locales/de.json'
import ja from './locales/ja.json'
import zhCN from './locales/zh-CN.json'
import fa from './locales/fa.json'
import tr from './locales/tr.json'

export const supportedLanguages = ['en', 'fa', 'tr', 'ar', 'de', 'ja', 'zh-CN'] as const
export type SupportedLanguage = typeof supportedLanguages[number]

function initialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem('syp-language')
  if (supportedLanguages.includes(saved as SupportedLanguage)) return saved as SupportedLanguage
  const browserLanguage = navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : navigator.language.split('-')[0]
  return supportedLanguages.includes(browserLanguage as SupportedLanguage) ? browserLanguage as SupportedLanguage : 'en'
}

function updateDocumentLanguage(language: string) {
  const baseLanguage = language.split('-')[0]
  const resolved = baseLanguage === 'zh' ? 'zh-CN' : baseLanguage
  document.documentElement.lang = resolved
  document.documentElement.dir = resolved === 'fa' || resolved === 'ar' ? 'rtl' : 'ltr'
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fa: { translation: fa }, tr: { translation: tr }, ar: { translation: ar }, de: { translation: de }, ja: { translation: ja }, 'zh-CN': { translation: zhCN } },
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
