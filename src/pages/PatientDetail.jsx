import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient /*, getShareableDoctors, sharePatient*/ } from '../api/patientsApi'
import { getSubmissionsByPatient, updateSubmission, deleteSubmission } from '../api/submissionsApi'
import { getReportsByPatient } from '../api/reportsApi'
import { formatDate } from '../lib/dateUtils'
import { useAuth } from '../context/AuthContext'

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
  const [patientReports, setPatientReports] = useState([]) // all RCP reports for this patient
  const [expandedDecisions, setExpandedDecisions] = useState({})

  const toggleDecisions = (submissionId) => {
    setExpandedDecisions(prev => ({
      ...prev,
      [submissionId]: !prev[submissionId]
    }))
  }

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
    loadReports()
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

  const loadReports = async () => {
    try {
      const data = await getReportsByPatient(id)
      setPatientReports(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load reports:', e)
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
              <button className="btn-primary" onClick={() => navigate('/forms', { state: { preselectPatientId: id } })}>
                + Nouveau Dossier / Soumission
              </button>
            )}
          </div>

          {submissions.length === 0 ? (
            <div className="empty-inline-card">
              <p>Aucun dossier ou soumission de formulaire pour ce patient.</p>
            </div>
          ) : (
            <div className="submissions-cards-container">
              {submissions.map((sub) => {
                // All reports belonging to this submission
                const subReports = patientReports.filter(r => r.submission === sub.id)

                return (
                  <div key={sub.id} className="submission-card">
                    {/* ── Card Header ── */}
                    <div className="submission-card-header">
                      <div className="submission-card-meta">
                        <span className="submission-card-date">{formatDate(sub.created_at)}</span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: STATUS_COLORS[sub.status] + '22',
                            color: STATUS_COLORS[sub.status],
                            border: `1px solid ${STATUS_COLORS[sub.status]}50`,
                            fontSize: '0.72rem',
                            padding: '2px 10px',
                            borderRadius: '999px',
                          }}
                        >
                          {STATUS_LABELS[sub.status]}
                        </span>
                      </div>
                      <div className="submission-card-title">{sub.form_name}</div>
                      {sub.submitted_by_name && (
                        <div className="submission-card-doctor">{sub.submitted_by_name}</div>
                      )}
                    </div>

                    {/* ── RCP Decisions ── */}
                    {subReports.length > 0 && expandedDecisions[sub.id] && (
                      <div className="rcp-decisions-section">
                        <div className="rcp-decisions-label">
                          <span className="rcp-decisions-label-icon">⚖️</span>
                          Décision{subReports.length > 1 ? 's' : ''} RCP
                        </div>
                        {subReports.map((report, idx) => (
                          <div key={report.id}>
                            {idx > 0 && (
                              <div className="rcp-decision-separator">
                                <div className="rcp-separator-line" />
                                <span className="rcp-separator-label">Décision précédente</span>
                                <div className="rcp-separator-line" />
                              </div>
                            )}
                            <div className="rcp-decision-card">
                              <div className="rcp-decision-card-body">
                                {report.content}
                              </div>
                              <div className="rcp-decision-card-footer">
                                {report.written_by_name && (
                                  <span className="rcp-decision-author">
                                    🩺 {report.written_by_name}
                                  </span>
                                )}
                                <span className="rcp-decision-date">
                                  {new Date(report.created_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: 'long', year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Actions ── */}
                    <div className="submission-card-actions">
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
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                          {subReports.length === 0 ? 'Aucune décision enregistrée' : ''}
                        </span>
                      )}

                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        {subReports.length > 0 && (
                          <button
                            type="button"
                            className="btn-small btn-outline"
                            onClick={() => toggleDecisions(sub.id)}
                            title={expandedDecisions[sub.id] ? "Masquer les décisions" : "Voir les décisions"}
                          >
                            ⚖️ {expandedDecisions[sub.id] ? 'Masquer déc.' : 'Voir déc.'}
                          </button>
                        )}
                        {user?.role !== 'COORDINATEUR' && (
                          <button
                            className="btn-small btn-outline"
                            onClick={() => navigate(`/reports?submission=${sub.id}`)}
                            title="Voir le rapport RCP"
                          >
                            📑 Rapport RCP
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
