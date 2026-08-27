import { useTranslation } from 'react-i18next'

import { supportedLanguages, type SupportedLanguage } from '../i18n'

const languageLabelKeys: Record<SupportedLanguage, string> = {
  en: 'english', fa: 'persian', tr: 'turkish', ar: 'arabic', de: 'german', el: 'greek', ja: 'japanese', 'zh-CN': 'chineseSimplified', es: 'spanish', sv: 'swedish', fr: 'french', 'pt-BR': 'portugueseBrazilian', hi: 'hindi', ko: 'korean', fi: 'finnish',
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  return <label className="language-switcher">
    <span className="visually-hidden">{t('language.label')}</span>
    <select
      aria-label={t('language.label')}
      value={i18n.resolvedLanguage ?? 'en'}
      onChange={(event) => void i18n.changeLanguage(event.target.value as SupportedLanguage)}
    >
      {supportedLanguages.map((language) => <option value={language} key={language}>{t(`language.${languageLabelKeys[language]}`)}</option>)}
    </select>
  </label>
}
