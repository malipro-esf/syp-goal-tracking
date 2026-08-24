import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AppHeader } from './AppHeader'

const workflow = ['template', 'invite', 'accept', 'support'] as const
const capabilities = ['reusable', 'measurable', 'visibility', 'feedback'] as const
const boundaries = ['ownership', 'scope', 'history'] as const

export function ForCoachesPage() {
  const { t } = useTranslation()

  return <div className="marketing-page coaches-page">
    <AppHeader publicOnly />
    <main className="coaches-page-main">
      <header className="coaches-hero">
        <div><p className="eyebrow">{t('coachesPage.hero.eyebrow')}</p><h1>{t('coachesPage.hero.title')}</h1><p>{t('coachesPage.hero.description')}</p><div className="button-row"><Link className="primary-link" to="/register">{t('coachesPage.hero.button')}</Link><a className="secondary-link" href="#coach-workflow">{t('coachesPage.hero.secondary')} <span aria-hidden="true">→</span></a></div></div>
        <div className="coach-dashboard-preview" aria-label={t('coachesPage.hero.visualAria')}>
          <header><div><span>C</span><div><strong>{t('coachesPage.preview.title')}</strong><small>{t('coachesPage.preview.subtitle')}</small></div></div><b>{t('coachesPage.preview.active')}</b></header>
          <div className="coach-overall"><span>{t('coachesPage.preview.week')}</span><strong>76%</strong><i><b style={{ width: '76%' }} /></i></div>
          <div className="coach-participants"><article><span>AM</span><div><strong>Amir M.</strong><small>IELTS · 82%</small></div><i className="good" /></article><article><span>SK</span><div><strong>Sara K.</strong><small>{t('coachesPage.preview.fitness')} · 68%</small></div><i className="attention" /></article><article><span>DT</span><div><strong>Deniz T.</strong><small>{t('coachesPage.preview.reading')} · 79%</small></div><i className="good" /></article></div>
        </div>
      </header>

      <section className="coach-workflow-section" id="coach-workflow" aria-labelledby="coach-workflow-title">
        <div className="marketing-heading"><p className="eyebrow">{t('coachesPage.workflow.eyebrow')}</p><h2 id="coach-workflow-title">{t('coachesPage.workflow.title')}</h2><p>{t('coachesPage.workflow.description')}</p></div>
        <div className="coach-workflow-grid">{workflow.map((step, index) => <article key={step}><span>0{index + 1}</span><h3>{t(`coachesPage.workflow.steps.${step}.title`)}</h3><p>{t(`coachesPage.workflow.steps.${step}.description`)}</p></article>)}</div>
      </section>

      <section className="coach-template-feature">
        <div className="template-preview" aria-hidden="true"><header><span>{t('coachesPage.template.visualLabel')}</span><b>{t('coachesPage.template.reusable')}</b></header><h3>{t('coachesPage.template.planName')}</h3><div><span><i>30</i>{t('coachesPage.template.listening')}</span><span><i>20</i>{t('coachesPage.template.reading')}</span><span><i>3</i>{t('coachesPage.template.writing')}</span></div></div>
        <div><p className="eyebrow">{t('coachesPage.template.eyebrow')}</p><h2>{t('coachesPage.template.title')}</h2><p>{t('coachesPage.template.description')}</p><ul><li>{t('coachesPage.template.units')}</li><li>{t('coachesPage.template.schedules')}</li><li>{t('coachesPage.template.snapshot')}</li></ul></div>
      </section>

      <section className="coach-capabilities" aria-labelledby="coach-capabilities-title">
        <div className="marketing-heading"><p className="eyebrow">{t('coachesPage.capabilities.eyebrow')}</p><h2 id="coach-capabilities-title">{t('coachesPage.capabilities.title')}</h2></div>
        <div>{capabilities.map((capability, index) => <article key={capability}><span aria-hidden="true">{['◇', '↗', '◉', '✎'][index]}</span><h3>{t(`coachesPage.capabilities.items.${capability}.title`)}</h3><p>{t(`coachesPage.capabilities.items.${capability}.description`)}</p></article>)}</div>
      </section>

      <section className="coach-insight-feature">
        <div><p className="eyebrow">{t('coachesPage.insights.eyebrow')}</p><h2>{t('coachesPage.insights.title')}</h2><p>{t('coachesPage.insights.description')}</p><div className="coach-insight-list"><span><b>82%</b>{t('coachesPage.insights.consistency')}</span><span><b>64%</b>{t('coachesPage.insights.weakArea')}</span><span><b>3</b>{t('coachesPage.insights.partial')}</span></div></div>
        <div className="coach-feedback-preview"><header><span>{t('coachesPage.insights.feedback')}</span><small>{t('coachesPage.insights.today')}</small></header><p>“{t('coachesPage.insights.message')}”</p><footer><span>C</span><strong>{t('coachesPage.insights.coach')}</strong></footer></div>
      </section>

      <section className="coach-boundaries" aria-labelledby="coach-boundaries-title">
        <div><p className="eyebrow">{t('coachesPage.boundaries.eyebrow')}</p><h2 id="coach-boundaries-title">{t('coachesPage.boundaries.title')}</h2><p>{t('coachesPage.boundaries.description')}</p></div>
        <div>{boundaries.map((boundary) => <article key={boundary}><span aria-hidden="true">✓</span><div><h3>{t(`coachesPage.boundaries.items.${boundary}.title`)}</h3><p>{t(`coachesPage.boundaries.items.${boundary}.description`)}</p></div></article>)}</div>
      </section>

      <section className="final-cta"><p className="eyebrow">{t('coachesPage.cta.eyebrow')}</p><h2>{t('coachesPage.cta.title')}</h2><p>{t('coachesPage.cta.description')}</p><Link className="primary-link" to="/register">{t('coachesPage.cta.button')} <span aria-hidden="true">→</span></Link></section>
    </main>
  </div>
}
