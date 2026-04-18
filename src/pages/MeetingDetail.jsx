import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, deleteMeeting, getCaseResume } from '../api/meetingsApi'
import { createConference } from '../api/conferenceApi'
import { Video, FileText, User, Calendar, Activity, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

const STATUS_LABELS = { PLANNED: 'Planifiée', LIVE: 'En cours', FINISHED: 'Terminée' }
const GENDER_LABELS = { M: 'Homme', F: 'Femme', O: 'Autre' }

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
      setError('Échec du chargement de la réunion')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadCaseResume = async (caseId = null) => {
    try {
      setResumeLoading(true)
      setResumeError(null)
      const data = await getCaseResume(id, caseId)
      setCaseResume(data)
      // Auto-expand all forms by default
      const expanded = {}
      data.forms?.forEach((_, idx) => { expanded[idx] = true })
      setExpandedForms(expanded)
    } catch (err) {
      console.error('Failed to load case resume:', err)
      setResumeError('Aucune donnée de formulaire disponible pour ce dossier.')
      setCaseResume(null)
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

  const handleStartConference = async () => {
    try {
      setCreatingConference(true)
      const conference = await createConference(id)
      navigate(`/conference/${conference.room_id}`)
    } catch (err) {
      // If conference already exists, try to find it
      if (err.response?.status === 400) {
        setError('Une conférence existe déjà pour cette réunion. Vérifiez le lien ci-dessous.')
      } else {
        setError(err.response?.data?.detail || 'Échec de la création de la conférence')
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

  if (loading) return <div className="loading">Chargement de la réunion...</div>
  if (error && !meeting) return <div className="error">{error}</div>
  if (!meeting) return <div className="error">Réunion introuvable</div>

  return (
    <div className="detail-card">
      <div className="detail-header">
        <h1>Réunion</h1>
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
              {creatingConference ? 'Ouverture...' : 'Ouvrir la salle de réunion'}
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate(`/meetings/${id}/edit`)}>Modifier</button>
          <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
          <button className="btn-secondary" onClick={() => navigate('/meetings')}>Retour à la liste</button>
        </div>
      </div>
      {error && <div className="error" style={{ margin: '1rem 0' }}>{error}</div>}
      <div className="detail-section">
        <div className="detail-grid">
          <div className="detail-item">
            <label>Planifiée le</label>
            <p>{new Date(meeting.scheduled_date).toLocaleString()}</p>
          </div>
          <div className="detail-item">
            <label>Statut</label>
            <p><span className="badge">{STATUS_LABELS[meeting.status] ?? meeting.status}</span></p>
          </div>
          <div className="detail-item" style={{ gridColumn: 'span 2' }}>
            <label>Dossiers médicaux discutés ({meeting.medical_cases?.length || 0})</label>
            {meeting.medical_cases?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {meeting.medical_cases.map(caseId => (
                  <span key={caseId} className="badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                    {caseId}
                  </span>
                ))}
              </div>
            ) : (
              <p>—</p>
            )}
          </div>
          <div className="detail-item">
            <label>Spécialité</label>
            <p>{meeting.specialty || '—'}</p>
          </div>
          <div className="detail-item">
            <label>Lien de réunion</label>
            <p>
              {meeting.meeting_link ? (
                <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">{meeting.meeting_link}</a>
              ) : '—'}
            </p>
          </div>
          <div className="detail-item">
            <label>Coordinateur</label>
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

      <div style={{ padding: '0 2rem 1rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>Voir le résumé du dossier :</label>
        <select 
          value={caseResume?.medical_case_id || ''} 
          onChange={(e) => loadCaseResume(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '400px' }}
        >
          {meeting.medical_cases?.map(caseId => (
            <option key={caseId} value={caseId}>Dossier {caseId.slice(0, 8)}...</option>
          ))}
        </select>
      </div>

      {/* === CASE RESUME SECTION === */}
      <div className="case-resume-section">
        <div className="case-resume-header">
          <div className="case-resume-title-block">
            <FileText size={22} className="case-resume-icon" />
            <div>
              <h2 className="case-resume-title">Résumé du dossier</h2>
              <p className="case-resume-subtitle">Informations médicales clés pour la discussion RCP</p>
            </div>
          </div>
        </div>

        {resumeLoading && (
          <div className="case-resume-loading">
            <div className="case-resume-spinner" />
            <span>Chargement du résumé du dossier...</span>
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
                              Soumis le {new Date(form.submitted_at).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="case-resume-form-toggle">
                          <span className="case-resume-field-count">{form.fields.length} champ{form.fields.length !== 1 ? 's' : ''}</span>
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
                <p>Aucune soumission de formulaire avec champs RDV trouvée pour ce patient.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
