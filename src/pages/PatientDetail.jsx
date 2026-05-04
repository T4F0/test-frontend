import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient, getShareableDoctors, sharePatient } from '../api/patientsApi'
import { getSubmissionsByPatient, updateSubmission } from '../api/submissionsApi'
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
  const [shareOpen, setShareOpen] = useState(false)
  const [shareableDoctors, setShareableDoctors] = useState([])
  const [selectedDoctors, setSelectedDoctors] = useState([])
  const [shareLoading, setShareLoading] = useState(false)
  const [shareSaving, setShareSaving] = useState(false)
  const [shareError, setShareError] = useState(null)
  const [shareSearch, setShareSearch] = useState('')

  useEffect(() => {
    loadPatient()
    loadSubmissions()
  }, [id])

  useEffect(() => {
    if (patient?.shared_with) {
      setSelectedDoctors(patient.shared_with)
    }
  }, [patient?.shared_with])

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

  const handleStatusChange = async (submissionId, newStatus) => {
    try {
      await updateSubmission(submissionId, { status: newStatus })
      loadSubmissions()
    } catch (err) {
      alert('Échec de la mise à jour du statut')
      console.error(err)
    }
  }

  if (loading) return <div className="loading">Chargement du patient...</div>
  if (error) return <div className="error">{error}</div>
  if (!patient) return <div className="error">Patient introuvable</div>

  const canShare = user?.role === 'ADMIN'
    || user?.role === 'COORDINATEUR'
    || (user?.role === 'MEDECIN' && patient.created_by === user?.id)

  const ownerName = formatDoctorName(patient.created_by_info)
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

  return (
    <div className="patient-detail-container">
      <div className="detail-header">
        <h1>👤 Dossier Patient : {patient.first_name} {patient.last_name}</h1>
        <div className="detail-actions">
          {canShare && (
            <button
              className="btn-secondary"
              onClick={toggleSharePanel}
            >
              {shareOpen ? 'Masquer le partage' : 'Partager le dossier'}
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => navigate(`/patients/${id}/edit`)}
          >
            Modifier le profil
          </button>
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

        <div className="detail-section submissions-section">
          <div className="section-header-row">
            <h2>📑 Dossiers RCP & Soumissions</h2>
            <button className="btn-primary" onClick={() => navigate('/forms')}>
              + Nouveau Dossier / Soumission
            </button>
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
                      </td>
                      <td className="actions">
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
                            onClick={() => navigate(`/attachments?submission=${sub.id}`)}
                            title="Gérer les pièces jointes"
                          >
                            📎 Fichiers
                          </button>
                          <button
                            className="btn-small btn-outline"
                            onClick={() => navigate(`/meetings?submission=${sub.id}`)}
                            title="Voir les réunions"
                          >
                            📅 RCP
                          </button>
                        </div>
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
