import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getReports, downloadReportPdf } from '../api/reportsApi'

export default function ReportsList() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const [searchParams] = useSearchParams()
  const filterCase = searchParams.get('medical_case') || ''

  useEffect(() => {
    loadReports()
  }, [filterCase])

  const loadReports = async () => {
    try {
      setLoading(true)
      const params = filterCase ? { medical_case: filterCase } : {}
      const data = await getReports(params)
      setReports(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError('Failed to load reports')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (id) => {
    try {
      setDownloading(id)
      await downloadReportPdf(id)
    } catch (err) {
      setError('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  if (loading && reports.length === 0) return <div className="loading">Loading reports...</div>
  if (error && reports.length === 0) return <div className="error">{error}</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>RCP Reports</h1>
      </div>
      {error && <div className="error">{error}</div>}
      {reports.length === 0 ? (
        <p className="empty">No reports.</p>
      ) : (
        <table className="forms-table">
          <thead>
            <tr>
              <th>Medical case</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.medical_case ? String(r.medical_case).slice(0, 8) + '…' : '—'}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>
                  <button
                    className="btn-small btn-primary"
                    disabled={downloading === r.id}
                    onClick={() => handleDownload(r.id)}
                  >
                    {downloading === r.id ? 'Downloading…' : 'Download PDF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
