import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, deleteMeeting, getSubmissionResume } from '../api/meetingsApi'
import { createConference } from '../api/conferenceApi'
import { Video, FileText, User, Calendar, Activity, ChevronDown, ChevronUp, AlertCircle, ClipboardList } from 'lucide-react'

const STATUS_LABELS = { PLANNED: 'Planifiée', LIVE: 'En cours', FINISHED: 'Terminée' }
const GENDER_LABELS = { M: 'Homme', F: 'Femme', O: 'Autre' }

export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creatingConference, setCreatingConference] = useState(false)
  const [submissionResume, setSubmissionResume] = useState(null)
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
      if (data.submissions?.length > 0) {
        loadResume(data.submissions[0])
      }
    } catch (err) {
      setError('Échec du chargement de la réunion')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadResume = async (submissionId) => {
    try {
      setResumeLoading(true)
      setResumeError(null)
      const data = await getSubmissionResume(id, submissionId)
      setSubmissionResume(data)
      const expanded = {}
      data.forms?.forEach((_, idx) => { expanded[idx] = true })
      setExpandedForms(expanded)
    } catch (err) {
      console.error('Failed to load resume:', err)
      setResumeError('Aucune donnée de formulaire disponible pour ce dossier.')
      setSubmissionResume(null)
    } finally {
      setResumeLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette réunion ?')) return
    try {
      await deleteMeeting(id)
      navigate('/meetings')
    } catch (err) {
      setError('Échec de la suppression de la réunion')
    }
  }

  const handleJoinConference = async () => {
    try {
      setCreatingConference(true)
      const conference = await createConference(id)
      navigate(`/conference/${conference.room_id}`)
    } catch (err) {
      if (err.response?.status === 400) {
        // Find existing room id if possible
        if (meeting?.meeting_link) {
          const roomMatch = meeting.meeting_link.match(/conference\/([^/?]+)/)
          if (roomMatch) {
            navigate(`/conference/${roomMatch[1]}`)
            return
          }
        }
        setError('Une conférence existe déjà pour cette réunion.')
      } else {
        setError(err.response?.data?.detail || 'Échec de la création de la conférence')
      }
    } finally {
      setCreatingConference(false)
    }
  }

  const toggleForm = (idx) => {
    setExpandedForms(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const formatValue = (value, fieldType) => {
    if (value === null || value === undefined || value === '') return '—'
    if (fieldType === 'checkbox') return value ? '✓ Oui' : '✗ Non'
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

  if (loading) return <div className="loading">Chargement...</div>
  if (error && !meeting) return <div className="error">{error}</div>
  if (!meeting) return <div className="error">Réunion introuvable</div>

  return (
    <div className="meeting-detail-container">
      <div className="detail-header">
        <h1>📅 {meeting.title || 'Détails de la réunion RCP'}</h1>
        <div className="detail-actions">
          {meeting.status !== 'FINISHED' && (
            <button className="btn-primary btn-with-icon" onClick={handleJoinConference} disabled={creatingConference}>
              <Video size={18} />
              {creatingConference ? 'Ouverture...' : 'Rejoindre la visio'}
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate(`/meetings/${id}/edit`)}>Modifier</button>
          <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
          <button className="btn-secondary" onClick={() => navigate('/meetings')}>Retour</button>
        </div>
      </div>

      <div className="detail-grid-layout">
        <div className="detail-card info-card">
          <h2>Informations générales</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Planifiée le</label>
              <p>{new Date(meeting.scheduled_date).toLocaleString()}</p>
            </div>
            <div className="detail-item">
              <label>Statut</label>
              <p><span className={`status-badge ${meeting.status.toLowerCase()}`}>{STATUS_LABELS[meeting.status] ?? meeting.status}</span></p>
            </div>
            <div className="detail-item">
              <label>Coordinateur</label>
              <p>{formatUserName(meeting.coordinator_details)}</p>
            </div>
          </div>
          <div className="detail-section" style={{marginTop: '1.5rem'}}>
            <label>Participants ({meeting.participant_details?.length || 0})</label>
            <p className="participants-list">
              {meeting.participant_details?.length
                ? meeting.participant_details.map((p) => formatUserName(p)).join(', ')
                : 'Aucun participant invité'}
            </p>
          </div>
        </div>

        <div className="detail-card dossiers-card">
          <h2>📑 Dossiers à l'ordre du jour ({meeting.submission_details?.length || 0})</h2>
          {meeting.submission_details?.length > 0 ? (
            <div className="submissions-mini-list">
              {meeting.submission_details.map(sub => (
                <div 
                  key={sub.id} 
                  className={`sub-item-link ${submissionResume?.submission_id === sub.id ? 'active' : ''}`}
                  onClick={() => loadResume(sub.id)}
                >
                  <div className="sub-item-info">
                    <div className="sub-item-patient">{sub.patient_name}</div>
                    <div className="sub-item-name">{sub.name || sub.form_name}</div>
                  </div>
                  <ChevronDown size={16} />
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">Aucun dossier lié à cette réunion.</p>
          )}
        </div>
      </div>

      {/* === CLINICAL RESUME SECTION === */}
      <div className="case-resume-section">
        <div className="case-resume-header">
          <div className="case-resume-title-block">
            <ClipboardList size={22} className="case-resume-icon" />
            <div>
              <h2 className="case-resume-title">Résumé Clinique : {submissionResume?.patient?.first_name} {submissionResume?.patient?.last_name}</h2>
              <p className="case-resume-subtitle">Données extraites des formulaires pour la discussion RCP</p>
            </div>
          </div>
        </div>

        {resumeLoading ? (
          <div className="case-resume-loading">
            <div className="case-resume-spinner" />
            <span>Chargement des données...</span>
          </div>
        ) : resumeError ? (
          <div className="case-resume-empty">
            <AlertCircle size={32} />
            <p>{resumeError}</p>
          </div>
        ) : submissionResume ? (
          <div className="resume-content">
             <div className="case-resume-patient-meta">
                  <span className="case-resume-meta-item">
                    <Calendar size={14} />
                    {new Date(submissionResume.patient.birth_date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="case-resume-meta-item">
                    {GENDER_LABELS[submissionResume.patient.gender] || submissionResume.patient.gender}
                  </span>
                  {submissionResume.submission_status && (
                    <span className="badge badge-neutral">
                      {submissionResume.submission_status}
                    </span>
                  )}
            </div>

            <div className="case-resume-forms">
              {submissionResume.forms?.map((form, idx) => {
                const sectionGroups = groupFieldsBySection(form.fields)
                const isExpanded = expandedForms[idx]

                return (
                  <div key={idx} className="case-resume-form-card">
                    <button type="button" className="case-resume-form-header" onClick={() => toggleForm(idx)}>
                      <div className="case-resume-form-header-left">
                        <FileText size={18} className="case-resume-form-icon" />
                        <div>
                          <h4 className="case-resume-form-name">{form.submission_name || form.form_name}</h4>
                          <span className="case-resume-form-date">Soumis le {new Date(form.submitted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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
          </div>
        ) : null}
      </div>
    </div>
  )
}
