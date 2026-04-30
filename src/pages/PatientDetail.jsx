import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient } from '../api/patientsApi'
import { getSubmissionsByPatient, updateSubmission } from '../api/submissionsApi'
import { formatDate, formatDateTime } from '../lib/dateUtils'

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
  const [patient, setPatient] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPatient()
    loadSubmissions()
  }, [id])

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

  return (
    <div className="patient-detail-container">
      <div className="detail-header">
        <h1>👤 Dossier Patient : {patient.first_name} {patient.last_name}</h1>
        <div className="detail-actions">
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
          </div>
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
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="date-cell">
                        {formatDateTime(sub.created_at)}
                      </td>
                      <td>
                        <div className="sub-title-main">
                          {sub.name ? <strong>{sub.name}</strong> : <span className="text-muted">Sans titre</span>}
                          {sub.submitted_by_name && <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem', fontWeight: '500' }}>({sub.submitted_by_name})</span>}
                        </div>
                        <div className="sub-form-type">{sub.form_name}</div>
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
