import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AppHeader } from './AppHeader'
import { SiteFooter } from './SiteFooter'

const workflowSteps = ['plan', 'activities', 'effort', 'report'] as const
const principles = ['partial', 'deterministic', 'control'] as const

function StepVisual({ step }: { step: typeof workflowSteps[number] }) {
  const { t } = useTranslation()

  if (step === 'plan') return <div className="how-plan-card" aria-hidden="true"><span>{t('howPage.visual.goal')}</span><strong>{t('howPage.visual.ielts')}</strong><div><i /><i /><i /></div></div>
  if (step === 'activities') return <div className="how-activity-list" aria-hidden="true"><span><i>30</i>{t('howPage.visual.listening')}</span><span><i>20</i>{t('howPage.visual.reading')}</span><span><i>3</i>{t('howPage.visual.writing')}</span></div>
  if (step === 'effort') return <div className="how-effort-card" aria-hidden="true"><div><span>{t('howPage.visual.planned')}</span><strong>30</strong></div><b>→</b><div><span>{t('howPage.visual.actual')}</span><strong>18</strong></div><small>18 / 30</small></div>
  return <div className="how-report-card" aria-hidden="true"><div><span>{t('howPage.visual.week')}</span><strong>81%</strong></div><p><i style={{ width: '81%' }} /></p><small>{t('howPage.visual.report')}</small></div>
}

export function HowItWorksPage() {
  const { t } = useTranslation()

  return <div className="marketing-page how-page">
    <AppHeader publicOnly />
    <main className="how-page-main">
      <header className="how-hero">
        <p className="eyebrow">{t('howPage.hero.eyebrow')}</p>
        <h1>{t('howPage.hero.title')}</h1>
        <p>{t('howPage.hero.description')}</p>
        <Link className="primary-link" to="/register">{t('howPage.hero.button')} <span aria-hidden="true">→</span></Link>
      </header>

      <section className="workflow-section" aria-labelledby="workflow-title">
        <div className="marketing-heading"><p className="eyebrow">{t('howPage.workflow.eyebrow')}</p><h2 id="workflow-title">{t('howPage.workflow.title')}</h2></div>
        <div className="workflow-list">{workflowSteps.map((step, index) => <article key={step}>
          <div className="workflow-copy"><span>0{index + 1}</span><div><h3>{t(`howPage.workflow.steps.${step}.title`)}</h3><p>{t(`howPage.workflow.steps.${step}.description`)}</p><small>{t(`howPage.workflow.steps.${step}.example`)}</small></div></div>
          <StepVisual step={step} />
        </article>)}</div>
      </section>

      <section className="engine-flow" aria-labelledby="engine-title">
        <div><p className="eyebrow">{t('howPage.engine.eyebrow')}</p><h2 id="engine-title">{t('howPage.engine.title')}</h2><p>{t('howPage.engine.description')}</p></div>
        <div className="engine-diagram" aria-label={t('howPage.engine.aria')}>
          <span>{t('howPage.engine.plan')}</span><b aria-hidden="true">+</b><span>{t('howPage.engine.records')}</span><b aria-hidden="true">→</b><strong>{t('howPage.engine.result')}</strong>
        </div>
      </section>

      <section className="principles-section" aria-labelledby="principles-title">
        <div className="marketing-heading"><p className="eyebrow">{t('howPage.principles.eyebrow')}</p><h2 id="principles-title">{t('howPage.principles.title')}</h2></div>
        <div className="principle-grid">{principles.map((principle, index) => <article key={principle}><span>0{index + 1}</span><h3>{t(`howPage.principles.items.${principle}.title`)}</h3><p>{t(`howPage.principles.items.${principle}.description`)}</p></article>)}</div>
      </section>

      <section className="how-roles">
        <div><p className="eyebrow">{t('howPage.roles.coach.eyebrow')}</p><h2>{t('howPage.roles.coach.title')}</h2><p>{t('howPage.roles.coach.description')}</p></div>
        <div><p className="eyebrow">{t('howPage.roles.ai.eyebrow')}</p><h2>{t('howPage.roles.ai.title')}</h2><p>{t('howPage.roles.ai.description')}</p></div>
      </section>

      <section className="final-cta"><p className="eyebrow">{t('howPage.cta.eyebrow')}</p><h2>{t('howPage.cta.title')}</h2><p>{t('howPage.cta.description')}</p><Link className="primary-link" to="/register">{t('howPage.cta.button')} <span aria-hidden="true">→</span></Link></section>
    </main>
    <SiteFooter />
  </div>
}
