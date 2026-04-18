import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getReports, downloadReportPdf } from '../api/reportsApi'

export default function ReportsList() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const [searchParams] = useSearchParams()
  const filterSubmission = searchParams.get('submission') || ''

  useEffect(() => {
    loadReports()
  }, [filterSubmission])

  const loadReports = async () => {
    try {
      setLoading(true)
      const params = filterSubmission ? { submission: filterSubmission } : {}
      const data = await getReports(params)
      setReports(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError('Échec du chargement des rapports')
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
      setError('Échec du téléchargement')
    } finally {
      setDownloading(null)
    }
  }

  if (loading && reports.length === 0) return <div className="loading">Chargement des rapports...</div>
  if (error && reports.length === 0) return <div className="error">{error}</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>📑 Rapports RCP</h1>
      </div>
      {error && <div className="error">{error}</div>}
      {reports.length === 0 ? (
        <div className="empty-inline-card">
          <p>Aucun rapport généré pour le moment.</p>
        </div>
      ) : (
        <table className="forms-table">
          <thead>
            <tr>
              <th>Dossier / Soumission</th>
              <th>Date de création</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.submission_name || 'Sans titre'}</strong>
                  <div className="text-muted" style={{fontSize: '0.8rem'}}>{r.form_name}</div>
                </td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>
                  <button
                    className="btn-small btn-primary"
                    disabled={downloading === r.id}
                    onClick={() => handleDownload(r.id)}
                  >
                    {downloading === r.id ? 'Génération...' : 'Télécharger PDF'}
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
