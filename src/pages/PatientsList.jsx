import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPatients, deletePatient } from '../api/patientsApi'
import { formatDate } from '../lib/dateUtils'
import { useAuth } from '../context/AuthContext'

export default function PatientsList() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const doctorFilter = searchParams.get('doctor') || ''

  const formatDoctorName = (doctor) => {
    if (!doctor) return '—'
    const fullName = `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()
    return fullName || doctor.email || '—'
  }

  useEffect(() => {
    loadPatients()
  }, [search, doctorFilter])

  const loadPatients = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPatients(1, search, doctorFilter)
      setPatients(Array.isArray(data) ? data : [data])
    } catch (err) {
      setError('Échec du chargement des patients')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) {
      try {
        setDeleting(id)
        await deletePatient(id)
        setPatients(patients.filter(p => p.id !== id))
      } catch (err) {
        setError('Échec de la suppression du patient')
        console.error(err)
      } finally {
        setDeleting(null)
      }
    }
  }

  if (loading) return <div className="loading">Chargement des patients...</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>👥 {doctorFilter ? 'Patients du médecin' : user?.role === 'ADMIN' ? 'Patients' : 'Mes Patients'}</h1>
        <button
          className="btn-primary"
          onClick={() => navigate('/patients/new')}
        >
          + Nouveau Patient
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher par nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {patients.length === 0 ? (
        <div className="empty-state">
          <p>Aucun patient trouvé</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Responsable</th>
                <th>Date de naissance</th>
                <th>Sexe</th>
                <th>Code anonymisé</th>
                <th>Accès</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => {
                const isOwner = patient.created_by === user?.id
                const showAccess = user?.role === 'MEDECIN'
                const accessLabel = isOwner ? 'Responsable' : 'Partagé'
                const accessClass = isOwner ? 'access-badge owner' : 'access-badge shared'
                const ownerName = formatDoctorName(patient.created_by_info)

                return (
                  <tr key={patient.id}>
                    <td className="name-cell">
                      <strong>{patient.first_name} {patient.last_name}</strong>
                    </td>
                    <td>{ownerName}</td>
                    <td>{formatDate(patient.birth_date)}</td>
                    <td>
                      <span className="gender-badge">
                        {patient.gender === 'M' ? '♂ Homme' : patient.gender === 'F' ? '♀ Femme' : '⚪ Autre'}
                      </span>
                    </td>
                    <td>{patient.anonymized_code || '-'}</td>
                    <td>
                      {showAccess ? (
                        <span className={accessClass}>{accessLabel}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{formatDate(patient.created_at)}</td>
                    <td className="actions-cell">
                      <button
                        className="btn-small btn-info"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        Dossier patient
                      </button>
                      <button
                        className="btn-small btn-secondary"
                        onClick={() => navigate(`/patients/${patient.id}/edit`)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDelete(patient.id)}
                        disabled={deleting === patient.id}
                      >
                        {deleting === patient.id ? '...' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
