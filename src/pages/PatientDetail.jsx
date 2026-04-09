import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient } from '../api/patientsApi'
import { getMedicalCases, createMedicalCase } from '../api/medicalCasesApi'
import { getSubmissionsByPatient } from '../api/submissionsApi'

const CASE_STATUS_LABELS = { DRAFT: 'Draft', SUBMITTED: 'Submitted', VALIDATED: 'Validated', DISCUSSED: 'Discussed', CLOSED: 'Closed' }

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
    const caseName = window.prompt('Enter a name for the new medical case (optional):')
    if (caseName === null) return // User cancelled

    try {
      setCreatingCase(true)
      await createMedicalCase({ 
        patient: id, 
        status: 'DRAFT',
        name: caseName.trim() || null
      })
      loadCases()
    } catch (err) {
      setError('Failed to create medical case')
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
      setError('Failed to load patient')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading patient...</div>
  if (error) return <div className="error">{error}</div>
  if (!patient) return <div className="error">Patient not found</div>

  return (
    <div className="patient-detail-container">
      <div className="detail-header">
        <h1>👤 Patient Details</h1>
        <div className="detail-actions">
          <button 
            className="btn-secondary"
            onClick={() => navigate(`/patients/${id}/edit`)}
          >
            Edit
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate('/patients')}
          >
            Back
          </button>
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-section">
          <h2>Personal Information</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>First Name</label>
              <p>{patient.first_name}</p>
            </div>
            <div className="detail-item">
              <label>Last Name</label>
              <p>{patient.last_name}</p>
            </div>
            <div className="detail-item">
              <label>Birth Date</label>
              <p>{new Date(patient.birth_date).toLocaleDateString()}</p>
            </div>
            <div className="detail-item">
              <label>Gender</label>
              <p>
                <span className="gender-badge">
                  {patient.gender === 'M' ? '♂ Male' : patient.gender === 'F' ? '♀ Female' : '⚪ Other'}
                </span>
              </p>
            </div>
            <div className="detail-item">
              <label>Anonymized Code</label>
              <p>{patient.anonymized_code || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Created At</label>
              <p>{new Date(patient.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2>Medical cases</h2>
          <div className="detail-actions" style={{ marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={handleCreateCase} disabled={creatingCase}>
              {creatingCase ? 'Creating…' : '+ New medical case'}
            </button>
          </div>
          {cases.length === 0 ? (
            <p className="empty-inline">No medical cases yet.</p>
          ) : (
            <table className="forms-table">
              <thead>
                <tr>
                  <th>Case Name / ID</th>
                  <th>Status</th>
                  <th>Created</th>
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
                        <span className="text-muted">Case {String(c.id).slice(0, 8)}…</span>
                      )}
                    </td>
                    <td><span className="badge">{CASE_STATUS_LABELS[c.status] ?? c.status}</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="actions">
                      <button type="button" className="btn-small btn-primary" onClick={() => navigate(`/medical-cases/${c.id}`)}>Manage</button>
                      <button type="button" className="btn-small btn-secondary" onClick={() => navigate(`/meetings?medical_case=${c.id}`)}>Meetings</button>
                      <button type="button" className="btn-small btn-secondary" onClick={() => navigate(`/attachments?medical_case=${c.id}`)}>Attachments</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="detail-section">
          <h2>Form Submissions</h2>
          <div className="detail-actions" style={{ marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={() => navigate('/forms')}>
              + New Submission
            </button>
          </div>
          {submissions.length === 0 ? (
            <div className="empty-inline-card">
              <p>No form submissions found for this patient.</p>
            </div>
          ) : (
            <div className="submissions-grid">
              {submissions.map((sub) => (
                <div key={sub.id} className="submission-card-mini" onClick={() => navigate(`/forms/${sub.form}/submissions/${sub.id}`)}>
                  <div className="sub-icon">📝</div>
                  <div className="sub-info">
                    <span className="sub-form-name">{sub.form_name}</span>
                    <span className="sub-date">
                      Submitted on {new Date(sub.created_at).toLocaleString()}
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
