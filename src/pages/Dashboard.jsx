import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell, ListChecks, CalendarClock, CalendarPlus, ClipboardList, FilePlus2, FolderOpen, Inbox, Send, UserPlus, UserCheck, Users, Video,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getMeetings, getMeetingRequests } from '../api/meetingsApi'
import { getSubmissions } from '../api/submissionsApi'
import { getPendingRegistrations, getNotifications } from '../api/authApi'
import { getDecisionActions, updateDecisionAction } from '../api/decisionActionsApi'
import { dueState, formatDue } from '../lib/actionDue'
import { createConference } from '../api/conferenceApi'
import { describeWhen, greeting, longDate } from '../lib/relativeTime'
import { useI18n } from '../i18n/LanguageContext'
import { SUBMISSION_STATUS_LABELS } from '../lib/labels'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import PageTitle from '../components/PageTitle'

const asList = (value) => (Array.isArray(value) ? value : value?.results || [])

function Card({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`dash-card ${className}`}>
      <header className="dash-card-head">
        <h2>
          {Icon && <Icon size={18} aria-hidden="true" />}
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  )
}

function CardSkeleton() {
  return (
    <div className="ui-skeleton" role="status" aria-label="Chargement…">
      <div className="ui-skeleton-row"><span className="ui-skeleton-cell" style={{ width: '55%' }} /></div>
      <div className="ui-skeleton-row"><span className="ui-skeleton-cell" style={{ width: '35%' }} /></div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const role = user?.role
  const isDoctor = role === 'MEDECIN' || role === 'MEDECIN_EXPERT'
  const isManager = role === 'ADMIN' || role === 'COORDINATEUR'

  // One state slot per card: { loading, data, error }
  const [cards, setCards] = useState({})
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    const slot = (key, promise, pick = (x) => x) => {
      setCards((c) => ({ ...c, [key]: { loading: true } }))
      promise
        .then((data) => !cancelled && setCards((c) => ({ ...c, [key]: { loading: false, data: pick(data) } })))
        .catch(() => !cancelled && setCards((c) => ({ ...c, [key]: { loading: false, error: true } })))
    }
    slot('upcoming', getMeetings({ status: 'PLANNED', ordering: 'scheduled_date', page_size: 4 }), (r) => r.meetings)
    slot('live', getMeetings({ status: 'LIVE', page_size: 3 }), (r) => r.meetings)
    slot('actions', getDecisionActions({ mine: 1, is_done: 'false' }), asList)
    slot('notifications', getNotifications(), (rows) => asList(rows).filter((n) => !n.is_read).slice(0, 4))
    if (isDoctor || role === 'ADMIN') {
      slot('cases', getSubmissions({}), asList)
    }
    if (isManager) {
      slot('requests', getMeetingRequests({ status: 'PENDING' }), asList)
    } else if (role === 'MEDECIN') {
      slot('requests', getMeetingRequests({ status: 'PENDING' }), asList)
    }
    if (role === 'ADMIN') {
      slot('registrations', getPendingRegistrations(), asList)
    }
    return () => {
      cancelled = true
    }
  }, [user, isDoctor, isManager, role])

  const firstName = user?.first_name || user?.username || ''
  const title = isDoctor && user?.first_name ? `Dr ${user.first_name}` : firstName

  const caseStats = useMemo(() => {
    const rows = cards.cases?.data || []
    const by = (s) => rows.filter((c) => c.status === s)
    return { total: rows.length, nouveau: by('NOUVEAU'), rediscuter: by('A_REDISCUTER'), cloture: by('CLOTURE') }
  }, [cards.cases])

  const completeAction = async (action) => {
    setCards((c) => ({ ...c, actions: { ...c.actions, data: c.actions.data.filter((a) => a.id !== action.id) } }))
    try {
      await updateDecisionAction(action.id, { is_done: true })
    } catch {
      setCards((c) => ({ ...c, actions: { ...c.actions, data: [...c.actions.data, action] } }))
    }
  }

  const live = cards.live?.data?.[0]
  const next = live || cards.upcoming?.data?.[0]
  const upcomingRest = (cards.upcoming?.data || []).filter((m) => m.id !== next?.id).slice(0, 3)

  const join = async (meeting) => {
    try {
      setJoining(true)
      setJoinError('')
      const conference = await createConference(meeting.id)
      navigate(`/conference/${conference.room_id}`)
    } catch (err) {
      setJoinError(err.response?.data?.detail || 'Impossible de rejoindre la visioconférence.')
    } finally {
      setJoining(false)
    }
  }

  const isToday = next && new Date(next.scheduled_date).toDateString() === new Date().toDateString()
  const canStart = next && (next.status === 'LIVE' || isToday)

  return (
    <div className="dash">
      <header className="dash-hello">
        <div>
          <p className="dash-date">{longDate(new Date(), locale)}</p>
          <PageTitle size={0} className="dash-title">
            {greeting() === 'Bonjour' ? t('greeting.morning') : t('greeting.evening')}{title ? `, ${title}` : ''}
          </PageTitle>
        </div>
        <div className="dash-actions">
          {isDoctor && (
            <>
              <Link to="/cases/new" className="ui-btn ui-btn-primary"><FilePlus2 size={16} aria-hidden="true" /> {t('dash.newCase')}</Link>
              <Link to="/patients/new" className="ui-btn ui-btn-ghost"><UserPlus size={16} aria-hidden="true" /> {t('dash.newPatient')}</Link>
              {role === 'MEDECIN' && <Link to="/meetings/request" className="ui-btn ui-btn-ghost"><Send size={16} aria-hidden="true" /> Demander une RCP</Link>}
            </>
          )}
          {isManager && <Link to="/meetings/new" className="ui-btn ui-btn-primary"><CalendarPlus size={16} aria-hidden="true" /> {t('dash.newMeeting')}</Link>}
        </div>
      </header>

      <div className="dash-grid">
        <Card
          title={live ? t('dash.liveRcp') : t('dash.nextRcp')}
          icon={CalendarClock}
          className={`dash-next ${live ? 'is-live' : ''}`}
          action={<Link to="/meetings" className="dash-link">{t('dash.allMeetings')}</Link>}
        >
          {cards.upcoming?.loading && cards.live?.loading ? (
            <CardSkeleton />
          ) : next ? (
            <div className="dash-next-body">
              <div>
                {live && <span className="dash-live"><span className="dash-live-dot" /> En direct</span>}
                <h3>{next.title || next.name || 'Réunion RCP'}</h3>
                <p className="dash-when">{describeWhen(next.scheduled_date)}</p>
                <p className="dash-meta">
                  <span>{next.total_submissions_count ?? next.submissions?.length ?? 0} dossier(s)</span>
                  <span>{next.total_participants_count ?? next.participants?.length ?? 0} participant(s)</span>
                  {next.specialty && <span>{next.specialty}</span>}
                </p>
              </div>
              <div className="dash-next-actions">
                {canStart && (
                  <button type="button" className="ui-btn ui-btn-primary" onClick={() => join(next)} disabled={joining}>
                    <Video size={16} aria-hidden="true" /> {joining ? 'Ouverture…' : next.status === 'LIVE' || !isManager ? t('dash.join') : t('dash.start')}
                  </button>
                )}
                <Link to={`/meetings/${next.id}`} className="ui-btn ui-btn-ghost"><FolderOpen size={16} aria-hidden="true" /> {t('dash.agenda')}</Link>
              </div>
              {joinError && <p className="dash-error" role="alert">{joinError}</p>}
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="Aucune réunion à venir"
              description={isManager ? 'Planifiez la prochaine RCP pour que les médecins puissent y ajouter leurs dossiers.' : 'Vous serez notifié dès qu’une réunion sera planifiée.'}
              action={isManager ? <Link to="/meetings/new" className="ui-btn ui-btn-primary"><CalendarPlus size={16} /> Nouvelle réunion</Link> : null}
            />
          )}
        </Card>

        {(isDoctor || role === 'ADMIN') && (
          <Card title={t('dash.myCases')} icon={ClipboardList} action={<Link to="/patients" className="dash-link">Mes patients</Link>}>
            {cards.cases?.loading ? (
              <CardSkeleton />
            ) : cards.cases?.error ? (
              <p className="dash-muted">Impossible de charger les dossiers.</p>
            ) : (
              <>
                <div className="dash-stats">
                  {[['nouveau', 'NOUVEAU'], ['rediscuter', 'A_REDISCUTER'], ['cloture', 'CLOTURE']].map(([key, status]) => (
                    <div key={key} className={`dash-stat is-${key}`}>
                      <strong>{caseStats[key].length}</strong>
                      <span>{SUBMISSION_STATUS_LABELS[status]}</span>
                    </div>
                  ))}
                </div>
                {caseStats.rediscuter.length > 0 ? (
                  <>
                    <h3 className="dash-subtitle">À rediscuter en priorité</h3>
                    <ul className="dash-list">
                      {caseStats.rediscuter.slice(0, 4).map((c) => (
                        <li key={c.id}>
                          <Link to={`/forms/${c.form}/submissions/${c.id}`}>
                            <span className="dash-list-main">{c.patient_name || 'Dossier'}<small>{c.form_name}</small></span>
                            <StatusBadge status={c.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : caseStats.total === 0 ? (
                  <EmptyState icon={ClipboardList} title="Aucun dossier pour le moment" description="Créez un dossier RCP pour le présenter à la prochaine réunion." />
                ) : (
                  <p className="dash-muted">Rien à rediscuter pour le moment.</p>
                )}
              </>
            )}
          </Card>
        )}

        {(isManager || role === 'MEDECIN') && cards.requests && (
          <Card
            title={isManager ? 'Demandes de RCP en attente' : 'Mes demandes en attente'}
            icon={Inbox}
            action={<Link to={isManager ? '/meetings/requests' : '/meetings/request'} className="dash-link">{isManager ? 'Traiter' : 'Nouvelle demande'}</Link>}
          >
            {cards.requests.loading ? (
              <CardSkeleton />
            ) : cards.requests.error ? (
              <p className="dash-muted">Impossible de charger les demandes.</p>
            ) : cards.requests.data.length === 0 ? (
              <p className="dash-muted">Aucune demande en attente.</p>
            ) : (
              <ul className="dash-list">
                {cards.requests.data.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link to={isManager ? '/meetings/requests' : '/meetings/request'}>
                      <span className="dash-list-main">
                        {r.doctor_name || r.doctor_details?.last_name || 'Demande'}
                        <small>{r.note || `${r.submissions?.length || 0} dossier(s)`}</small>
                      </span>
                      <span className="dash-pill">En attente</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {role === 'ADMIN' && cards.registrations && (
          <Card title="Inscriptions à valider" icon={UserCheck} action={<Link to="/users?tab=pending" className="dash-link">Voir</Link>}>
            {cards.registrations.loading ? (
              <CardSkeleton />
            ) : cards.registrations.data.length === 0 ? (
              <p className="dash-muted">Aucune inscription en attente.</p>
            ) : (
              <ul className="dash-list">
                {cards.registrations.data.slice(0, 4).map((u) => (
                  <li key={u.id}>
                    <Link to="/users?tab=pending">
                      <span className="dash-list-main">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}<small>{u.email}</small></span>
                      <Users size={16} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {(cards.actions?.data || []).length > 0 && (
          <Card title={t('dash.myActions')} icon={ListChecks}>
            <ul className="dash-list">
              {cards.actions.data.slice(0, 5).map((a) => {
                const state = dueState(a)
                return (
                  <li key={a.id} className="dash-action">
                    <input type="checkbox" checked={false} onChange={() => completeAction(a)} aria-label={`Marquer « ${a.description} » comme faite`} />
                    <span className="dash-list-main">{a.description}<small>{a.patient_name}</small></span>
                    {a.due_date && <span className={`dact-due is-${state}`}>{formatDue(a.due_date)}</span>}
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        <Card title={t('dash.upcoming')} icon={CalendarClock}>
          {cards.upcoming?.loading ? (
            <CardSkeleton />
          ) : upcomingRest.length === 0 ? (
            <p className="dash-muted">Pas d’autre réunion planifiée.</p>
          ) : (
            <ul className="dash-list">
              {upcomingRest.map((m) => (
                <li key={m.id}>
                  <Link to={`/meetings/${m.id}`}>
                    <span className="dash-list-main">{m.title || m.name || 'Réunion RCP'}<small>{describeWhen(m.scheduled_date)}</small></span>
                    <span className="dash-pill is-neutral">{m.total_submissions_count ?? m.submissions?.length ?? 0} dossier(s)</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('dash.unread')} icon={Bell}>
          {cards.notifications?.loading ? (
            <CardSkeleton />
          ) : (cards.notifications?.data || []).length === 0 ? (
            <p className="dash-muted">{t('dash.upToDate')}</p>
          ) : (
            <ul className="dash-list">
              {cards.notifications.data.map((n) => (
                <li key={n.id}>
                  <Link to={n.link || '/'}>
                    <span className="dash-list-main">{n.title}<small>{n.message}</small></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
