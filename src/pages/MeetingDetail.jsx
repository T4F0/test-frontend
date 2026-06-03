import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getMeeting, deleteMeeting, getSubmissionResume, addSubmissionToMeeting, removeSubmissionFromMeeting } from '../api/meetingsApi'
import { getSubmissions } from '../api/submissionsApi'
import { createConference } from '../api/conferenceApi'
import { useAuth } from '../context/AuthContext'
import { Video, FileText, User, Calendar, Activity, ChevronDown, ChevronUp, AlertCircle, ClipboardList, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { formatDate, formatDateTime } from '../lib/dateUtils'
import MeetingSummary from '../components/MeetingSummary'
import DoctorCaseSection from '../components/DoctorCaseSection'

const STATUS_LABELS = { PLANNED: 'Planifiée', LIVE: 'En cours', FINISHED: 'Terminée' }
const GENDER_LABELS = { M: 'Homme', F: 'Femme', O: 'Autre' }

export default function MeetingDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const doctorFilter = searchParams.get('doctor')
  const navigate = useNavigate()
  const { user } = useAuth()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creatingConference, setCreatingConference] = useState(false)
  
  // Doctor self-service state
  const [mySubmissions, setMySubmissions] = useState([])
  const [showAddSubModal, setShowAddSubModal] = useState(false)
  const [addingSub, setAddingSub] = useState(false)

  const [submissionResume, setSubmissionResume] = useState(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState(null)
  const [expandedForms, setExpandedForms] = useState({})

  // Grouped submissions by doctor
  const groupedSubmissions = useMemo(() => {
    if (!meeting?.submission_details) return {};
    
    const groups = {};
    meeting.submission_details.forEach(sub => {
      const doctorId = sub.submitted_by_id || 'unknown';
      if (!groups[doctorId]) {
        groups[doctorId] = {
          doctorName: sub.submitted_by_name || (sub.submitted_by ? `${sub.submitted_by.first_name} ${sub.submitted_by.last_name}` : 'Médecin inconnu'),
          hospital: sub.submitted_by_hospital || (sub.submitted_by ? sub.submitted_by.hospital : 'Hôpital non spécifié'),
          cases: []
        };
      }
      groups[doctorId].cases.push(sub);
    });
    return groups;
  }, [meeting]);

  const formatUserName = (candidate) => {
    if (!candidate) return '—'
    const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim()
    return fullName || candidate.username || candidate.email || '—'
  }

  useEffect(() => {
    loadMeeting()
  }, [id])

  useEffect(() => {
    if (showAddSubModal) {
      loadMySubmissions()
    }
  }, [showAddSubModal])

  const loadMySubmissions = async () => {
    try {
      const data = await getSubmissions()
      setMySubmissions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load my submissions:', err)
    }
  }

  const handleAddMySubmission = async (submissionId) => {
    try {
      setAddingSub(true)
      await addSubmissionToMeeting(id, submissionId)
      setShowAddSubModal(false)
      loadMeeting()
    } catch (err) {
      setError('Échec de l\'ajout du dossier')
    } finally {
      setAddingSub(false)
    }
  }

  const handleRemoveMySubmission = async (submissionId) => {
    if (!window.confirm('Retirer ce dossier de la réunion ?')) return
    try {
      await removeSubmissionFromMeeting(id, submissionId)
      loadMeeting()
      if (submissionResume?.submission_id === submissionId) {
        setSubmissionResume(null)
      }
    } catch (err) {
      setError('Échec du retrait du dossier')
    }
  }

  const loadMeeting = async () => {
    try {
      const data = await getMeeting(id)
      setMeeting(data)
      setError(null)
      
      const visibleSubmissions = doctorFilter 
        ? data.submission_details?.filter(sub => sub.submitted_by_id === doctorFilter)
        : data.submission_details;

      if (visibleSubmissions?.length > 0) {
        loadResume(visibleSubmissions[0].id)
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
      return formatDate(value)
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
          {user?.role !== 'MEDECIN' && (
            <>
              <button className="btn-secondary" onClick={() => navigate(`/meetings/${id}/edit`)}>Modifier</button>
              <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
            </>
          )}
          <button className="btn-secondary" onClick={() => navigate('/meetings')}>Retour</button>
        </div>
      </div>

      <div className="detail-grid-layout">
        <div className="detail-card info-card">
          <h2>Informations générales</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Planifiée le</label>
              <p>{formatDateTime(meeting.scheduled_date)}</p>
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

        <div className="detail-card dossiers-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
          <MeetingSummary 
            totalDossiers={meeting.total_submissions_count || 0}
            participatingDoctors={meeting.total_participants_count || 0}
            meetingDate={meeting.scheduled_date}
          />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>📑 Dossiers à l'ordre du jour</h2>
            <button 
              onClick={() => setShowAddSubModal(true)}
              className="btn-small btn-primary btn-with-icon"
            >
              <Plus size={14} /> Ajouter un dossier
            </button>
          </div>
          
          {Object.entries(groupedSubmissions).length > 0 ? (
            Object.entries(groupedSubmissions).map(([doctorId, group]) => (
              <DoctorCaseSection
                key={doctorId}
                doctorName={group.doctorName}
                hospital={group.hospital}
                cases={group.cases}
                onRemoveCase={handleRemoveMySubmission}
                currentUserRole={user?.role}
              />
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#64748b' }}>Aucun dossier lié à cette réunion.</p>
            </div>
          )}
        </div>

      {showAddSubModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Ajouter un de vos dossiers à la réunion</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {mySubmissions.filter(s => !meeting.submissions.includes(s.id)).length === 0 ? (
                <p>Aucun dossier disponible à ajouter (soit vous n'en avez pas, soit ils sont déjà dans la réunion).</p>
              ) : (
                mySubmissions
                  .filter(s => !meeting.submissions.includes(s.id))
                  .map(sub => (
                    <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{sub.patient_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{sub.form_name} ({formatDate(sub.created_at)})</div>
                      </div>
                      <button 
                        onClick={() => handleAddMySubmission(sub.id)}
                        disabled={addingSub}
                        className="btn-small btn-primary"
                      >
                        Ajouter
                      </button>
                    </div>
                  ))
              )}
            </div>
            <button 
              onClick={() => setShowAddSubModal(false)}
              className="btn-secondary"
              style={{ marginTop: '2rem', width: '100%' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
      </div>

      {/* === CLINICAL RESUME SECTION === */}
      <div className="case-resume-section">
        <div className="case-resume-header">
          <div className="case-resume-title-block">
            <ClipboardList size={22} className="case-resume-icon" />
            <div>
              <h2 className="case-resume-title">{submissionResume?.patient?.first_name} {submissionResume?.patient?.last_name}</h2>
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
                    {formatDate(submissionResume.patient.birth_date)}
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
                          <span className="case-resume-form-date">Soumis le {formatDate(form.submitted_at)}</span>
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
