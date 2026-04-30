import { useEffect, useState } from 'react'
import { getAuditLogs } from '../api/auditLogsApi'
import { formatDateTime } from '../lib/dateUtils'

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'VIEW']
const OBJECT_TYPES = [
  'User', 'Patient', 'RCPMeeting', 'RCPReport', 'MedicalDocument',
  'Form', 'FormSubmission'
]

export default function AuditLogsList() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [action, setAction] = useState('')
  const [objectType, setObjectType] = useState('')
  const [search, setSearch] = useState('')

  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)

  // Reset to first page when filtering
  useEffect(() => {
    setPage(1)
  }, [action, objectType])

  useEffect(() => {
    loadLogs()
  }, [action, objectType, page])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (action) filters.action = action
      if (objectType) filters.object_type = objectType
      if (page > 1) filters.page = page
      
      const data = await getAuditLogs(filters)
      setLogs(Array.isArray(data.logs) ? data.logs : [])
      setHasNext(data.hasNext)
      setHasPrev(data.hasPrev)
      setError(null)
    } catch (err) {
      setError('Échec du chargement des journaux d\'audit. Accès administrateur requis.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getActionClass = (action) => {
    switch (action) {
      case 'CREATE': return 'badge-success'
      case 'UPDATE': return 'badge-warning'
      case 'DELETE': return 'badge-danger'
      default: return 'badge-info'
    }
  }

  const filteredLogs = logs.filter(log => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (log.username?.toLowerCase().includes(searchLower) || 
              log.user_email?.toLowerCase().includes(searchLower) ||
              log.object_id?.toString().includes(searchLower));
  })

  if (loading && logs.length === 0) return <div className="loading">Chargement des journaux d'audit...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Enregistrements d'audit</h1>
      </div>

      <div className="filters-bar">
        <select value={action} onChange={(e) => setAction(e.target.value)} className="filter-select">
          <option value="">Toutes les actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={objectType} onChange={(e) => setObjectType(e.target.value)} className="filter-select">
          <option value="">Tous les types d'objets</option>
          {OBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <input 
          type="text" 
          placeholder="Rechercher un utilisateur ou un ID..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filter-input"
        />
        
        <button onClick={loadLogs} className="btn-small btn-secondary">Actualiser</button>
      </div>

      {filteredLogs.length === 0 ? (
        <p className="empty">Aucun journal d'audit trouvé.</p>
      ) : (
        <div className="table-wrapper">
          <table className="forms-table">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Type d'objet</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.timestamp)}</td>
                  <td>{log.username || log.user_email || 'Système'}</td>
                  <td>
                    <span className={`badge ${getActionClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.object_type}</td>
                  <td>{log.object_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logs.length > 0 && (
        <div className="pagination-controls" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
          <button 
            className="btn-small btn-secondary" 
            disabled={!hasPrev || loading} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Précédent
          </button>
          <span style={{ display: 'flex', alignItems: 'center' }}>Page {page}</span>
          <button 
            className="btn-small btn-secondary" 
            disabled={!hasNext || loading} 
            onClick={() => setPage(p => p + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
