import { AppHeader } from './AppHeader'
import { SiteFooter } from './SiteFooter'

type Section = { title: string; paragraphs: string[] }

const privacySections: Section[] = [
  { title: 'Information we collect', paragraphs: ['We collect account details such as your name, email address, roles, language, timezone, country, and optional profile information. We also store plans, activities, progress entries, coaching invitations, feedback, support requests, and security records needed to operate SYP.', 'Technical information may include session identifiers, request identifiers, timestamps, and diagnostic logs. SYP does not currently use advertising trackers.'] },
  { title: 'How we use information', paragraphs: ['We use information to provide accounts and plans, calculate progress, support coaching collaboration, secure the service, respond to support requests, and improve reliability. We do not sell personal information.'] },
  { title: 'Coaches and participants', paragraphs: ['When you join a coach-managed plan, the assigned coach can view the plan, your recorded activity, progress, and feedback connected to that coaching relationship. Participants cannot change coach-managed plan configuration.'] },
  { title: 'Storage and retention', paragraphs: ['Information is retained while an account or operational record is needed. Security, audit, and support records may be retained longer when necessary for safety, legal obligations, or dispute resolution.'] },
  { title: 'Your choices', paragraphs: ['You can update profile and notification preferences in SYP. Account-data export and deletion controls are planned for the account-safety phase. Until then, contact Support to request access, correction, or deletion.'] },
  { title: 'Security and contact', paragraphs: ['We use access controls, password hashing, session protections, and administrative audit records. No system can guarantee absolute security. Report privacy or security concerns through the Support page.'] },
]

const termsSections: Section[] = [
  { title: 'Using SYP', paragraphs: ['You must provide accurate account information, keep login credentials confidential, and use the service lawfully. You are responsible for activity performed through your account unless you promptly report unauthorized access.'] },
  { title: 'Plans and coaching', paragraphs: ['SYP helps users organize goals, record activity, and collaborate with coaches. Coaches are responsible for their templates, guidance, and relationships. SYP does not verify professional qualifications or guarantee results.'] },
  { title: 'Health and professional decisions', paragraphs: ['SYP is a planning and progress tool, not medical, legal, financial, or other professional advice. Seek a qualified professional before acting on information where safety or significant consequences are involved.'] },
  { title: 'Acceptable use', paragraphs: ['Do not misuse the service, interfere with its operation, access another person’s information without permission, upload harmful material, impersonate others, or use SYP to violate rights or laws.'] },
  { title: 'Availability and changes', paragraphs: ['Features may change as SYP develops. We may suspend access to protect users or the service. Material changes to these terms should be communicated before they take effect where reasonably possible.'] },
  { title: 'Contact', paragraphs: ['Questions about these terms can be submitted through the Support page.'] },
]

export function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const privacy = type === 'privacy'
  const sections = privacy ? privacySections : termsSections
  return <div className="marketing-page"><AppHeader /><main className="legal-page"><header><p className="eyebrow">Trust and transparency</p><h1>{privacy ? 'Privacy Policy' : 'Terms of Service'}</h1><p>Last updated September 5, 2026</p></header><div className="legal-layout"><nav aria-label={`${privacy ? 'Privacy Policy' : 'Terms of Service'} sections`}>{sections.map((section, index) => <a href={`#legal-${index}`} key={section.title}>{section.title}</a>)}</nav><article>{sections.map((section, index) => <section id={`legal-${index}`} key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</article></div></main><SiteFooter /></div>
}
