import { Link, useParams } from 'react-router-dom'

import { ProgressSummary } from '../progress/ProgressSummary'
import { FeedbackPanel } from './FeedbackPanel'

export function CoachEnrollmentPage() {
  const { enrollmentId = '' } = useParams()
  return <main className="workspace-shell narrow-workspace">
    <header className="workspace-header"><div><p className="eyebrow">Participant review</p>
      <h1>Progress & feedback</h1></div><Link to="/coaching">Back to coaching</Link></header>
    <ProgressSummary planId={enrollmentId} entries={[]} />
    <FeedbackPanel enrollmentId={enrollmentId} canWrite />
  </main>
}
