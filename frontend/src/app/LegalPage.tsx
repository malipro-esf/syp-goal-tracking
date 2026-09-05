import { useTranslation } from 'react-i18next'

import { AppHeader } from './AppHeader'
import { SiteFooter } from './SiteFooter'

const sectionKeys = {
  privacy: ['collection', 'use', 'coaching', 'retention', 'choices', 'security'],
  terms: ['use', 'coaching', 'professional', 'acceptable', 'changes', 'contact'],
} as const

export function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const { t } = useTranslation()
  const privacy = type === 'privacy'
  const sections = sectionKeys[type]
  const title = t(`trust.${type}.title`)
  return <div className="marketing-page"><AppHeader /><main className="legal-page"><header><p className="eyebrow">{t('trust.eyebrow')}</p><h1>{title}</h1><p>{t('trust.lastUpdated')}</p></header><div className="legal-layout"><nav aria-label={t('trust.sectionNavigation', { title })}>{sections.map((section, index) => <a href={`#legal-${index}`} key={section}>{t(`trust.${type}.sections.${section}.title`)}</a>)}</nav><article>{sections.map((section, index) => <section id={`legal-${index}`} key={section}><h2>{t(`trust.${type}.sections.${section}.title`)}</h2><p>{t(`trust.${type}.sections.${section}.body`)}</p>{privacy && section === 'collection' && <p>{t('trust.privacy.sections.collection.technical')}</p>}</section>)}</article></div></main><SiteFooter /></div>
}
