import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMeetings, deleteMeeting, joinMeeting, askToJoinMeeting } from '../api/meetingsApi'
import { createConference } from '../api/conferenceApi'
import { useAuth } from '../context/AuthContext'
import { Video, Calendar, Clock, Users, ArrowRight, Loader } from 'lucide-react'
import { formatDate, formatDateTime } from '../lib/dateUtils'

const STATUS_LABELS = { PLANNED: 'Planifiée', LIVE: 'En cours', FINISHED: 'Terminée' }

export default function MeetingsList() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [searchParams] = useSearchParams()
  const filterSubmission = searchParams.get('submission') || ''
  const navigate = useNavigate()
  const { user } = useAuth()
  const [joiningId, setJoiningId] = useState(null)
  // Track ask-to-join request state per meeting: { [meetingId]: 'loading' | 'sent' | null }
  const [askJoinState, setAskJoinState] = useState({})

  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [filter, filterSubmission])

  useEffect(() => {
    loadMeetings()
  }, [filter, filterSubmission, page])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const params = { 
        ...(filter && { status: filter }), 
        ...(filterSubmission && { submission: filterSubmission }) 
      }
      if (page > 1) params.page = page
      const data = await getMeetings(params)
      setMeetings(Array.isArray(data.meetings) ? data.meetings : [])
      setHasNext(data.hasNext)
      setHasPrev(data.hasPrev)
      setError(null)
    } catch (err) {
      setError('Échec du chargement des réunions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickJoin = async (meetingId) => {
    try {
      setJoiningId(meetingId)
      const conference = await createConference(meetingId)
      navigate(`/conference/${conference.room_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Échec de l\'accès à la visio')
      console.error(err)
    } finally {
      setJoiningId(null)
    }
  }

  const handleJoin = async (meetingId) => {
    try {
      await joinMeeting(meetingId)
      loadMeetings()
    } catch (err) {
      setError('Échec de l\'inscription à la réunion')
    }
  }

  const handleAskToJoin = async (meeting) => {
    if (askJoinState[meeting.id] === 'loading' || askJoinState[meeting.id] === 'sent') return
    try {
      setAskJoinState(prev => ({ ...prev, [meeting.id]: 'loading' }))
      const result = await askToJoinMeeting(meeting.id)

      if (result.status === 'already_participant' || result.status === 'accepted') {
        // They're already in — navigate to the conference
        if (meeting.conference_room_id) {
          navigate(`/conference/${meeting.conference_room_id}`)
        } else {
          // fallback: try createConference
          const conference = await createConference(meeting.id)
          navigate(`/conference/${conference.room_id}`)
        }
      } else {
        // Request sent — show waiting state and navigate to the conference lobby
        setAskJoinState(prev => ({ ...prev, [meeting.id]: 'sent' }))
        if (meeting.conference_room_id) {
          navigate(`/conference/${meeting.conference_room_id}`)
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Échec de la demande pour rejoindre')
      setAskJoinState(prev => ({ ...prev, [meeting.id]: null }))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette réunion ?')) return
    try {
      await deleteMeeting(id)
      setMeetings(meetings.filter((m) => m.id !== id))
    } catch (err) {
      setError('Échec de la suppression de la réunion')
    }
  }

  if (loading) return <div className="loading">Chargement des réunions...</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>📅 Réunions RCP</h1>
        <div className="list-header-actions">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les statuts</option>
            <option value="PLANNED">Planifiée</option>
            <option value="LIVE">En cours</option>
            <option value="FINISHED">Terminée</option>
          </select>
          {!['MEDECIN', 'MEDECIN_EXPERT'].includes(user?.role) && (
            <button className="btn-primary" onClick={() => navigate('/meetings/new')}>
              + Nouvelle réunion
            </button>
          )}
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {meetings.length === 0 ? (
        <div className="empty-inline-card">
          <p>Aucune réunion trouvée.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive-wrapper meetings-table-wrapper">
            <table className="forms-table">
            <thead>
              <tr>
                <th>Date & Heure</th>
                <th>Dossiers / Soumissions</th>
                <th>Statut</th>
                <th>Visioconférence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => {
                const isParticipant = m.participants?.some(pId => (pId.id || pId) === user?.id)
                const isCoordinatorOrAdmin = user?.id === (m.coordinator_details?.id || m.coordinator) || user?.role === 'ADMIN'

                return (
                  <tr 
                    key={m.id}
                    onClick={(e) => {
                      if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('input') && !e.target.closest('select')) {
                        navigate(`/meetings/${m.id}`);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    className="hover-row-highlight"
                  >
                    <td>
                      <strong>{m.title || formatDate(m.scheduled_date)}</strong>
                      <div className="text-muted" style={{fontSize: '0.8rem'}}>
                        {formatDateTime(m.scheduled_date)}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {m.submissions?.length || 0} dossier(s)
                      </span>
                    </td>
                    <td><span className={`status-badge ${m.status.toLowerCase()}`}>{STATUS_LABELS[m.status] ?? m.status}</span></td>
                    <td>
                      {m.status !== 'FINISHED' && (() => {
                        const isToday = new Date(m.scheduled_date).toDateString() === new Date().toDateString()

                        // Non-participant viewing a LIVE meeting → "Ask to Join"
                        if (m.status === 'LIVE' && !isParticipant && !isCoordinatorOrAdmin) {
                          const state = askJoinState[m.id]
                          const isLoading = state === 'loading'
                          const isSent = state === 'sent'
                          return (
                            <button
                              className="btn-small btn-primary btn-with-icon"
                              onClick={() => handleAskToJoin(m)}
                              disabled={isLoading || isSent}
                              title={isSent ? 'Demande envoyée, en attente de l\'hôte' : 'Demander à rejoindre cette réunion'}
                              style={{ padding: '0.4rem 0.8rem' }}
                              id={`ask-join-${m.id}`}
                            >
                              <Video size={14} />
                              {isLoading ? 'Envoi...' : isSent ? '⏳ En attente...' : 'Demander à rejoindre'}
                            </button>
                          )
                        }

                        // Standard join/start button
                        const buttonText = isCoordinatorOrAdmin ? 'Démarrer' : 'Rejoindre'
                        let disableReason = ""
                        if (!isToday) {
                          disableReason = "La réunion n'est accessible que le jour prévu"
                        } else if (!isCoordinatorOrAdmin && m.status !== 'LIVE') {
                          disableReason = "La réunion n'a pas encore commencé"
                        }
                        const isDisabled = joiningId === m.id || disableReason !== ""

                        return (
                          <button 
                            className="btn-small btn-primary btn-with-icon" 
                            onClick={() => handleQuickJoin(m.id)}
                            disabled={isDisabled}
                            title={disableReason}
                            style={{ padding: '0.4rem 0.8rem' }}
                            id={`join-${m.id}`}
                          >
                            <Video size={14} />
                            {joiningId === m.id ? 'Ouverture...' : buttonText}
                          </button>
                        )
                      })()}
                    </td>
                    <td className="actions">
                      <div className="action-group-horizontal">
                        <button className="btn-small btn-secondary" onClick={() => navigate(`/meetings/${m.id}`)}>Gérer</button>
                        {!['MEDECIN', 'MEDECIN_EXPERT'].includes(user?.role) && (
                          <>
                            <button className="btn-small btn-outline" onClick={() => navigate(`/meetings/${m.id}/edit`)}>Modifier</button>
                            <button className="btn-small btn-danger" onClick={() => handleDelete(m.id)}>×</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mobile-cards">
          {meetings.map((m) => {
            const isParticipant = m.participants?.some(pId => (pId.id || pId) === user?.id)
            const isCoordinatorOrAdmin = user?.id === (m.coordinator_details?.id || m.coordinator) || user?.role === 'ADMIN'
            const isToday = new Date(m.scheduled_date).toDateString() === new Date().toDateString()

            return (
              <div key={m.id} className="mobile-card" onClick={() => navigate(`/meetings/${m.id}`)}>
                <div className="mobile-card-header">
                  <div className="mobile-card-title">
                    <strong>{m.title || formatDate(m.scheduled_date)}</strong>
                    <div className="text-muted" style={{fontSize: '0.8rem'}}>
                      {formatDateTime(m.scheduled_date)}
                    </div>
                  </div>
                  <span className={`status-badge ${m.status.toLowerCase()}`}>{STATUS_LABELS[m.status] ?? m.status}</span>
                </div>
                <div className="mobile-card-body">
                  <span className="badge badge-neutral">
                    {m.submissions?.length || 0} dossier(s)
                  </span>
                </div>
                <div className="mobile-card-actions">
                  <div className="mobile-card-visio">
                    {m.status !== 'FINISHED' && (() => {
                      if (m.status === 'LIVE' && !isParticipant && !isCoordinatorOrAdmin) {
                        const state = askJoinState[m.id]
                        return (
                          <button
                            className="btn-small btn-primary btn-with-icon"
                            onClick={(e) => { e.stopPropagation(); handleAskToJoin(m); }}
                            disabled={state === 'loading' || state === 'sent'}
                            style={{ padding: '0.4rem 0.8rem' }}
                          >
                            <Video size={14} />
                            {state === 'loading' ? 'Envoi...' : state === 'sent' ? '⏳ En attente' : 'Demander à rejoindre'}
                          </button>
                        )
                      }
                      const buttonText = isCoordinatorOrAdmin ? 'Démarrer' : 'Rejoindre'
                      let disableReason = !isToday ? "Pas accessible aujourd'hui" : (!isCoordinatorOrAdmin && m.status !== 'LIVE') ? "Pas encore commencé" : ""
                      return (
                        <button 
                          className="btn-small btn-primary btn-with-icon" 
                          onClick={(e) => { e.stopPropagation(); handleQuickJoin(m.id); }}
                          disabled={joiningId === m.id || disableReason !== ""}
                          title={disableReason}
                          style={{ padding: '0.4rem 0.8rem' }}
                        >
                          <Video size={14} />
                          {joiningId === m.id ? 'Ouverture...' : buttonText}
                        </button>
                      )
                    })()}
                  </div>
                  <div className="action-group-horizontal">
                    <button className="btn-small btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${m.id}`); }}>Gérer</button>
                    {!['MEDECIN', 'MEDECIN_EXPERT'].includes(user?.role) && (
                      <>
                        <button className="btn-small btn-outline" onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${m.id}/edit`); }}>Modifier</button>
                        <button className="btn-small btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}>×</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        </>
      )}
      {meetings.length > 0 && (
        <div className="pagination-controls" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center', alignItems: 'center' }}>
          <button 
            className="btn-secondary" 
            disabled={!hasPrev || loading} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: (!hasPrev || loading) ? 'not-allowed' : 'pointer', opacity: (!hasPrev || loading) ? 0.6 : 1 }}
          >
            ← Page Précédente
          </button>
          <span style={{ fontWeight: 500, color: '#475569', minWidth: '80px', textAlign: 'center', fontSize: '0.95rem' }}>Page {page}</span>
          <button 
            className="btn-secondary" 
            disabled={!hasNext || loading} 
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: (!hasNext || loading) ? 'not-allowed' : 'pointer', opacity: (!hasNext || loading) ? 0.6 : 1 }}
          >
            Page Suivante →
          </button>
        </div>
      )}
    </div>
  )
}

