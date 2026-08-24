import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AppHeader } from './AppHeader'

const featureKeys = ['plans', 'measurement', 'effort', 'reports', 'coaching', 'ai'] as const
const trustKeys = ['auth', 'consent', 'independent'] as const

export function FeaturesPage() {
  const { t } = useTranslation()

  return <div className="marketing-page features-page">
    <AppHeader publicOnly />
    <main className="features-page-main">
      <header className="features-hero">
        <div><p className="eyebrow">{t('featuresPage.hero.eyebrow')}</p><h1>{t('featuresPage.hero.title')}</h1><p>{t('featuresPage.hero.description')}</p><div className="button-row"><Link className="primary-link" to="/register">{t('featuresPage.hero.button')}</Link><Link className="secondary-link" to="/how-it-works">{t('featuresPage.hero.secondary')} <span aria-hidden="true">→</span></Link></div></div>
        <div className="feature-hero-visual" aria-label={t('featuresPage.hero.visualAria')}>
          <div className="feature-score"><span>{t('featuresPage.hero.week')}</span><strong>81%</strong><small>{t('featuresPage.hero.adherence')}</small></div>
          <span className="feature-pill pill-plan">{t('featuresPage.hero.plan')}</span>
          <span className="feature-pill pill-effort">18 / 30</span>
          <span className="feature-pill pill-coach">{t('featuresPage.hero.coach')}</span>
          <span className="feature-pill pill-ai">AI</span>
        </div>
      </header>

      <section className="feature-catalog" aria-labelledby="feature-catalog-title">
        <div className="marketing-heading"><p className="eyebrow">{t('featuresPage.catalog.eyebrow')}</p><h2 id="feature-catalog-title">{t('featuresPage.catalog.title')}</h2><p>{t('featuresPage.catalog.description')}</p></div>
        <div className="feature-cards">{featureKeys.map((feature, index) => <article key={feature}><span className="feature-number">0{index + 1}</span><div className={`feature-symbol symbol-${feature}`} aria-hidden="true" /><h3>{t(`featuresPage.catalog.items.${feature}.title`)}</h3><p>{t(`featuresPage.catalog.items.${feature}.description`)}</p><small>{t(`featuresPage.catalog.items.${feature}.detail`)}</small></article>)}</div>
      </section>

      <section className="feature-deep-dive partial-feature">
        <div><p className="eyebrow">{t('featuresPage.partial.eyebrow')}</p><h2>{t('featuresPage.partial.title')}</h2><p>{t('featuresPage.partial.description')}</p><ul><li>{t('featuresPage.partial.multiple')}</li><li>{t('featuresPage.partial.correction')}</li><li>{t('featuresPage.partial.history')}</li></ul></div>
        <div className="partial-demo" aria-hidden="true"><header><span>{t('featuresPage.partial.activity')}</span><b>{t('featuresPage.partial.today')}</b></header><div className="partial-numbers"><span><small>{t('featuresPage.partial.planned')}</small><strong>30</strong></span><i /><span><small>{t('featuresPage.partial.actual')}</small><strong>18</strong></span></div><div className="partial-meter"><i /></div><footer><strong>60%</strong><span>{t('featuresPage.partial.recorded')}</span></footer></div>
      </section>

      <section className="feature-deep-dive reporting-feature">
        <div className="reporting-demo" aria-hidden="true"><article><span>{t('featuresPage.reporting.attainment')}</span><strong>125%</strong><small>{t('featuresPage.reporting.uncapped')}</small></article><article><span>{t('featuresPage.reporting.adherence')}</span><strong>100%</strong><small>{t('featuresPage.reporting.capped')}</small></article><div><span>{t('featuresPage.reporting.expected')}</span><b>40 km</b><span>{t('featuresPage.reporting.actual')}</span><b>50 km</b></div></div>
        <div><p className="eyebrow">{t('featuresPage.reporting.eyebrow')}</p><h2>{t('featuresPage.reporting.title')}</h2><p>{t('featuresPage.reporting.description')}</p><ul><li>{t('featuresPage.reporting.ranges')}</li><li>{t('featuresPage.reporting.breakdown')}</li><li>{t('featuresPage.reporting.units')}</li></ul></div>
      </section>

      <section className="coaching-feature">
        <div className="marketing-heading"><p className="eyebrow">{t('featuresPage.coaching.eyebrow')}</p><h2>{t('featuresPage.coaching.title')}</h2><p>{t('featuresPage.coaching.description')}</p></div>
        <div className="coaching-flow"><span><i>01</i>{t('featuresPage.coaching.template')}</span><b aria-hidden="true">→</b><span><i>02</i>{t('featuresPage.coaching.invitation')}</span><b aria-hidden="true">→</b><span><i>03</i>{t('featuresPage.coaching.snapshot')}</span><b aria-hidden="true">→</b><span><i>04</i>{t('featuresPage.coaching.feedback')}</span></div>
      </section>

      <section className="feature-trust" aria-labelledby="feature-trust-title">
        <div><p className="eyebrow">{t('featuresPage.trust.eyebrow')}</p><h2 id="feature-trust-title">{t('featuresPage.trust.title')}</h2><p>{t('featuresPage.trust.description')}</p></div>
        <div>{trustKeys.map((item) => <article key={item}><span aria-hidden="true">✓</span><div><h3>{t(`featuresPage.trust.items.${item}.title`)}</h3><p>{t(`featuresPage.trust.items.${item}.description`)}</p></div></article>)}</div>
      </section>

      <section className="final-cta"><p className="eyebrow">{t('featuresPage.cta.eyebrow')}</p><h2>{t('featuresPage.cta.title')}</h2><p>{t('featuresPage.cta.description')}</p><Link className="primary-link" to="/register">{t('featuresPage.cta.button')} <span aria-hidden="true">→</span></Link></section>
    </main>
  </div>
}
