import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, createMeeting, updateMeeting } from '../api/meetingsApi'
import { getMedicalCases } from '../api/medicalCasesApi'
import { getUsers } from '../api/authApi'

const STATUS_CHOICES = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'LIVE', label: 'Live' },
  { value: 'FINISHED', label: 'Finished' },
]

export default function MeetingForm() {
  const { id } = useParams()
  const navigate = useNavigate()
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

  useEffect(() => {
    loadCasesAndUsers()
    if (isEdit) loadMeeting()
  }, [id])

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
        coordinator: data.coordinator || '',
        scheduled_date: dt.toISOString().slice(0, 10),
        scheduled_time: dt.toTimeString().slice(0, 5),
        status: data.status || 'PLANNED',
        meeting_link: data.meeting_link || '',
        specialty: data.specialty || '',
        participants: data.participants || [],
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
        coordinator: form.coordinator || null,
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
          <select
            value={form.coordinator}
            onChange={(e) => handleChange('coordinator', e.target.value)}
          >
            <option value="">—</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
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
          <div className="checkbox-group">
            {users.map((u) => (
              <label key={u.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.participants.includes(u.id)}
                  onChange={() => handleParticipantToggle(u.id)}
                />
                {u.first_name} {u.last_name}
              </label>
            ))}
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
