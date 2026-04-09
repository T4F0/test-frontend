import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, createMeeting, updateMeeting } from '../api/meetingsApi'
import { getMedicalCases } from '../api/medicalCasesApi'
import { getPatients } from '../api/patientsApi'
import { getUsers } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import SearchableSelect from '../components/SearchableSelect'

export default function MeetingForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = !!id

  useEffect(() => {
    // Restrict access for Medecins - they cannot create or edit meetings
    if (user && user.role === 'MEDECIN') {
      navigate('/meetings')
    }
  }, [user, navigate])

  const [form, setForm] = useState({
    medical_case: '',
    coordinator: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    meeting_link: '',
    specialty: '',
    participants: [],
  })
  const [cases, setCases] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [participantSearch, setParticipantSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientsLoading, setPatientsLoading] = useState(false)

  useEffect(() => {
    if (id) loadMeeting()
  }, [id])

  useEffect(() => {
    loadUsersAndCases()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(patientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

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

  const loadUsersAndCases = async () => {
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

  const loadPatients = async (query = '') => {
    try {
      setPatientsLoading(true)
      const data = await getPatients(1, query)
      const patientsData = Array.isArray(data) ? data : []
      const sortedPatients = [...patientsData].sort((a, b) => 
            `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`)
          )
      setPatients(sortedPatients)
    } catch (e) {
      console.error(e)
    } finally {
      setPatientsLoading(false)
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

  // Set selected patient when form.medical_case changes (useful for loading existing meeting)
  useEffect(() => {
    if (form.medical_case && cases.length > 0 && !selectedPatientId) {
      const selectedCase = cases.find((c) => c.id === form.medical_case)
      if (selectedCase) {
        setSelectedPatientId(selectedCase.patient)
      }
    }
  }, [form.medical_case, cases, selectedPatientId])

  const filteredCases = useMemo(() => {
    if (!selectedPatientId) return []
    return cases.filter((c) => c.patient === selectedPatientId)
  }, [cases, selectedPatientId])

  const handlePatientChange = (patientId) => {
    setSelectedPatientId(patientId)
    // Clear case if it doesn't belong to the patient
    if (form.medical_case) {
      const currentCase = cases.find(c => c.id === form.medical_case)
      if (currentCase && currentCase.patient !== patientId) {
        setForm(f => ({ ...f, medical_case: '' }))
      }
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
        <SearchableSelect 
          label="Patient"
          placeholder="Search patient by name..."
          options={patients.map(p => ({
            value: p.id,
            label: `${p.first_name} ${p.last_name}`,
            subLabel: p.anonymized_code ? `Code: ${p.anonymized_code}` : `DOB: ${new Date(p.birth_date).toLocaleDateString()}`
          }))}
          value={selectedPatientId}
          onChange={handlePatientChange}
          onSearch={setPatientSearch}
          loading={patientsLoading}
          required
        />
        <div className="form-group">
          <label>Medical case *</label>
          <select
            value={form.medical_case}
            onChange={(e) => handleChange('medical_case', e.target.value)}
            required
            disabled={!selectedPatientId}
          >
            <option value="">{selectedPatientId ? 'Select case' : 'Select patient first'}</option>
            {filteredCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || `Case ${c.id.slice(0, 8)}...`} ({c.status})
              </option>
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
          <label>Meeting link</label>
          <div className="readonly-field">
            <div className="readonly-field-title">{form.meeting_link || 'Generated automatically after saving the meeting'}</div>
            <div className="readonly-field-meta">The join link is permanent and managed by the platform.</div>
          </div>
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
