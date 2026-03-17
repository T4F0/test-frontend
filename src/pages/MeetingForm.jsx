import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, createMeeting, updateMeeting } from '../api/meetingsApi'
import { getMedicalCases } from '../api/medicalCasesApi'
import { getUsers } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

const STATUS_CHOICES = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'LIVE', label: 'Live' },
  { value: 'FINISHED', label: 'Finished' },
]

export default function MeetingForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = !!id

  const [form, setForm] = useState({
    medical_case: '',
    coordinator: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    status: 'PLANNED',
    meeting_link: '',
    specialty: '',
    participants: [],
  })
  const [cases, setCases] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [participantSearch, setParticipantSearch] = useState('')

  useEffect(() => {
    loadCasesAndUsers()
    if (isEdit) loadMeeting()
  }, [id])

  const formatUserName = (candidate) => {
    if (!candidate) return 'Unknown user'

    const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim()
    return fullName || candidate.username || candidate.email || 'Unknown user'
  }

  const formatUserMeta = (candidate) => {
    if (!candidate) return ''

    return [candidate.email, candidate.role, candidate.specialty].filter(Boolean).join(' • ')
  }

  const getInitials = (candidate) => {
    const source = `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim()
    if (!source) {
      return (candidate?.username || candidate?.email || '?').slice(0, 2).toUpperCase()
    }

    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  }

  const normalizedCoordinatorId = isEdit ? form.coordinator : user?.id || ''
  const usersById = useMemo(
    () => new Map(users.map((candidate) => [candidate.id, candidate])),
    [users],
  )
  const selectedParticipantIds = useMemo(() => new Set(form.participants), [form.participants])
  const coordinatorUser = useMemo(() => {
    if (!normalizedCoordinatorId) return user || null
    return usersById.get(normalizedCoordinatorId) || (user?.id === normalizedCoordinatorId ? user : null)
  }, [normalizedCoordinatorId, user, usersById])
  const selectedParticipants = useMemo(
    () => form.participants.map((participantId) => usersById.get(participantId)).filter(Boolean),
    [form.participants, usersById],
  )
  const filteredUsers = useMemo(() => {
    const query = participantSearch.trim().toLowerCase()

    return [...users]
      .filter((candidate) => {
        if (!query) return true

        return [
          formatUserName(candidate),
          candidate.email,
          candidate.username,
          candidate.role,
          candidate.specialty,
          candidate.hospital,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query))
      })
      .sort((left, right) => {
        const leftSelected = selectedParticipantIds.has(left.id)
        const rightSelected = selectedParticipantIds.has(right.id)

        if (leftSelected !== rightSelected) {
          return leftSelected ? -1 : 1
        }

        return formatUserName(left).localeCompare(formatUserName(right))
      })
  }, [participantSearch, selectedParticipantIds, users])

  const loadCasesAndUsers = async () => {
    try {
      const [casesData, usersData] = await Promise.all([
        getMedicalCases(),
        getUsers(),
      ])
      setCases(Array.isArray(casesData) ? casesData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadMeeting = async () => {
    try {
      setLoading(true)
      const data = await getMeeting(id)
      const dt = data.scheduled_date ? new Date(data.scheduled_date) : new Date()
      setForm({
        medical_case: data.medical_case || '',
        coordinator: data.coordinator?.id || data.coordinator || '',
        scheduled_date: dt.toISOString().slice(0, 10),
        scheduled_time: dt.toTimeString().slice(0, 5),
        status: data.status || 'PLANNED',
        meeting_link: data.meeting_link || '',
        specialty: data.specialty || '',
        participants: (data.participants || []).map((participant) => participant?.id || participant),
      })
    } catch (err) {
      setError('Failed to load meeting')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleParticipantToggle = (userId) => {
    setForm((f) => ({
      ...f,
      participants: f.participants.includes(userId)
        ? f.participants.filter((p) => p !== userId)
        : [...f.participants, userId],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      const scheduled_date = `${form.scheduled_date}T${form.scheduled_time}:00`
      const payload = {
        medical_case: form.medical_case || null,
        scheduled_date,
        status: form.status,
        meeting_link: form.meeting_link || null,
        specialty: form.specialty || null,
        participants: form.participants,
      }
      if (isEdit) {
        await updateMeeting(id, payload)
        navigate(`/meetings/${id}`)
      } else {
        const created = await createMeeting(payload)
        navigate(`/meetings/${created.id}`)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save meeting')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Loading meeting...</div>

  return (
    <div className="form-details">
      <h2>{isEdit ? 'Edit Meeting' : 'New Meeting'}</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="submission-form">
        <div className="form-group">
          <label>Medical case *</label>
          <select
            value={form.medical_case}
            onChange={(e) => handleChange('medical_case', e.target.value)}
            required
          >
            <option value="">Select case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.id}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Coordinator</label>
          <div className="readonly-field">
            <div className="readonly-field-title">{formatUserName(coordinatorUser || user)}</div>
            <div className="readonly-field-meta">
              {isEdit
                ? 'Coordinator assigned to this meeting'
                : 'Automatically set to the connected user creating this meeting'}
              {formatUserMeta(coordinatorUser || user) ? ` • ${formatUserMeta(coordinatorUser || user)}` : ''}
            </div>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={form.scheduled_date}
              onChange={(e) => handleChange('scheduled_date', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input
              type="time"
              value={form.scheduled_time}
              onChange={(e) => handleChange('scheduled_time', e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            {STATUS_CHOICES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Meeting link</label>
          <input
            type="url"
            value={form.meeting_link}
            onChange={(e) => handleChange('meeting_link', e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="form-group">
          <label>Specialty</label>
          <input
            type="text"
            value={form.specialty}
            onChange={(e) => handleChange('specialty', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Participants</label>
          <div className="participant-picker">
            <div className="participant-picker-toolbar">
              <div className="participant-picker-summary">
                <span>{form.participants.length} selected</span>
                <span>{filteredUsers.length} shown</span>
              </div>
              {!!form.participants.length && (
                <button
                  type="button"
                  className="btn-small btn-secondary"
                  onClick={() => handleChange('participants', [])}
                >
                  Clear selection
                </button>
              )}
            </div>

            <input
              type="search"
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              className="participant-search-input"
              placeholder="Search by name, email, role, specialty..."
            />

            <div className="selected-participants-panel">
              <div className="selected-participants-header">Selected participants</div>
              {selectedParticipants.length ? (
                <div className="selected-participants-list">
                  {selectedParticipants.map((participant) => (
                    <button
                      key={participant.id}
                      type="button"
                      className="selected-participant-chip"
                      onClick={() => handleParticipantToggle(participant.id)}
                      title={`Remove ${formatUserName(participant)}`}
                    >
                      <span className="selected-participant-avatar">{getInitials(participant)}</span>
                      <span className="selected-participant-name">{formatUserName(participant)}</span>
                      <span className="selected-participant-remove">×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-inline">No participants selected yet.</p>
              )}
            </div>

            <div className="participant-results" role="listbox" aria-label="Participants list">
              {filteredUsers.length ? (
                filteredUsers.map((candidate) => {
                  const isSelected = selectedParticipantIds.has(candidate.id)

                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      className={`participant-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleParticipantToggle(candidate.id)}
                    >
                      <span className="participant-avatar">{getInitials(candidate)}</span>
                      <span className="participant-option-text">
                        <span className="participant-option-name">{formatUserName(candidate)}</span>
                        <span className="participant-option-meta">
                          {formatUserMeta(candidate) || candidate.username || 'No additional details'}
                        </span>
                      </span>
                      <span className="participant-option-state">{isSelected ? 'Selected' : 'Add'}</span>
                    </button>
                  )
                })
              ) : (
                <p className="empty-inline">No users match your search.</p>
              )}
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
