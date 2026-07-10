import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPatients, deletePatient } from '../api/patientsApi'
import { formatDate } from '../lib/dateUtils'
import { useAuth } from '../context/AuthContext'

export default function PatientsList() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const doctorFilter = searchParams.get('doctor') || ''

  const tableContainerRef = useRef(null)
  const topScrollRef = useRef(null)
  const [scrollWidth, setScrollWidth] = useState(0)

  // Sync scroll from top scrollbar to table container
  const handleTopScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft
    }
  }

  // Sync scroll from table container to top scrollbar
  const handleTableScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft
    }
  }

  // Update scrollbar width on mount, when patients load, or window resizes
  useEffect(() => {
    const updateWidth = () => {
      if (tableContainerRef.current) {
        setScrollWidth(tableContainerRef.current.scrollWidth)
      }
    }
    
    updateWidth()
    // Run after a short delay to ensure table rendering is complete
    const timer = setTimeout(updateWidth, 100)
    
    window.addEventListener('resize', updateWidth)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateWidth)
    }
  }, [patients, loading])

  const formatDoctorName = (doctor) => {
    if (!doctor) return '—'
    const fullName = `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()
    return fullName || doctor.email || '—'
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    loadPatients()
  }, [debouncedSearch, doctorFilter])

  const loadPatients = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPatients(1, debouncedSearch, doctorFilter)
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

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>👥 {doctorFilter ? 'Patients du médecin' : user?.role === 'ADMIN' ? 'Patients' : 'Mes Patients'}</h1>
        {user?.role !== 'COORDINATEUR' && (
          <button
            className="btn-primary"
            onClick={() => navigate('/patients/new')}
          >
            + Nouveau Patient
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="search-bar">
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Rechercher par nom, identifiant patient ou médecin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ width: '100%', paddingRight: '2.5rem' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--gray-400)',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading" style={{ textAlign: 'center', padding: '2rem' }}>Chargement des patients...</div>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          <p>Aucun patient trouvé</p>
        </div>
      ) : (
        <div style={{ position: 'relative', marginTop: '1.25rem' }}>
          {/* Top Dummy Scrollbar */}
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              height: '14px',
              width: '100%',
              position: 'sticky',
              top: '0',
              zIndex: 12,
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div style={{ width: `${scrollWidth}px`, height: '1px' }}></div>
          </div>

          <div 
            className="table-container"
            ref={tableContainerRef}
            onScroll={handleTableScroll}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Responsable</th>
                  <th>Date de naissance</th>
                  <th>Sexe</th>
                  <th>Identifiant patient</th>
                  {/* <th>Accès</th> */}
                  <th>Créé le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => {
                  /*
                  const isOwner = patient.created_by === user?.id
                  const showAccess = user?.role === 'MEDECIN'
                  const accessLabel = isOwner ? 'Responsable' : 'Partagé'
                  const accessClass = isOwner ? 'access-badge owner' : 'access-badge shared'
                  */
                  const ownerName = formatDoctorName(patient.created_by_info)
  
                  return (
                    <tr 
                      key={patient.id}
                      onClick={(e) => {
                        if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('input') && !e.target.closest('select')) {
                          navigate(`/patients/${patient.id}`);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                      className="hover-row-highlight"
                    >
                      <td className="name-cell">
                        <strong>{`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</strong>
                      </td>
                      <td>{ownerName}</td>
                      <td>{formatDate(patient.birth_date)}</td>
                      <td>
                        <span className="gender-badge">
                          {patient.gender === 'M' ? '♂ Homme' : patient.gender === 'F' ? '♀ Femme' : '⚪ Autre'}
                        </span>
                      </td>
                      <td>{patient.anonymized_code || '-'}</td>
                      {/* 
                      <td>
                        {showAccess ? (
                          <span className={accessClass}>{accessLabel}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      */}
                      <td>{formatDate(patient.created_at)}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-small btn-info"
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          Dossier patient
                        </button>
                        {user?.role !== 'COORDINATEUR' && (
                          <>
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
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
