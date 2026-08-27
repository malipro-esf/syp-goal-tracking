import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'

export const supportedLanguages = ['ar', 'da', 'en', 'fi', 'fr', 'de', 'el', 'hi', 'ja', 'ko', 'fa', 'pt-BR', 'zh-CN', 'es', 'sv', 'tr'] as const
export type SupportedLanguage = typeof supportedLanguages[number]

type TranslationCatalog = Record<string, unknown>
type LocaleModule = { default: TranslationCatalog }
type LocaleLoader = () => Promise<LocaleModule>

const localeLoaders: Record<Exclude<SupportedLanguage, 'en'>, LocaleLoader> = {
  da: () => import('./locales/da.json'),
  fa: () => import('./locales/fa.json'),
  tr: () => import('./locales/tr.json'),
  ar: () => import('./locales/ar.json'),
  de: () => import('./locales/de.json'),
  el: () => import('./locales/el.json'),
  ja: () => import('./locales/ja.json'),
  'zh-CN': () => import('./locales/zh-CN.json'),
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
  'pt-BR': () => import('./locales/pt-BR.json'),
  hi: () => import('./locales/hi.json'),
  ko: () => import('./locales/ko.json'),
  fi: () => import('./locales/fi.json'),
  sv: () => import('./locales/sv.json'),
}

export async function loadLocale(language: SupportedLanguage): Promise<TranslationCatalog> {
  if (language === 'en') return en
  const loader = localeLoaders[language]
  if (!loader) throw new Error(`Unsupported locale: ${language}`)
  return (await loader()).default
}

function initialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem('syp-language')
  if (supportedLanguages.includes(saved as SupportedLanguage)) return saved as SupportedLanguage
  const normalizedBrowserLanguage = navigator.language.toLowerCase()
  const browserLanguage = normalizedBrowserLanguage.startsWith('zh') ? 'zh-CN' : normalizedBrowserLanguage.startsWith('pt') ? 'pt-BR' : navigator.language.split('-')[0]
  return supportedLanguages.includes(browserLanguage as SupportedLanguage) ? browserLanguage as SupportedLanguage : 'en'
}

function updateDocumentLanguage(language: string) {
  const baseLanguage = language.split('-')[0]
  const resolved = baseLanguage === 'zh' ? 'zh-CN' : baseLanguage === 'pt' ? 'pt-BR' : baseLanguage
  document.documentElement.lang = resolved
  document.documentElement.dir = resolved === 'fa' || resolved === 'ar' ? 'rtl' : 'ltr'
}

const lazyLocaleBackend = {
  type: 'backend' as const,
  init: () => undefined,
  read(language: string, _namespace: string, callback: (error: Error | null, data?: TranslationCatalog) => void) {
    if (!supportedLanguages.includes(language as SupportedLanguage)) {
      callback(new Error(`Unsupported locale: ${language}`))
      return
    }

    void loadLocale(language as SupportedLanguage)
      .then((catalog) => callback(null, catalog))
      .catch((error: unknown) => callback(error instanceof Error ? error : new Error('Locale loading failed.')))
  },
}

export const i18nReady = i18n.use(lazyLocaleBackend).use(initReactI18next).init({
  resources: { en: { translation: en } },
  partialBundledLanguages: true,
  lng: initialLanguage(),
  fallbackLng: 'en',
  supportedLngs: supportedLanguages,
  interpolation: { escapeValue: false },
})

updateDocumentLanguage(initialLanguage())
i18n.on('languageChanged', (language) => {
  localStorage.setItem('syp-language', language)
  updateDocumentLanguage(language)
})

export default i18n
