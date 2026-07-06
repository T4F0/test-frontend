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

  useEffect(() => {
    loadMeetings()
  }, [filter, filterSubmission])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const params = { 
        ...(filter && { status: filter }), 
        ...(filterSubmission && { submission: filterSubmission }) 
      }
      const data = await getMeetings(params)
      setMeetings(Array.isArray(data) ? data : [])
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
        <div className="table-responsive-wrapper">
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
      )}
    </div>
  )
}

