import { useEffect, useState } from 'react'
import { getAuditLogs } from '../api/auditLogsApi'

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'VIEW']
const OBJECT_TYPES = [
  'Patient', 'RCPMeeting', 'RCPReport', 'MedicalDocument',
  'Form', 'FormSubmission'
]

export default function AuditLogsList() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [action, setAction] = useState('')
  const [objectType, setObjectType] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadLogs()
  }, [action, objectType])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (action) filters.action = action
      if (objectType) filters.object_type = objectType
      
      const data = await getAuditLogs(filters)
      setLogs(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError('Failed to load audit logs. Admin access required.')
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

  if (loading && logs.length === 0) return <div className="loading">Loading audit logs...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Audit records</h1>
      </div>

      <div className="filters-bar">
        <select value={action} onChange={(e) => setAction(e.target.value)} className="filter-select">
          <option value="">All actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={objectType} onChange={(e) => setObjectType(e.target.value)} className="filter-select">
          <option value="">All object types</option>
          {OBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <input 
          type="text" 
          placeholder="Search user or ID..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filter-input"
        />
        
        <button onClick={loadLogs} className="btn-small btn-secondary">Refresh</button>
      </div>

      {filteredLogs.length === 0 ? (
        <p className="empty">No audit logs found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="forms-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Object type</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.username || log.user_email || 'System'}</td>
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
    </div>
  )
}
