import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient /*, getShareableDoctors, sharePatient*/ } from '../api/patientsApi'
import { getSubmissionsByPatient, updateSubmission, deleteSubmission } from '../api/submissionsApi'
import { getNextPlannedMeeting, addPatientToMeeting } from '../api/meetingsApi'
import { formatDate } from '../lib/dateUtils'
import { useAuth } from '../context/AuthContext'
import { CalendarPlus, UserPlus, CheckCircle2 } from 'lucide-react'

const STATUS_LABELS = {
  SUBMITTED: 'Soumis',
  VALIDATED: 'Validé',
  DISCUSSED: 'Discuté',
  CLOSED: 'Clôturé'
}

const STATUS_COLORS = {
  SUBMITTED: '#3b82f6', // blue
  VALIDATED: '#10b981', // green
  DISCUSSED: '#f59e0b', // amber
  CLOSED: '#6b7280'    // gray
}

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [patient, setPatient] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Meeting integration state
  const [nextMeeting, setNextMeeting] = useState(null)
  const [patientInNextMeeting, setPatientInNextMeeting] = useState(false)
  const [addingToMeeting, setAddingToMeeting] = useState(false)
  const [meetingActionSuccess, setMeetingActionSuccess] = useState(null)
  
  /* Partage du dossier commented out
  const [shareOpen, setShareOpen] = useState(false)
  const [shareableDoctors, setShareableDoctors] = useState([])
  const [selectedDoctors, setSelectedDoctors] = useState([])
  const [shareLoading, setShareLoading] = useState(false)
  const [shareSaving, setShareSaving] = useState(false)
  const [shareError, setShareError] = useState(null)
  const [shareSearch, setShareSearch] = useState('')
  */

  useEffect(() => {
    loadPatient()
    loadSubmissions()
    loadNextMeeting()
  }, [id])

  /*
  useEffect(() => {
    if (patient?.shared_with) {
      setSelectedDoctors(patient.shared_with)
    }
  }, [patient?.shared_with])
  */

  const formatDoctorName = (doctor) => {
    if (!doctor) return '—'
    const fullName = `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()
    return fullName || doctor.email || '—'
  }

  const loadSubmissions = async () => {
    try {
      const data = await getSubmissionsByPatient(id)
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load submissions:', e)
    }
  }

  const loadNextMeeting = async () => {
    try {
      const meeting = await getNextPlannedMeeting()
      setNextMeeting(meeting)
      if (meeting) {
        // Check if this patient is already in the meeting (via patients M2M or submissions)
        const patientIds = (meeting.patients || []).map(p => String(p))
        const submissionPatientIds = (meeting.submission_details || []).map(s => String(s.patient_id))
        const allPatientIds = new Set([...patientIds, ...submissionPatientIds])
        setPatientInNextMeeting(allPatientIds.has(String(id)))
      }
    } catch (e) {
      console.error('Failed to load next meeting:', e)
    }
  }

  const handleAddToNextMeeting = async () => {
    if (!nextMeeting) return
    try {
      setAddingToMeeting(true)
      await addPatientToMeeting(nextMeeting.id, id)
      setPatientInNextMeeting(true)
      setMeetingActionSuccess('Patient ajouté à la prochaine réunion avec succès !')
      setTimeout(() => setMeetingActionSuccess(null), 4000)
    } catch (err) {
      console.error('Failed to add patient to meeting:', err)
      setError('Échec de l\'ajout du patient à la réunion.')
    } finally {
      setAddingToMeeting(false)
    }
  }

  const loadPatient = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPatient(id)
      setPatient(data)
    } catch (err) {
      setError('Échec du chargement du patient')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  /*
  const loadShareableDoctors = async () => {
    try {
      setShareLoading(true)
      setShareError(null)
      const data = await getShareableDoctors()
      setShareableDoctors(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load shareable doctors:', err)
      setShareError('Échec du chargement des médecins')
    } finally {
      setShareLoading(false)
    }
  }

  const toggleSharePanel = () => {
    const nextState = !shareOpen
    setShareOpen(nextState)
    if (nextState && shareableDoctors.length === 0) {
      loadShareableDoctors()
    }
  }

  const handleToggleDoctor = (doctorId) => {
    setSelectedDoctors((prev) => (
      prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : [...prev, doctorId]
    ))
  }

  const handleRemoveDoctor = (doctorId) => {
    setSelectedDoctors((prev) => prev.filter((id) => id !== doctorId))
  }

  const handleShareSave = async () => {
    try {
      setShareSaving(true)
      setShareError(null)
      const updated = await sharePatient(id, selectedDoctors)
      setPatient(updated)
      setShareOpen(false)
    } catch (err) {
      console.error('Failed to share patient:', err)
      setShareError('Échec du partage du patient')
    } finally {
      setShareSaving(false)
    }
  }
  */

  const handleStatusChange = async (submissionId, newStatus) => {
    try {
      await updateSubmission(submissionId, { status: newStatus })
      loadSubmissions()
    } catch (err) {
      alert('Échec de la mise à jour du statut')
      console.error(err)
    }
  }

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce dossier RCP ? Cette action est irréversible.')) return
    try {
      await deleteSubmission(submissionId)
      loadSubmissions()
    } catch (err) {
      alert('Échec de la suppression du dossier')
      console.error(err)
    }
  }

  if (loading) return <div className="loading">Chargement du patient...</div>
  if (error) return <div className="error">{error}</div>
  if (!patient) return <div className="error">Patient introuvable</div>

  /*
  const canShare = user?.role === 'ADMIN'
    || user?.role === 'COORDINATEUR'
    || (user?.role === 'MEDECIN' && patient.created_by === user?.id)
  */

  const ownerName = formatDoctorName(patient.created_by_info)
  
  /*
  const sharedDoctors = Array.isArray(patient.shared_with_info) ? patient.shared_with_info : []
  const doctorLookup = new Map()
  shareableDoctors.forEach((doctor) => doctorLookup.set(doctor.id, doctor))
  sharedDoctors.forEach((doctor) => doctorLookup.set(doctor.id, doctor))

  const selectedDoctorDetails = selectedDoctors
    .map((doctorId) => doctorLookup.get(doctorId))
    .filter(Boolean)

  const searchTerm = shareSearch.trim().toLowerCase()
  const filteredDoctors = shareableDoctors.filter((doctor) => {
    if (!searchTerm) return true
    const haystack = [
      doctor.first_name,
      doctor.last_name,
      doctor.email,
      doctor.hospital,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(searchTerm)
  })
  */

  return (
    <div className="patient-detail-container">
      <div className="detail-header">
        <h1>👤 Dossier Patient : {`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</h1>
        <div className="detail-actions">
          {/* Partage du dossier commented out
          {canShare && (
            <button
              className="btn-secondary"
              onClick={toggleSharePanel}
            >
              {shareOpen ? 'Masquer le partage' : 'Partager le dossier'}
            </button>
          )}
          */}
          {user?.role !== 'COORDINATEUR' && (
            <button
              className="btn-secondary"
              onClick={() => navigate(`/patients/${id}/edit`)}
            >
              Modifier le profil
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => navigate('/patients')}
          >
            Retour à la liste
          </button>
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-section info-card">
          <h2>Informations administratives</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Prénom / Code</label>
              <p>{patient.first_name}</p>
            </div>
            <div className="detail-item">
              <label>Nom / Code</label>
              <p>{patient.last_name}</p>
            </div>
            <div className="detail-item">
              <label>Date de naissance</label>
              <p>{formatDate(patient.birth_date)}</p>
            </div>
            <div className="detail-item">
              <label>Sexe</label>
              <p>
                <span className="gender-badge">
                  {patient.gender === 'M' ? '♂ Homme' : patient.gender === 'F' ? '♀ Femme' : '⚪ Autre'}
                </span>
              </p>
            </div>
            {patient.phone_number && (
              <div className="detail-item">
                <label>Téléphone</label>
                <p>{patient.phone_number}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Meeting Actions ────────────────────────────────────── */}
        <div className="detail-section meeting-actions-section">
          <h2>📅 Réunions RCP</h2>

          {/* Success toast */}
          {meetingActionSuccess && (
            <div className="meeting-action-toast">
              <CheckCircle2 size={18} />
              {meetingActionSuccess}
            </div>
          )}

          {patientInNextMeeting ? (
            /* Patient is already in the next meeting — show indicator */
            <div className="meeting-already-included">
              <div className="meeting-already-included-icon">
                <CheckCircle2 size={24} />
              </div>
              <div className="meeting-already-included-info">
                <div className="meeting-already-included-title">
                  Patient inclus dans la prochaine réunion
                </div>
                <div className="meeting-already-included-detail">
                  {nextMeeting?.title || `Réunion du ${formatDate(nextMeeting?.scheduled_date)}`}
                </div>
              </div>
              <button
                className="btn-small btn-outline"
                onClick={() => navigate(`/meetings/${nextMeeting.id}`)}
              >
                Voir la réunion
              </button>
            </div>
          ) : (
            /* Show the two action buttons */
            <div className="meeting-actions-row">
              {nextMeeting && (
                <button
                  className="btn-meeting-add"
                  onClick={handleAddToNextMeeting}
                  disabled={addingToMeeting}
                >
                  <UserPlus size={18} />
                  <div className="btn-meeting-text">
                    <span className="btn-meeting-label">
                      {addingToMeeting ? 'Ajout en cours…' : 'Ajouter à la prochaine réunion'}
                    </span>
                    <span className="btn-meeting-sub">
                      {nextMeeting.title || formatDate(nextMeeting.scheduled_date)}
                    </span>
                  </div>
                </button>
              )}
              <button
                className="btn-meeting-plan"
                onClick={() => navigate('/meetings/new', {
                  state: {
                    preselectPatientId: id,
                    preselectPatientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
                  }
                })}
              >
                <CalendarPlus size={16} />
                Planifier une nouvelle réunion
              </button>
            </div>
          )}
        </div>

        {/* Partage du dossier section commented out
        <div className="detail-section share-section">
          <div className="share-header">
            <h2>🤝 Partage du dossier</h2>
            {canShare && (
              <button className="btn-secondary" onClick={toggleSharePanel}>
                {shareOpen ? 'Fermer' : 'Gérer le partage'}
              </button>
            )}
          </div>
          <div className="detail-grid share-meta">
            <div className="detail-item">
              <label>Médecin responsable</label>
              <p>{ownerName}</p>
            </div>
            <div className="detail-item">
              <label>Partagé avec</label>
              {sharedDoctors.length === 0 ? (
                <p className="text-muted">Aucun partage actif</p>
              ) : (
                <div className="share-chips">
                  {sharedDoctors.map((doctor) => (
                    <span key={doctor.id} className="share-chip">
                      {formatDoctorName(doctor)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {shareOpen && canShare && (
            <div className="share-panel">
              {shareError && <div className="error">{shareError}</div>}
              {shareLoading ? (
                <div className="loading">Chargement des médecins...</div>
              ) : (
                <>
                  <div className="share-toolbar">
                    <div className="share-search">
                      <label htmlFor="doctor-search">Rechercher un médecin</label>
                      <input
                        id="doctor-search"
                        type="text"
                        value={shareSearch}
                        onChange={(event) => setShareSearch(event.target.value)}
                        placeholder="Nom, email, hôpital..."
                      />
                    </div>
                    <div className="share-selection">
                      <div className="share-selection-header">
                        Sélection actuelle ({selectedDoctors.length})
                      </div>
                      {selectedDoctorDetails.length === 0 ? (
                        <p className="text-muted">Aucun médecin sélectionné.</p>
                      ) : (
                        <div className="share-selected-list">
                          {selectedDoctorDetails.map((doctor) => (
                            <span key={doctor.id} className="share-chip removable">
                              {formatDoctorName(doctor)}
                              <button
                                type="button"
                                className="share-chip-remove"
                                onClick={() => handleRemoveDoctor(doctor.id)}
                                aria-label="Retirer le médecin"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {shareableDoctors.length === 0 ? (
                    <div className="empty-inline-card">
                      <p>Aucun médecin disponible pour le partage.</p>
                    </div>
                  ) : filteredDoctors.length === 0 ? (
                    <div className="empty-inline-card">
                      <p>Aucun médecin ne correspond à votre recherche.</p>
                    </div>
                  ) : (
                    <div className="share-list">
                      {filteredDoctors.map((doctor) => (
                        <label
                          key={doctor.id}
                          className={`share-option ${selectedDoctors.includes(doctor.id) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDoctors.includes(doctor.id)}
                            onChange={() => handleToggleDoctor(doctor.id)}
                          />
                          <span className="share-option-name">{formatDoctorName(doctor)}</span>
                          {doctor.hospital && (
                            <span className="share-option-meta">{doctor.hospital}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="share-actions">
                    <button
                      className="btn-primary"
                      onClick={handleShareSave}
                      disabled={shareSaving}
                    >
                      {shareSaving ? 'Enregistrement...' : 'Enregistrer le partage'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        */}

        <div className="detail-section submissions-section">
          <div className="section-header-row">
            <h2>📑 Dossiers RCP & Soumissions</h2>
            {user?.role !== 'COORDINATEUR' && (
              <button className="btn-primary" onClick={() => navigate('/forms')}>
                + Nouveau Dossier / Soumission
              </button>
            )}
          </div>

          {submissions.length === 0 ? (
            <div className="empty-inline-card">
              <p>Aucun dossier ou soumission de formulaire pour ce patient.</p>
            </div>
          ) : (
            <div className="submissions-list-container">
              <table className="forms-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Formulaire / Titre</th>
                    <th>Médecin</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="date-cell" style={{ fontWeight: 'bold' }}>
                        {formatDate(sub.created_at)}
                      </td>
                      <td>
                        <div className="sub-title-main">
                          {sub.form_name}
                        </div>
                      </td>
                      <td>
                        {sub.submitted_by_name ? (
                          <span className="text-muted" style={{ fontWeight: '600' }}>{sub.submitted_by_name}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {user?.role === 'COORDINATEUR' ? (
                          <span className="badge" style={{
                            backgroundColor: STATUS_COLORS[sub.status] + '20',
                            color: STATUS_COLORS[sub.status],
                            border: `1px solid ${STATUS_COLORS[sub.status]}40`
                          }}>
                            {STATUS_LABELS[sub.status]}
                          </span>
                        ) : (
                          <select
                            className="status-select-mini"
                            value={sub.status}
                            onChange={(e) => handleStatusChange(sub.id, e.target.value)}
                            style={{
                              backgroundColor: STATUS_COLORS[sub.status] + '20',
                              color: STATUS_COLORS[sub.status],
                              borderColor: STATUS_COLORS[sub.status] + '40'
                            }}
                          >
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="actions">
                        {user?.role !== 'COORDINATEUR' ? (
                          <div className="action-group-horizontal">
                            <button
                              className="btn-small btn-outline"
                              onClick={() => navigate(`/forms/${sub.form}/submissions/${sub.id}`)}
                              title="Voir les détails"
                            >
                              👁️ Voir
                            </button>
                            <button
                              className="btn-small btn-outline"
                              onClick={() => navigate(`/forms/${sub.form}/submissions/${sub.id}/edit`)}
                              title="Modifier la soumission"
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              className="btn-small btn-outline"
                              onClick={() => navigate(`/attachments?submission=${sub.id}`)}
                              title="Gérer les pièces jointes"
                            >
                              📎 Fichiers
                            </button>
                            {(user?.role === 'ADMIN' || user?.role === 'MEDECIN') && (
                              <button
                                className="btn-small btn-danger"
                                onClick={() => handleDeleteSubmission(sub.id)}
                                title="Supprimer le dossier"
                              >
                                🗑️ Supprimer
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
