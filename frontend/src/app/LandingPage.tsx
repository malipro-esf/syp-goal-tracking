import { Link } from 'react-router-dom'

import { AppHeader } from './AppHeader'

export function LandingPage() {
  return <div className="marketing-page">
    <AppHeader publicOnly />
    <main>
      <section className="hero-section">
        <div><p className="eyebrow">Smart goal tracking & coaching</p><h1>Measure the effort.<br />Build the progress.</h1><p className="hero-copy">Create structured plans, record what you actually completed, and understand your progress without turning every missed target into failure.</p><div className="button-row"><Link className="primary-link" to="/register">Start tracking</Link><a className="secondary-link" href="#how-it-works">See how it works</a></div></div>
        <aside className="hero-report" aria-label="Example weekly progress"><p>This week</p><strong>81%</strong><span>170 of 210 planned minutes</span><div><i style={{ width: '81%' }} /></div><small>Progress over perfection.</small></aside>
      </section>
      <section className="marketing-section" id="how-it-works"><p className="eyebrow">How it works</p><h2>From intention to measurable execution</h2><div className="feature-grid"><article><span>01</span><h3>Structure your goal</h3><p>Turn IELTS, fitness, reading, or learning goals into activities with meaningful units and schedules.</p></article><article><span>02</span><h3>Record actual effort</h3><p>Capture partial progress such as 18 of 30 minutes instead of reducing your day to pass or fail.</p></article><article><span>03</span><h3>Learn and adjust</h3><p>Review deterministic progress reports, coach feedback, and optional data-grounded AI guidance.</p></article></div></section>
    </main>
    <footer className="marketing-footer"><strong>SYP</strong><span>Smart Goal Tracking & AI Coaching</span></footer>
  </div>
}
