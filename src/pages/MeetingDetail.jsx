import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getMeeting, deleteMeeting, getSubmissionResume, addSubmissionToMeeting, removeSubmissionFromMeeting, updateMeeting } from '../api/meetingsApi'
import { getSubmissions, getSubmission } from '../api/submissionsApi'
import { getForm } from '../api/formsApi'
import { getAttachments, downloadAttachment } from '../api/attachmentsApi'
import { createConference } from '../api/conferenceApi'
import { useAuth } from '../context/AuthContext'
import UserAvatar from '../components/UserAvatar'
import { Video, FileText, User, Calendar, Activity, ChevronDown, ChevronUp, AlertCircle, ClipboardList, ExternalLink, Plus, Trash2, X, Download, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'
import { formatDate, formatDateTime } from '../lib/dateUtils'
import MeetingSummary from '../components/MeetingSummary'
import DoctorCaseSection from '../components/DoctorCaseSection'

const STATUS_LABELS = { PLANNED: 'Planifiée', LIVE: 'En cours', FINISHED: 'Terminée' }
const GENDER_LABELS = { M: 'Homme', F: 'Femme', O: 'Autre' }

/* ── helpers reused from FormSubmissionDetail ── */
function formatFieldValue(value) {
  if (value === true) return 'Oui'
  if (value === false) return 'Non'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  return value == null || value === '' ? '—' : String(value)
}

function isFieldVisible(field, submissionData) {
  const value = submissionData[field.id]
  const hasValue = value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
  return hasValue || field.required || field.show_rdv
}

function hasDataInChildren(section, submissionData) {
  if (section.fields?.some(f => isFieldVisible(f, submissionData))) return true
  return section.children?.some(child => hasDataInChildren(child, submissionData)) || false
}

function SectionDataRenderer({ section, submissionData }) {
  const visibleFields = section.fields?.filter(f => isFieldVisible(f, submissionData)) ?? []
  const hasChildData = section.children?.some(child => hasDataInChildren(child, submissionData))
  if (visibleFields.length === 0 && !hasChildData) return null

  return (
    <div key={section.id} className={`submission-section ${section.parent ? 'nested' : ''}`}>
      <h3 className="submission-section-title">{section.name}</h3>
      {visibleFields
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(field => {
          const value = submissionData[field.id]
          const isEmpty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
          const isFile = field.field_type === 'file'
          return (
            <div key={field.id} className="submission-detail-field">
              <span className="submission-detail-field-label">
                {field.name}
                {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
              </span>
              <span className={`submission-detail-field-value ${isFile ? 'is-file' : ''} ${isEmpty ? 'is-empty' : ''}`}>
                {isEmpty ? (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                ) : isFile ? (
                  <span className="file-field-preview">
                    <FileText size={14} style={{ marginRight: '6px' }} />
                    {formatFieldValue(value)}
                  </span>
                ) : (
                  formatFieldValue(value)
                )}
              </span>
            </div>
          )
        })}
      {section.children
        ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(child => (
          <SectionDataRenderer key={child.id} section={child} submissionData={submissionData} />
        ))}
    </div>
  )
}

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

  // Form detail panel state
  const [detailPanel, setDetailPanel] = useState({ open: false, loading: false, error: null, submission: null, form: null, attachments: [] })
  const [activeDetailId, setActiveDetailId] = useState(null)

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

  const handleViewFormDetails = async (sub) => {
    // Toggle off if clicking the same card
    if (activeDetailId === sub.id) {
      setActiveDetailId(null)
      setDetailPanel({ open: false, loading: false, error: null, submission: null, form: null, attachments: [] })
      return
    }
    setActiveDetailId(sub.id)
    setDetailPanel(prev => ({ ...prev, open: true, loading: true, error: null }))
    try {
      // Fetch the submission details first to get the form ID
      const subData = await getSubmission(sub.id)
      const formId = subData.form

      const [formData, attachData] = await Promise.all([
        getForm(formId),
        getAttachments({ submission: sub.id })
      ])
      setDetailPanel({ open: true, loading: false, error: null, submission: subData, form: formData, attachments: attachData || [] })
    } catch (err) {
      console.error('Failed to load form details:', err)
      setDetailPanel(prev => ({ ...prev, loading: false, error: 'Impossible de charger les détails du formulaire.' }))
    }
  }

  const closeDetailPanel = () => {
    setActiveDetailId(null)
    setDetailPanel({ open: false, loading: false, error: null, submission: null, form: null, attachments: [] })
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

  const isToday = meeting?.scheduled_date && new Date(meeting.scheduled_date).toDateString() === new Date().toDateString();
  const isCoordinatorOrAdmin = user?.id === (meeting?.coordinator_details?.id || meeting?.coordinator) || user?.role === 'ADMIN';

  let disableReason = "";
  if (!isToday) {
    disableReason = "La réunion n'est accessible que le jour prévu";
  } else if (!isCoordinatorOrAdmin && meeting?.status !== 'LIVE') {
    disableReason = "La réunion n'a pas encore commencé";
  }

  const isDisabled = creatingConference || disableReason !== "";
  const buttonText = isCoordinatorOrAdmin ? 'Démarrer la visio' : 'Rejoindre la visio';

  return (
    <div className="meeting-detail-container">
      <div className="detail-header">
        <h1>📅 {meeting.title || 'Détails de la réunion RCP'}</h1>
        <div className="detail-actions">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!['MEDECIN', 'MEDECIN_EXPERT'].includes(user?.role) && (
              <>
                <button className="btn-secondary" onClick={() => navigate(`/meetings/${id}/edit`)}>Modifier</button>
                <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
              </>
            )}
            <button className="btn-secondary" onClick={() => navigate('/meetings')}>Retour</button>
          </div>
          {(meeting.status !== 'FINISHED') && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {isCoordinatorOrAdmin && (
                <button 
                  className="btn-secondary" 
                  onClick={async () => {
                    if (window.confirm('Voulez-vous clôturer cette réunion ?')) {
                      try {
                        await updateMeeting(id, { status: 'FINISHED' });
                        loadMeeting();
                      } catch (err) {
                        setError("Échec de la clôture de la réunion");
                      }
                    }
                  }}
                >
                  Terminer/Clôturer la réunion
                </button>
              )}
              <button 
                className="btn-primary btn-with-icon" 
                onClick={handleJoinConference} 
                disabled={isDisabled}
                title={disableReason}
              >
                <Video size={18} />
                {creatingConference ? 'Ouverture...' : buttonText}
              </button>
            </div>
          )}
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
          <div className="detail-section" style={{marginTop: '2rem'}}>
            <label>Participants ({meeting.participant_details?.length || 0})</label>
            {meeting.participant_details?.length ? (
              <ul className="participants-list">
                {meeting.participant_details.map((p, index) => (
                  <li 
                    key={index} 
                    className="participant-item clickable"
                    onClick={() => navigate(`/users/${p.id}`)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <UserAvatar user={p} size={24} />
                    <span>{formatUserName(p)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="participants-list empty">Aucun participant invité</p>
            )}
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
                onViewDetails={handleViewFormDetails}
                activeDetailId={activeDetailId}
                currentUserRole={user?.role}
              />
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#64748b' }}>Aucun dossier lié à cette réunion.</p>
            </div>
          )}

          {/* ── Inline Form Details Panel ── */}
          {detailPanel.open && (
            <div className="form-detail-panel">
              <div className="form-detail-panel-header">
                <h2 className="form-detail-panel-title">
                  <ClipboardList size={22} />
                  Détails du formulaire
                </h2>
                <button onClick={closeDetailPanel} className="form-detail-panel-close" title="Fermer">
                  <X size={20} />
                </button>
              </div>

              {detailPanel.loading && (
                <div className="form-detail-panel-loading">
                  <div className="form-detail-spinner" />
                  Chargement des détails…
                </div>
              )}

              {detailPanel.error && (
                <div className="form-detail-panel-error">
                  <AlertCircle size={18} />
                  {detailPanel.error}
                </div>
              )}

              {!detailPanel.loading && !detailPanel.error && detailPanel.form && detailPanel.submission && (
                <>
                  {/* Meta info */}
                  <div className="submission-detail-meta" style={{ marginBottom: '1.5rem' }}>
                    <div className="submission-detail-meta-item">
                      <span className="submission-detail-meta-label">Formulaire</span>
                      <span className="submission-detail-meta-value">{detailPanel.form.name}</span>
                    </div>
                    <div className="submission-detail-meta-item">
                      <span className="submission-detail-meta-label">Patient</span>
                      <span className="submission-detail-meta-value">{detailPanel.submission.patient_name ?? '—'}</span>
                    </div>
                    <div className="submission-detail-meta-item">
                      <span className="submission-detail-meta-label">Soumis le</span>
                      <span className="submission-detail-meta-value">{new Date(detailPanel.submission.created_at).toLocaleString()}</span>
                    </div>
                    <div className="submission-detail-meta-item">
                      <span className="submission-detail-meta-label">Statut</span>
                      <span className="badge">{detailPanel.submission.status}</span>
                    </div>
                  </div>

                  {/* Sections data */}
                  <div className="submission-detail-data">
                    <h2 className="submission-detail-data-title">Valeurs extraites</h2>
                    {Object.keys(detailPanel.submission.data || {}).length === 0 ? (
                      <div className="submission-detail-empty">Aucune donnée trouvée dans cette soumission.</div>
                    ) : (
                      <div className="submission-detail-sections">
                        {detailPanel.form.sections
                          ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map(section => (
                            <SectionDataRenderer
                              key={section.id}
                              section={section}
                              submissionData={detailPanel.submission.data || {}}
                            />
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {detailPanel.attachments.length > 0 && (
                    <section style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                      <h2 className="submission-detail-data-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', padding: 0 }}>
                        <Download size={20} />
                        Pièces jointes ({detailPanel.attachments.length})
                      </h2>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                        {detailPanel.attachments.map(file => (
                          <div key={file.id} className="attachment-card" style={{ padding: '0.85rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                {file.file_type?.startsWith('image/') ? <ImageIcon size={18} /> :
                                 file.file_type?.startsWith('video/') ? <VideoIcon size={18} /> :
                                 <FileText size={18} />}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.file_name}>
                                  {file.file_name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{file.file_type}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                onClick={(e) => { e.preventDefault(); downloadAttachment(file.file, null) }}
                                style={{ color: '#2563eb', padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
                                title="Ouvrir"
                              >
                                <ExternalLink size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); downloadAttachment(file.file, file.file_name) }}
                                style={{ color: '#2563eb', padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
                                title="Télécharger"
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
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
    </div>
  )
}
