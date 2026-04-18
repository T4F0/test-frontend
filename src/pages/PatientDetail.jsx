import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient } from '../api/patientsApi'
import { getMedicalCases, createMedicalCase } from '../api/medicalCasesApi'
import { getSubmissionsByPatient } from '../api/submissionsApi'

const CASE_STATUS_LABELS = { DRAFT: 'Brouillon', SUBMITTED: 'Soumis', VALIDATED: 'Validé', DISCUSSED: 'Discuté', CLOSED: 'Clôturé' }

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [cases, setCases] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creatingCase, setCreatingCase] = useState(false)

  useEffect(() => {
    loadPatient()
  }, [id])

  useEffect(() => {
    if (id) {
      loadCases()
      loadSubmissions()
    }
  }, [id])

  const loadSubmissions = async () => {
    try {
      const data = await getSubmissionsByPatient(id)
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load submissions:', e)
    }
  }

  const loadCases = async () => {
    try {
      const data = await getMedicalCases({ patient: id })
      setCases(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateCase = async () => {
    const caseName = window.prompt('Saisissez un nom pour le nouveau dossier médical (optionnel) :')
    if (caseName === null) return // User cancelled

    const patientName = `${patient.first_name} ${patient.last_name}`
    const finalName = caseName.trim() ? `${patientName} - ${caseName.trim()}` : patientName

    try {
      setCreatingCase(true)
      await createMedicalCase({ 
        patient: id, 
        status: 'DRAFT',
        name: finalName
      })
      loadCases()
    } catch (err) {
      setError('Échec de la création du dossier médical')
      console.error(err)
    } finally {
      setCreatingCase(false)
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

  if (loading) return <div className="loading">Chargement du patient...</div>
  if (error) return <div className="error">{error}</div>
  if (!patient) return <div className="error">Patient introuvable</div>

  return (
    <div className="patient-detail-container">
      <div className="detail-header">
        <h1>👤 Détails du patient</h1>
        <div className="detail-actions">
          <button 
            className="btn-secondary"
            onClick={() => navigate(`/patients/${id}/edit`)}
          >
            Modifier
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate('/patients')}
          >
            Retour
          </button>
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-section">
          <h2>Informations personnelles</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Prénom</label>
              <p>{patient.first_name}</p>
            </div>
            <div className="detail-item">
              <label>Nom</label>
              <p>{patient.last_name}</p>
            </div>
            <div className="detail-item">
              <label>Date de naissance</label>
              <p>{new Date(patient.birth_date).toLocaleDateString()}</p>
            </div>
            <div className="detail-item">
              <label>Sexe</label>
              <p>
                <span className="gender-badge">
                  {patient.gender === 'M' ? '♂ Homme' : patient.gender === 'F' ? '♀ Femme' : '⚪ Autre'}
                </span>
              </p>
            </div>
            <div className="detail-item">
              <label>Code anonymisé</label>
              <p>{patient.anonymized_code || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Créé le</label>
              <p>{new Date(patient.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2>Dossiers médicaux</h2>
          <div className="detail-actions" style={{ marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={handleCreateCase} disabled={creatingCase}>
              {creatingCase ? 'Création…' : '+ Nouveau dossier médical'}
            </button>
          </div>
          {cases.length === 0 ? (
            <p className="empty-inline">Aucun dossier médical pour le moment.</p>
          ) : (
            <table className="forms-table">
              <thead>
                <tr>
                  <th>Nom / ID du dossier</th>
                  <th>Statut</th>
                  <th>Créé</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.name ? (
                        <strong>{c.name}</strong>
                      ) : (
                        <span className="text-muted">Dossier {String(c.id).slice(0, 8)}…</span>
                      )}
                    </td>
                    <td><span className="badge">{CASE_STATUS_LABELS[c.status] ?? c.status}</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="actions">
                      <button type="button" className="btn-small btn-primary" onClick={() => navigate(`/medical-cases/${c.id}`)}>Gérer</button>
                      <button type="button" className="btn-small btn-secondary" onClick={() => navigate(`/meetings?medical_case=${c.id}`)}>Réunions</button>
                      <button type="button" className="btn-small btn-secondary" onClick={() => navigate(`/attachments?medical_case=${c.id}`)}>Pièces jointes</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="detail-section">
          <h2>Soumissions de formulaires</h2>
          <div className="detail-actions" style={{ marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={() => navigate('/forms')}>
              + Nouvelle soumission
            </button>
          </div>
          {submissions.length === 0 ? (
            <div className="empty-inline-card">
              <p>Aucune soumission de formulaire trouvée pour ce patient.</p>
            </div>
          ) : (
            <div className="submissions-grid">
              {submissions.map((sub) => (
                <div key={sub.id} className="submission-card-mini" onClick={() => navigate(`/forms/${sub.form}/submissions/${sub.id}`)}>
                  <div className="sub-icon">📝</div>
                  <div className="sub-info">
                    <span className="sub-form-name">{sub.form_name}</span>
                    <span className="sub-date">
                      Soumis le {new Date(sub.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="sub-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
