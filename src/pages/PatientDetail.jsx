import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient } from '../api/patientsApi'
import { getMedicalCases, createMedicalCase } from '../api/medicalCasesApi'

const CASE_STATUS_LABELS = { DRAFT: 'Draft', SUBMITTED: 'Submitted', VALIDATED: 'Validated', DISCUSSED: 'Discussed', CLOSED: 'Closed' }

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creatingCase, setCreatingCase] = useState(false)

  useEffect(() => {
    loadPatient()
  }, [id])

  useEffect(() => {
    if (id) loadCases()
  }, [id])

  const loadCases = async () => {
    try {
      const data = await getMedicalCases({ patient: id })
      setCases(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateCase = async () => {
    try {
      setCreatingCase(true)
      await createMedicalCase({ patient: id, status: 'DRAFT' })
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
                  <th>Case ID</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>{String(c.id).slice(0, 8)}…</td>
                    <td><span className="badge">{CASE_STATUS_LABELS[c.status] ?? c.status}</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="actions">
                      <button type="button" className="btn-small btn-secondary" onClick={() => navigate(`/meetings?medical_case=${c.id}`)}>Meetings</button>
                      <button type="button" className="btn-small btn-secondary" onClick={() => navigate(`/attachments?medical_case=${c.id}`)}>Attachments</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
