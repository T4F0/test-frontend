import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMeetings, deleteMeeting } from '../api/meetingsApi'
import { createConference } from '../api/conferenceApi'
import { useAuth } from '../context/AuthContext'
import { Video, Calendar, Clock, Users, ArrowRight } from 'lucide-react'
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
          {user?.role !== 'MEDECIN' && (
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
            {meetings.map((m) => (
              <tr key={m.id}>
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
                  {m.status !== 'FINISHED' && (
                    <button 
                      className="btn-small btn-primary btn-with-icon" 
                      onClick={() => handleQuickJoin(m.id)}
                      disabled={joiningId === m.id}
                      style={{ padding: '0.4rem 0.8rem' }}
                    >
                      <Video size={14} />
                      {joiningId === m.id ? 'Ouverture...' : (m.status === 'LIVE' ? 'Rejoindre' : 'Démarrer')}
                    </button>
                  )}
                </td>
                <td className="actions">
                  <div className="action-group-horizontal">
                    <button className="btn-small btn-secondary" onClick={() => navigate(`/meetings/${m.id}`)}>Gérer</button>
                    {user?.role !== 'MEDECIN' && (
                      <>
                        <button className="btn-small btn-outline" onClick={() => navigate(`/meetings/${m.id}/edit`)}>Modifier</button>
                        <button className="btn-small btn-danger" onClick={() => handleDelete(m.id)}>×</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
