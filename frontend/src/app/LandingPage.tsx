import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AppHeader } from './AppHeader'

const steps = ['structure', 'record', 'understand', 'adjust'] as const
const goals = ['ielts', 'fitness', 'reading', 'programming', 'running', 'development'] as const
const insights = ['plannedActual', 'partial', 'consistency', 'weakAreas'] as const
const participantBenefits = ['personalPlans', 'actualEffort', 'weakAreas', 'feedback'] as const
const coachBenefits = ['templates', 'assign', 'review', 'feedback'] as const

export function LandingPage() {
  const { t } = useTranslation()

  return <div className="marketing-page">
    <AppHeader />
    <main>
      <section className="hero-section">
        <div className="hero-content">
          <p className="eyebrow">{t('home.hero.eyebrow')}</p>
          <h1>{t('home.hero.title')}</h1>
          <p className="hero-copy">{t('home.hero.description')}</p>
          <div className="button-row"><Link className="primary-link" to="/register">{t('home.hero.primary')}</Link><Link className="secondary-link" to="/how-it-works">{t('home.hero.secondary')} <span aria-hidden="true">→</span></Link></div>
          <p className="hero-note"><span aria-hidden="true">✓</span> {t('home.hero.note')}</p>
        </div>
        <aside className="hero-dashboard" aria-label={t('home.preview.aria')}>
          <div className="preview-header"><div><span className="preview-dot" />{t('home.preview.week')}</div><small>{t('home.preview.onTrack')}</small></div>
          <div className="preview-score"><strong>81%</strong><span>{t('home.preview.adherence')}</span></div>
          <div className="preview-chart"><i style={{ height: '48%' }} /><i style={{ height: '64%' }} /><i style={{ height: '53%' }} /><i style={{ height: '78%' }} /><i className="active" style={{ height: '88%' }} /><i style={{ height: '72%' }} /><i style={{ height: '81%' }} /></div>
          <div className="preview-metric"><span>{t('home.preview.planned')}</span><strong>210 min</strong></div>
          <div className="preview-metric"><span>{t('home.preview.actual')}</span><strong>170 min</strong></div>
        </aside>
      </section>

      <section className="philosophy-section" aria-labelledby="philosophy-title">
        <div><p className="eyebrow">{t('home.philosophy.eyebrow')}</p><h2 id="philosophy-title">{t('home.philosophy.title')}</h2><p>{t('home.philosophy.description')}</p></div>
        <div className="effort-example"><div><span>{t('home.philosophy.planned')}</span><strong>30</strong><small>{t('home.philosophy.minutes')}</small></div><span className="effort-arrow" aria-hidden="true">→</span><div className="actual-effort"><span>{t('home.philosophy.actual')}</span><strong>18</strong><small>{t('home.philosophy.minutes')}</small></div><p><b>18 / 30</b> · {t('home.philosophy.progress')}</p></div>
      </section>

      <section className="marketing-section how-section" id="how-it-works">
        <div className="marketing-heading"><p className="eyebrow">{t('home.how.eyebrow')}</p><h2>{t('home.how.title')}</h2><p>{t('home.how.description')}</p></div>
        <div className="steps-grid">{steps.map((step, index) => <article key={step}><span>0{index + 1}</span><h3>{t(`home.how.steps.${step}.title`)}</h3><p>{t(`home.how.steps.${step}.description`)}</p></article>)}</div>
      </section>

      <section className="goal-section" id="features">
        <div className="marketing-heading"><p className="eyebrow">{t('home.goals.eyebrow')}</p><h2>{t('home.goals.title')}</h2><p>{t('home.goals.description')}</p></div>
        <div className="goal-cloud">{goals.map((goal, index) => <span key={goal}><i aria-hidden="true">{['A', '↗', 'B', '</>', 'K', '✦'][index]}</i>{t(`home.goals.items.${goal}`)}</span>)}</div>
      </section>

      <section className="insights-section">
        <div className="insights-demo" aria-hidden="true"><div className="insights-demo-head"><span>{t('home.insights.demoTitle')}</span><strong>81%</strong></div><div className="activity-progress"><label><span>IELTS Listening</span><b>90%</b></label><div><i style={{ width: '90%' }} /></div></div><div className="activity-progress"><label><span>{t('home.goals.items.reading')}</span><b>72%</b></label><div><i style={{ width: '72%' }} /></div></div><div className="activity-progress"><label><span>{t('home.goals.items.fitness')}</span><b>64%</b></label><div><i style={{ width: '64%' }} /></div></div></div>
        <div><p className="eyebrow">{t('home.insights.eyebrow')}</p><h2>{t('home.insights.title')}</h2><p>{t('home.insights.description')}</p><ul>{insights.map((item) => <li key={item}>{t(`home.insights.items.${item}`)}</li>)}</ul></div>
      </section>

      <section className="marketing-section audience-section" id="for-coaches">
        <div className="marketing-heading"><p className="eyebrow">{t('home.audience.eyebrow')}</p><h2>{t('home.audience.title')}</h2></div>
        <div className="audience-grid"><article><span className="audience-icon" aria-hidden="true">01</span><h3>{t('home.audience.participants.title')}</h3><p>{t('home.audience.participants.description')}</p><ul>{participantBenefits.map((item) => <li key={item}>{t(`home.audience.participants.items.${item}`)}</li>)}</ul></article><article className="coach-card"><span className="audience-icon" aria-hidden="true">02</span><h3>{t('home.audience.coaches.title')}</h3><p>{t('home.audience.coaches.description')}</p><ul>{coachBenefits.map((item) => <li key={item}>{t(`home.audience.coaches.items.${item}`)}</li>)}</ul></article></div>
      </section>

      <section className="ai-section"><div className="ai-orbit" aria-hidden="true"><span>AI</span><i /><i /></div><div><p className="eyebrow">{t('home.ai.eyebrow')}</p><h2>{t('home.ai.title')}</h2><p>{t('home.ai.description')}</p><div className="trust-points"><span>✓ {t('home.ai.readOnly')}</span><span>✓ {t('home.ai.consent')}</span><span>✓ {t('home.ai.available')}</span></div></div></section>

      <section className="final-cta"><p className="eyebrow">{t('home.cta.eyebrow')}</p><h2>{t('home.cta.title')}</h2><p>{t('home.cta.description')}</p><Link className="primary-link" to="/register">{t('home.cta.button')} <span aria-hidden="true">→</span></Link></section>
    </main>
    <footer className="marketing-footer"><div><strong>SYP</strong><span>{t('home.footer.name')}</span></div><p>{t('home.footer.tagline')}</p><nav aria-label={t('home.footer.navigation')}><Link to="/features">{t('home.footer.features')}</Link><Link to="/how-it-works">{t('navigation.howItWorks')}</Link><Link to="/for-coaches">{t('home.footer.coaches')}</Link></nav></footer>
  </div>
}
