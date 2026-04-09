import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, deleteMeeting, getCaseResume } from '../api/meetingsApi'
import { createConference } from '../api/conferenceApi'
import { Video, FileText, User, Calendar, Activity, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

const STATUS_LABELS = { PLANNED: 'Planned', LIVE: 'Live', FINISHED: 'Finished' }
const GENDER_LABELS = { M: 'Male', F: 'Female', O: 'Other' }

export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creatingConference, setCreatingConference] = useState(false)
  const [caseResume, setCaseResume] = useState(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState(null)
  const [expandedForms, setExpandedForms] = useState({})

  const formatUserName = (candidate) => {
    if (!candidate) return '—'
    const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim()
    return fullName || candidate.username || candidate.email || '—'
  }

  useEffect(() => {
    loadMeeting()
  }, [id])

  const loadMeeting = async () => {
    try {
      const data = await getMeeting(id)
      setMeeting(data)
      setError(null)
      loadCaseResume()
    } catch (err) {
      setError('Failed to load meeting')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadCaseResume = async () => {
    try {
      setResumeLoading(true)
      setResumeError(null)
      const data = await getCaseResume(id)
      setCaseResume(data)
      // Auto-expand all forms by default
      const expanded = {}
      data.forms?.forEach((_, idx) => { expanded[idx] = true })
      setExpandedForms(expanded)
    } catch (err) {
      console.error('Failed to load case resume:', err)
      setResumeError('No form data available for this case.')
    } finally {
      setResumeLoading(false)
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

  const toggleForm = (idx) => {
    setExpandedForms(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const formatValue = (value, fieldType) => {
    if (value === null || value === undefined || value === '') return '—'
    if (fieldType === 'checkbox') return value ? '✓ Yes' : '✗ No'
    if (fieldType === 'date') {
      try { return new Date(value).toLocaleDateString('fr-FR') } catch { return value }
    }
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  const groupFieldsBySection = (fields) => {
    const groups = {}
    fields.forEach(field => {
      const sectionKey = field.parent_section_name
        ? `${field.parent_section_name} › ${field.section_name}`
        : field.section_name
      if (!groups[sectionKey]) groups[sectionKey] = []
      groups[sectionKey].push(field)
    })
    return groups
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
              {creatingConference ? 'Opening...' : 'Open Meeting Room'}
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
            <p>{formatUserName(meeting.coordinator_details)}</p>
          </div>
          <div className="detail-item">
            <label>Participants</label>
            <p>
              {meeting.participant_details?.length
                ? meeting.participant_details.map((participant) => formatUserName(participant)).join(', ')
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* === CASE RESUME SECTION === */}
      <div className="case-resume-section">
        <div className="case-resume-header">
          <div className="case-resume-title-block">
            <FileText size={22} className="case-resume-icon" />
            <div>
              <h2 className="case-resume-title">Case Resume</h2>
              <p className="case-resume-subtitle">Key medical information for the RCP discussion</p>
            </div>
          </div>
        </div>

        {resumeLoading && (
          <div className="case-resume-loading">
            <div className="case-resume-spinner" />
            <span>Loading case resume...</span>
          </div>
        )}

        {resumeError && !caseResume && (
          <div className="case-resume-empty">
            <AlertCircle size={32} />
            <p>{resumeError}</p>
          </div>
        )}

        {caseResume && (
          <>
            {/* Patient Info Card */}
            <div className="case-resume-patient-card">
              <div className="case-resume-patient-avatar">
                <User size={24} />
              </div>
              <div className="case-resume-patient-info">
                <h3 className="case-resume-patient-name">
                  {caseResume.patient.first_name} {caseResume.patient.last_name}
                </h3>
                <div className="case-resume-patient-meta">
                  <span className="case-resume-meta-item">
                    <Calendar size={14} />
                    {new Date(caseResume.patient.birth_date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="case-resume-meta-item">
                    {GENDER_LABELS[caseResume.patient.gender] || caseResume.patient.gender}
                  </span>
                  <span className={`badge badge-${caseResume.medical_case_status === 'DRAFT' ? 'warning' : caseResume.medical_case_status === 'CLOSED' ? 'danger' : 'success'}`}>
                    {caseResume.medical_case_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Submissions */}
            {caseResume.forms?.length > 0 ? (
              <div className="case-resume-forms">
                {caseResume.forms.map((form, idx) => {
                  const sectionGroups = groupFieldsBySection(form.fields)
                  const isExpanded = expandedForms[idx]

                  return (
                    <div key={idx} className="case-resume-form-card">
                      <button
                        type="button"
                        className="case-resume-form-header"
                        onClick={() => toggleForm(idx)}
                      >
                        <div className="case-resume-form-header-left">
                          <FileText size={18} className="case-resume-form-icon" />
                          <div>
                            <h4 className="case-resume-form-name">{form.form_name}</h4>
                            <span className="case-resume-form-date">
                              Submitted {new Date(form.submitted_at).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="case-resume-form-toggle">
                          <span className="case-resume-field-count">{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</span>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="case-resume-form-body">
                          {Object.entries(sectionGroups).map(([sectionName, fields]) => (
                            <div key={sectionName} className="case-resume-section-group">
                              <div className="case-resume-section-label">
                                <Activity size={14} />
                                <span>{sectionName}</span>
                              </div>
                              <div className="case-resume-fields-grid">
                                {fields.map((field, fIdx) => (
                                  <div key={fIdx} className="case-resume-field">
                                    <div className="case-resume-field-label">{field.field_name}</div>
                                    <div className={`case-resume-field-value ${!field.value && field.value !== false ? 'empty' : ''}`}>
                                      {formatValue(field.value, field.field_type)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="case-resume-empty">
                <FileText size={32} />
                <p>No form submissions with RDV fields found for this patient.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
