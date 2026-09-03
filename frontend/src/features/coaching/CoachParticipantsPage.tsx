import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, LayoutDashboard, Search, Settings, Users } from 'lucide-react'

import { ApiError } from '../../api/client'
import { useAuth } from '../auth/useAuth'
import { listSent, type Assignment } from './coaching-api'

type AssignmentFilter = 'all' | 'pending' | 'accepted' | 'rejected'
const PAGE_SIZE = 10

export function CoachParticipantsPage() {
  const { accessToken, user } = useAuth()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const requestedStatus = searchParams.get('status')
  const status: AssignmentFilter = requestedStatus === 'pending' || requestedStatus === 'accepted' || requestedStatus === 'rejected'
    ? requestedStatus
    : 'all'
  const coach = user?.roles.includes('coach') ?? false

  useEffect(() => {
    if (!accessToken || !coach) return
    listSent(accessToken).then(setAssignments).catch((caught: unknown) =>
      setLoadError(caught instanceof ApiError ? caught.message : t('coachingPage.errors.load')))
  }, [accessToken, coach, t])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return assignments.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status
      const matchesSearch = !query || [item.participant_name, item.participant_email, item.template_title]
        .some((value) => value.toLocaleLowerCase().includes(query))
      return matchesStatus && matchesSearch
    })
  }, [assignments, search, status])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const displayed = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (user && !coach) return <Navigate to="/coaching" replace />

  function changeStatus(nextStatus: AssignmentFilter) {
    setPage(1)
    setSearchParams(nextStatus === 'all' ? {} : { status: nextStatus })
  }

  return <main className="admin-shell coaching-workspace">
    <aside className="admin-sidebar dashboard-sidebar">
      <Link className="admin-brand" to="/dashboard"><span>S</span><strong>SYP</strong></Link>
      <div className="sidebar-plan"><small>{t('dashboard.sidebar.workspace')}</small><strong>{user?.display_name}</strong><span>{user?.roles.map((role) => t(`auth.roles.${role}`)).join(', ')}</span></div>
      <nav className="admin-nav" aria-label={t('dashboard.sidebar.navigation')}>
        <Link to="/dashboard"><LayoutDashboard aria-hidden="true" />{t('dashboard.sidebar.overview')}</Link>
        <Link to="/plans"><ClipboardList aria-hidden="true" />{t('navigation.plans')}</Link>
        <Link className="active" to="/coaching"><Bot aria-hidden="true" />{t('navigation.coaching')}</Link>
        <Link to="/settings/profile"><Settings aria-hidden="true" />{t('dashboard.sidebar.settings')}</Link>
      </nav>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar coaching-topbar"><div><p className="eyebrow">{t('coachingPage.assignment.eyebrow')}</p>
        <h1>{t('coachingPage.participants.title', { defaultValue: 'Participants' })}</h1>
        <p>{t('coachingPage.participants.description', { defaultValue: 'Search assignments, check invitation status, and open participant progress.' })}</p></div>
        <Link className="secondary-button" to="/coaching">{t('coachingPage.participants.back', { defaultValue: 'Back to coaching' })}</Link>
      </header>

      <div className="admin-content coaching-content participants-content">
        {loadError && <p className="form-error panel" role="alert">{loadError}</p>}
        <section className="panel participants-toolbar" aria-label={t('coachingPage.participants.filters', { defaultValue: 'Participant filters' })}>
          <label className="participants-search"><Search aria-hidden="true" /><span className="sr-only">{t('coachingPage.participants.search', { defaultValue: 'Search participants' })}</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder={t('coachingPage.participants.search', { defaultValue: 'Search participants' })} /></label>
          <div className="participant-filters">{(['all', 'pending', 'accepted', 'rejected'] as AssignmentFilter[]).map((filter) => <button type="button" className={status === filter ? 'active' : ''} aria-pressed={status === filter} onClick={() => changeStatus(filter)} key={filter}>{filter === 'all' ? t('plansPage.list.all') : t(`coachingPage.statuses.${filter}`)}</button>)}</div>
        </section>

        <section className="assignment-section"><div className="section-heading"><div><p className="eyebrow">{t('coachingPage.assignment.sent')}</p><h2>{status === 'all' ? t('coachingPage.participants.all', { defaultValue: 'All participants' }) : t(`coachingPage.summary.${status}`, { defaultValue: t(`coachingPage.statuses.${status}`) })}</h2></div><span className="section-count">{filtered.length}</span></div>
          {displayed.length === 0 ? <div className="panel coaching-empty"><Users aria-hidden="true" /><h3>{t('coachingPage.participants.noResults', { defaultValue: 'No participants found' })}</h3><p>{t('coachingPage.participants.adjust', { defaultValue: 'Try another search or status filter.' })}</p></div> : <div className="assignment-list">{displayed.map((item) => <article className="panel assignment-card" key={item.id}>
            <span className="assignment-icon"><Users aria-hidden="true" /></span><div className="assignment-copy"><strong>{item.participant_name}</strong><span>{item.participant_email} · {item.template_title}</span></div>
            <span className={`status-badge status-${item.status}`}>{t(`coachingPage.statuses.${item.status}`, { defaultValue: item.status === 'cancelled' ? 'Cancelled' : item.status })}</span>
            {item.enrollment_id && <Link className="assignment-open icon-button" to={`/coach/enrollments/${item.enrollment_id}`}><ExternalLink aria-hidden="true" />{t('coachingPage.assignment.review')}</Link>}
          </article>)}</div>}
          {pageCount > 1 && <nav className="participants-pagination" aria-label={t('coachingPage.participants.pagination', { defaultValue: 'Participants pagination' })}><button type="button" className="secondary-button icon-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden="true" />{t('coachingPage.participants.previous', { defaultValue: 'Previous' })}</button><span>{t('coachingPage.participants.page', { defaultValue: 'Page {{page}} of {{pages}}', page: currentPage, pages: pageCount })}</span><button type="button" className="secondary-button icon-button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>{t('coachingPage.participants.next', { defaultValue: 'Next' })}<ChevronRight aria-hidden="true" /></button></nav>}
        </section>
      </div>
    </section>
  </main>
}
