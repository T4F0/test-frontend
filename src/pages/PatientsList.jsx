import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients, deletePatient } from '../api/patientsApi'

export default function PatientsList() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadPatients()
  }, [search])

  const loadPatients = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPatients(1, search)
      setPatients(Array.isArray(data) ? data : [data])
    } catch (err) {
      setError('Failed to load patients')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        setDeleting(id)
        await deletePatient(id)
        setPatients(patients.filter(p => p.id !== id))
      } catch (err) {
        setError('Failed to delete patient')
        console.error(err)
      } finally {
        setDeleting(null)
      }
    }
  }

  if (loading) return <div className="loading">Loading patients...</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>👥 Patients</h1>
        <button 
          className="btn-primary"
          onClick={() => navigate('/patients/new')}
        >
          + New Patient
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {patients.length === 0 ? (
        <div className="empty-state">
          <p>No patients found</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Birth Date</th>
                <th>Gender</th>
                <th>Anonymized Code</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(patient => (
                <tr key={patient.id}>
                  <td className="name-cell">
                    <strong>{patient.first_name} {patient.last_name}</strong>
                  </td>
                  <td>{new Date(patient.birth_date).toLocaleDateString()}</td>
                  <td>
                    <span className="gender-badge">
                      {patient.gender === 'M' ? '♂ Male' : patient.gender === 'F' ? '♀ Female' : '⚪ Other'}
                    </span>
                  </td>
                  <td>{patient.anonymized_code || '-'}</td>
                  <td>{new Date(patient.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-small btn-info"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      View
                    </button>
                    <button
                      className="btn-small btn-secondary"
                      onClick={() => navigate(`/patients/${patient.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-small btn-danger"
                      onClick={() => handleDelete(patient.id)}
                      disabled={deleting === patient.id}
                    >
                      {deleting === patient.id ? '...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
