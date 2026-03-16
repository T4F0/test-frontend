import { useEffect, useState } from 'react'
import { getAuditLogs } from '../api/auditLogsApi'

export default function AuditLogsList() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await getAuditLogs()
      setLogs(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError('Failed to load audit logs. Admin access required.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading audit logs...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Audit logs</h1>
      </div>
      {logs.length === 0 ? (
        <p className="empty">No audit logs.</p>
      ) : (
        <div className="table-wrapper">
          <table className="forms-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Object type</th>
                <th>Object ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.user_email ?? '—'}</td>
                  <td><span className="badge">{log.action}</span></td>
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
