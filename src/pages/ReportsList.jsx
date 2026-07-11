import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getReports, downloadReportPdf, fetchReportPdfBlob } from '../api/reportsApi'
import { getMeetings } from '../api/meetingsApi'
import { Search, Filter } from 'lucide-react'

export default function ReportsList() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const [searchParams] = useSearchParams()
  const filterSubmission = searchParams.get('submission') || ''

  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState('desc') // 'desc' = newest first, 'asc' = oldest first

  const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
  const [previewReportId, setPreviewReportId] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(null)
  const [previewError, setPreviewError] = useState(null)

  // Meeting filter state
  const [meetings, setMeetings] = useState([])
  const [selectedMeeting, setSelectedMeeting] = useState('')
  const [meetingsLoading, setMeetingsLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)

  useEffect(() => {
    loadMeetings()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filterSubmission, selectedMeeting])

  useEffect(() => {
    loadReports()
  }, [filterSubmission, selectedMeeting, page])

  const loadMeetings = async () => {
    try {
      setMeetingsLoading(true)
      const data = await getMeetings({ page_size: 100 })
      setMeetings(Array.isArray(data.meetings) ? data.meetings : [])
    } catch (err) {
      console.error('Failed to load meetings:', err)
    } finally {
      setMeetingsLoading(false)
    }
  }

  const loadReports = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterSubmission) params.submission = filterSubmission
      if (selectedMeeting) params.meeting = selectedMeeting
      if (page > 1) params.page = page
      const data = await getReports(params)
      setReports(Array.isArray(data.reports) ? data.reports : [])
      setHasNext(data.hasNext)
      setHasPrev(data.hasPrev)
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

  const handlePreview = async (id) => {
    try {
      setPreviewLoading(id)
      setPreviewError(null)
      const url = await fetchReportPdfBlob(id)
      setPreviewPdfUrl(url)
      setPreviewReportId(id)
    } catch (err) {
      setPreviewError('Échec du chargement de l\'aperçu')
      console.error(err)
    } finally {
      setPreviewLoading(null)
    }
  }

  const closePreview = () => {
    if (previewPdfUrl) window.URL.revokeObjectURL(previewPdfUrl)
    setPreviewPdfUrl(null)
    setPreviewReportId(null)
    setPreviewError(null)
  }

  const processedReports = reports
    .filter((r) => {
      const term = searchTerm.toLowerCase().trim()
      if (!term) return true
      const patientName = (r.submission_patient_name || '').toLowerCase()
      const docName = (r.written_by_name || '').toLowerCase()
      return patientName.includes(term) || docName.includes(term)
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at)
      const dateB = new Date(b.created_at)
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })

  if (loading && reports.length === 0) return <div className="loading">Chargement des rapports...</div>
  if (error && reports.length === 0) return <div className="error">{error}</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>📑 Rapports RCP</h1>
      </div>
      {error && <div className="error">{error}</div>}

      {/* Filter controls - always visible */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '0 1 400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            type="text"
            placeholder="Rechercher par patient ou médecin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="modern-search-input"
            style={{ width: '100%', padding: '0.85rem 2.5rem 0.85rem 2.75rem' }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
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

        {/* Meeting filter dropdown - pushed to the right */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '0 1 320px', marginLeft: 'auto' }}>
          <Filter size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
          <select
            value={selectedMeeting}
            onChange={(e) => setSelectedMeeting(e.target.value)}
            className="modern-search-input"
            style={{
              width: '100%',
              padding: '0.85rem 2.5rem 0.85rem 2.5rem',
              appearance: 'none',
              cursor: 'pointer',
              color: selectedMeeting ? 'var(--text-primary, #1a1a2e)' : 'var(--gray-400)',
            }}
          >
            <option value="">Toutes les réunions</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || `Réunion du ${new Date(m.scheduled_date).toLocaleDateString('fr-FR')}`}
                {m.status === 'LIVE' ? ' 🔴' : m.status === 'PLANNED' ? ' 📅' : ' ✅'}
              </option>
            ))}
          </select>
          {selectedMeeting && (
            <button
              type="button"
              onClick={() => setSelectedMeeting('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
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
                fontSize: '0.85rem',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="empty-inline-card">
          <p>{selectedMeeting ? 'Aucun rapport généré pour cette réunion.' : 'Aucun rapport généré pour le moment.'}</p>
        </div>
      ) : processedReports.length === 0 ? (
            <div className="empty-inline-card">
              <p>Aucun rapport ne correspond à votre recherche "{searchTerm}"</p>
            </div>
          ) : (
            <>
            <div className="reports-table-wrapper table-responsive-wrapper">
              <table className="forms-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Dossier / Soumission</th>
                    <th>Réunion</th>
                    <th>Rédigé par</th>
                    <th 
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} 
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Cliquez pour trier par date"
                    >
                      Date de création <span style={{ marginLeft: '4px', fontSize: '0.82rem', color: 'var(--primary)' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processedReports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.submission_name || r.submission_patient_name || 'Sans titre'}</strong>
                        <div className="text-muted" style={{fontSize: '0.8rem'}}>{r.form_name || r.submission_form_name}</div>
                      </td>
                      <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        {r.meeting_names && r.meeting_names.length > 0
                          ? r.meeting_names.map((m) => m.name).join(', ')
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td>{r.written_by_name || '—'}</td>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                      <td>
                        <button
                          className="btn-small btn-outline"
                          disabled={previewLoading === r.id || downloading === r.id}
                          onClick={() => handlePreview(r.id)}
                          style={{ marginRight: 6 }}
                        >
                          {previewLoading === r.id ? 'Chargement...' : 'Aperçu'}
                        </button>
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
            </div>

            <div className="mobile-cards">
              {processedReports.map((r) => (
                <div key={r.id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div className="mobile-card-title">
                      <strong>{r.submission_name || r.submission_patient_name || 'Sans titre'}</strong>
                      <div className="text-muted" style={{fontSize: '0.8rem'}}>{r.form_name || r.submission_form_name}</div>
                    </div>
                  </div>
                  <div className="mobile-card-body">
                    <span className="text-muted" style={{fontSize: '0.8rem'}}>
                      {r.written_by_name || '—'} · {new Date(r.created_at).toLocaleString()}
                    </span>
                    {r.meeting_names && r.meeting_names.length > 0 && (
                      <span className="text-muted" style={{fontSize: '0.8rem', marginLeft: 'auto'}}>
                        {r.meeting_names.map((m) => m.name).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="mobile-card-actions">
                    <button className="btn-small btn-outline" disabled={previewLoading === r.id || downloading === r.id} onClick={() => handlePreview(r.id)}>
                      {previewLoading === r.id ? 'Chargement...' : 'Aperçu'}
                    </button>
                    <button className="btn-small btn-primary" disabled={downloading === r.id} onClick={() => handleDownload(r.id)}>
                      {downloading === r.id ? 'Génération...' : 'Télécharger PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}


      {previewPdfUrl && (
        <div
          className="modal-overlay"
          onClick={closePreview}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 8, width: '90vw', height: '90vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderBottom: '1px solid #e0e0e0',
            }}>
              <h3 style={{ margin: 0 }}>Aperçu du rapport</h3>
              <div>
                <button
                  className="btn-small btn-primary"
                  onClick={() => { handleDownload(previewReportId) }}
                  style={{ marginRight: 8 }}
                >
                  Télécharger
                </button>
                <button className="btn-small" onClick={closePreview}>
                  Fermer
                </button>
              </div>
            </div>
            <iframe
              src={previewPdfUrl}
              title="Aperçu PDF"
              style={{ flex: 1, border: 'none', width: '100%' }}
            />
          </div>
        </div>
      )}

      {previewError && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewError(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 8, padding: 24, maxWidth: 400,
            }}
          >
            <p className="error">{previewError}</p>
            <button className="btn-small" onClick={() => setPreviewError(null)}>
              Fermer
            </button>
          </div>
            </div>
          )}
      {reports.length > 0 && (
        <div className="pagination-controls" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center', alignItems: 'center' }}>
          <button 
            className="btn-secondary" 
            disabled={!hasPrev || loading} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: (!hasPrev || loading) ? 'not-allowed' : 'pointer', opacity: (!hasPrev || loading) ? 0.6 : 1 }}
          >
            ← Page Précédente
          </button>
          <span style={{ fontWeight: 500, color: '#475569', minWidth: '80px', textAlign: 'center', fontSize: '0.95rem' }}>Page {page}</span>
          <button 
            className="btn-secondary" 
            disabled={!hasNext || loading} 
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: (!hasNext || loading) ? 'not-allowed' : 'pointer', opacity: (!hasNext || loading) ? 0.6 : 1 }}
          >
            Page Suivante →
          </button>
        </div>
      )}
    </div>
  )
}