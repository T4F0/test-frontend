import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPatients, deletePatient } from '../api/patientsApi'
import { formatDate } from '../lib/dateUtils'
import { Search, X, Users, FolderOpen, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PageTitle from '../components/PageTitle'
import RowActionMenu from '../components/RowActionMenu'
import SortHeader from '../components/SortHeader'
import EmptyState from '../components/EmptyState'
import TableSkeleton from '../components/TableSkeleton'
import { useConfirm } from '../components/ConfirmDialog'
import { nextSort, sortRows } from '../lib/sorting'

export default function PatientsList() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [sort, setSort] = useState(null)
  const confirm = useConfirm()
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
    const ok = await confirm({
      title: 'Supprimer ce patient ?',
      message: 'Le dossier du patient et ses dossiers RCP seront supprimés. Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
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

  const canEdit = user?.role !== 'COORDINATEUR'
  const sortedPatients = sortRows(patients, sort, {
    name: (p) => `${p.last_name || ''} ${p.first_name || ''}`.trim(),
    owner: (p) => formatDoctorName(p.created_by_info),
    birth: (p) => (p.birth_date ? new Date(p.birth_date) : null),
    created: (p) => (p.created_at ? new Date(p.created_at) : null),
    code: (p) => p.anonymized_code,
  })
  const onSort = (key) => setSort(nextSort(sort, key))
  const menuItems = (patient) => [
    { label: 'Modifier le profil', icon: Pencil, hidden: !canEdit, onClick: () => navigate(`/patients/${patient.id}/edit`) },
    { label: deleting === patient.id ? 'Suppression…' : 'Supprimer', icon: Trash2, danger: true, hidden: !canEdit, disabled: deleting === patient.id, onClick: () => handleDelete(patient.id) },
  ]

  return (
    <div className="list-container">
      <div className="list-header">
        <PageTitle icon={Users}>{doctorFilter ? 'Patients du médecin' : user?.role === 'ADMIN' ? 'Patients' : 'Mes Patients'}</PageTitle>
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
        <div className="search-field-wrapper">
          <Search className="search-field-icon" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom, identifiant patient ou médecin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="search-field-clear"
              aria-label="Effacer la recherche"
            >
              <X size={16} />
            </button>
          )}
          {!loading && (
            <span className="search-field-count" aria-live="polite">
              {patients.length} {debouncedSearch ? `résultat${patients.length !== 1 ? 's' : ''}` : `patient${patients.length !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={6} label="Chargement des patients…" />
      ) : patients.length === 0 ? (
        <EmptyState
          icon={debouncedSearch ? Search : Users}
          title={debouncedSearch ? 'Aucun patient trouvé' : 'Aucun patient pour le moment'}
          description={debouncedSearch ? `Aucun résultat pour « ${debouncedSearch} ».` : 'Ajoutez un patient pour créer son premier dossier RCP.'}
          action={
            debouncedSearch ? (
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setSearch('')}>Effacer la recherche</button>
            ) : canEdit ? (
              <button type="button" className="ui-btn ui-btn-primary" onClick={() => navigate('/patients/new')}><UserPlus size={16} /> Nouveau patient</button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="patients-table-wrapper" style={{ position: 'relative', marginTop: '1.25rem' }}>
          {/* Top Dummy Scrollbar */}
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              height: '8px',
              width: '100%',
              position: 'sticky',
              top: '0',
              zIndex: 12,
              background: 'transparent',
              border: 'none',
            }}
          >
            <div style={{ width: `${scrollWidth}px`, height: '1px' }}></div>
          </div>

          <div 
            className="table-container"
            ref={tableContainerRef}
            onScroll={handleTableScroll}
          >
            <table className="data-table patients-table">
              <thead>
                <tr>
                  <SortHeader label="Nom" sortKey="name" sort={sort} onSort={onSort} />
                  <SortHeader label="Responsable" sortKey="owner" sort={sort} onSort={onSort} />
                  <SortHeader label="Date de naissance" sortKey="birth" sort={sort} onSort={onSort} />
                  <th>Sexe</th>
                  <SortHeader label="Identifiant patient" sortKey="code" sort={sort} onSort={onSort} />
                  <SortHeader label="Créé le" sortKey="created" sort={sort} onSort={onSort} />
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {sortedPatients.map((patient) => {
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
                          {patient.gender === 'M' ? '♂ Homme' : patient.gender === 'F' ? '♀ Femme' : 'Autre'}
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
                        <div className="ui-row-actions">
                          <button type="button" className="ui-primary-action" onClick={() => navigate(`/patients/${patient.id}`)}>
                            <FolderOpen size={15} aria-hidden="true" /> Dossier
                          </button>
                          <RowActionMenu label={`Autres actions pour ${`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}`} items={menuItems(patient)} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </div>

          <div className="mobile-cards">
            {sortedPatients.map((patient) => {
              const ownerName = formatDoctorName(patient.created_by_info)
              const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
              return (
                <div key={patient.id} className="mobile-card" onClick={() => navigate(`/patients/${patient.id}`)}>
                  <div className="mobile-card-header">
                    <div className="mobile-card-title">
                      <strong>{patientName}</strong>
                      <div className="text-muted" style={{fontSize: '0.8rem'}}>
                        ID: {patient.anonymized_code || '-'}
                      </div>
                    </div>
                    <span className="gender-badge">
                      {patient.gender === 'M' ? '♂ Homme' : patient.gender === 'F' ? '♀ Femme' : 'Autre'}
                    </span>
                  </div>
                  <div className="mobile-card-body">
                    <span>{ownerName}</span>
                    <span className="text-muted" style={{fontSize: '0.8rem', marginLeft: 'auto'}}>
                      Né(e) le {formatDate(patient.birth_date)} · Créé le {formatDate(patient.created_at)}
                    </span>
                  </div>
                  <div className="mobile-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="ui-primary-action" onClick={() => navigate(`/patients/${patient.id}`)}>
                      <FolderOpen size={15} aria-hidden="true" /> Dossier patient
                    </button>
                    <RowActionMenu label={`Autres actions pour ${patientName}`} items={menuItems(patient)} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
