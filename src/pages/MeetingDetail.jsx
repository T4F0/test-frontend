import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, deleteMeeting } from '../api/meetingsApi'
import { createConference, getConferenceByRoom } from '../api/conferenceApi'
import { useAuth } from '../context/AuthContext'
import { Video } from 'lucide-react'

const STATUS_LABELS = { PLANNED: 'Planned', LIVE: 'Live', FINISHED: 'Finished' }

export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creatingConference, setCreatingConference] = useState(false)

  useEffect(() => {
    loadMeeting()
  }, [id])

  const loadMeeting = async () => {
    try {
      const data = await getMeeting(id)
      setMeeting(data)
      setError(null)
    } catch (err) {
      setError('Failed to load meeting')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this meeting?')) return
    try {
      await deleteMeeting(id)
      navigate('/meetings')
    } catch (err) {
      setError('Failed to delete meeting')
    }
  }

  const handleStartConference = async () => {
    try {
      setCreatingConference(true)
      const conference = await createConference(id)
      navigate(`/conference/${conference.room_id}`)
    } catch (err) {
      // If conference already exists, try to find it
      if (err.response?.status === 400) {
        setError('A conference already exists for this meeting. Check below for the join link.')
      } else {
        setError(err.response?.data?.detail || 'Failed to create conference')
      }
    } finally {
      setCreatingConference(false)
    }
  }

  const handleJoinConference = () => {
    if (meeting?.meeting_link) {
      // If meeting_link contains a room_id, extract and navigate
      const roomMatch = meeting.meeting_link.match(/conference\/([^/?]+)/)
      if (roomMatch) {
        navigate(`/conference/${roomMatch[1]}`)
        return
      }
    }
    // Try to create/join conference
    handleStartConference()
  }

  if (loading) return <div className="loading">Loading meeting...</div>
  if (error && !meeting) return <div className="error">{error}</div>
  if (!meeting) return <div className="error">Meeting not found</div>

  return (
    <div className="detail-card">
      <div className="detail-header">
        <h1>Meeting</h1>
        <div className="detail-actions">
          {meeting.status !== 'FINISHED' && (
            <button
              className="btn-primary"
              onClick={handleJoinConference}
              disabled={creatingConference}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <Video size={18} />
              {creatingConference ? 'Starting...' : meeting.status === 'LIVE' ? 'Join Conference' : 'Start Conference'}
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate(`/meetings/${id}/edit`)}>Edit</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
          <button className="btn-secondary" onClick={() => navigate('/meetings')}>Back to list</button>
        </div>
      </div>
      {error && <div className="error" style={{ margin: '1rem 0' }}>{error}</div>}
      <div className="detail-section">
        <div className="detail-grid">
          <div className="detail-item">
            <label>Scheduled</label>
            <p>{new Date(meeting.scheduled_date).toLocaleString()}</p>
          </div>
          <div className="detail-item">
            <label>Status</label>
            <p><span className="badge">{STATUS_LABELS[meeting.status] ?? meeting.status}</span></p>
          </div>
          <div className="detail-item">
            <label>Medical case</label>
            <p>{meeting.medical_case ?? '—'}</p>
          </div>
          <div className="detail-item">
            <label>Specialty</label>
            <p>{meeting.specialty || '—'}</p>
          </div>
          <div className="detail-item">
            <label>Meeting link</label>
            <p>
              {meeting.meeting_link ? (
                <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">{meeting.meeting_link}</a>
              ) : '—'}
            </p>
          </div>
          <div className="detail-item">
            <label>Coordinator</label>
            <p>{meeting.coordinator ? String(meeting.coordinator) : '—'}</p>
          </div>
          <div className="detail-item">
            <label>Participants</label>
            <p>{meeting.participants?.length ? meeting.participants.join(', ') : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
