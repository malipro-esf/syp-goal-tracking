import { useTranslation } from 'react-i18next'

import { supportedLanguages, type SupportedLanguage } from '../i18n'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  return <label className="language-switcher">
    <span className="visually-hidden">{t('language.label')}</span>
    <select
      aria-label={t('language.label')}
      value={i18n.resolvedLanguage ?? 'en'}
      onChange={(event) => void i18n.changeLanguage(event.target.value as SupportedLanguage)}
    >
      {supportedLanguages.map((language) => <option value={language} key={language}>{t(`language.${language === 'en' ? 'english' : language === 'fa' ? 'persian' : 'turkish'}`)}</option>)}
    </select>
  </label>
}
