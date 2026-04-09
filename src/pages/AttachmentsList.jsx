import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAttachments, deleteAttachment, uploadAttachment } from '../api/attachmentsApi'
import { getMedicalCases } from '../api/medicalCasesApi'

const FILE_TYPE_LABELS = { PDF: 'PDF', IMAGE: 'Image', VIDEO: 'Video', DICOM: 'DICOM' }

export default function AttachmentsList() {
  const [attachments, setAttachments] = useState([])
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [searchParams] = useSearchParams()
  const filterCase = searchParams.get('medical_case') || ''
  const navigate = useNavigate()

  useEffect(() => {
    loadCases()
  }, [])

  useEffect(() => {
    loadAttachments()
  }, [filterCase])

  const loadCases = async () => {
    try {
      const data = await getMedicalCases()
      setCases(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadAttachments = async () => {
    try {
      setLoading(true)
      const params = filterCase ? { medical_case: filterCase } : {}
      const data = await getAttachments(params)
      setAttachments(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError('Failed to load attachments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getFileType = (file) => {
    const mime = file.type
    if (mime.includes('pdf')) return 'PDF'
    if (mime.includes('image')) return 'IMAGE'
    if (mime.includes('video')) return 'VIDEO'
    if (mime.includes('dicom') || file.name.toLowerCase().endsWith('.dcm')) return 'DICOM'
    return 'PDF'
  }
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    console.log("Selected file:", file)
    if (!file) return

    const medicalCase = filterCase || (cases[0]?.id)
    if (!medicalCase) {
      setError('Select a medical case first or filter by case.')
      return
    }

    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('medical_case', medicalCase)

      formData.append('file_type', getFileType(file))

      await uploadAttachment(formData)
      loadAttachments()
      e.target.value = ''
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attachment?')) return
    try {
      await deleteAttachment(id)
      setAttachments(attachments.filter((a) => a.id !== id))
    } catch (err) {
      setError('Failed to delete')
    }
  }

  const handleFilterChange = (caseId) => {
    if (caseId) navigate(`/attachments?medical_case=${caseId}`)
    else navigate('/attachments')
  }

  const getRelativeUrl = (url) => {
    if (url && url.includes('/media/')) {
      return url.substring(url.indexOf('/media/'))
    }
    return url || ''
  }

  if (loading && attachments.length === 0) return <div className="loading">Loading attachments...</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Attachments</h1>
        <div className="list-header-actions">
          <select
            value={filterCase}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="">All cases</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || `Case ${String(c.id).slice(0, 8)}…`}
              </option>
            ))}
          </select>
          <label className="btn-primary" style={{ marginBottom: 0 }}>
            {uploading ? 'Uploading…' : '+ Upload file'}
            <input
              type="file"
              accept=".pdf,image/*,video/*,.dcm"
              style={{ display: 'none' }}
              disabled={uploading}
              onChange={handleFileSelect}
            />
          </label>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {attachments.length === 0 ? (
        <p className="empty">No attachments.</p>
      ) : (
        <table className="forms-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Medical case</th>
              <th>Uploaded by</th>
              <th>Uploaded at</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((a) => (
              <tr key={a.id}>
                <td>{FILE_TYPE_LABELS[a.file_type] ?? a.file_type}</td>
                <td>
                  {a.medical_case_name ? (
                    <strong>{a.medical_case_name}</strong>
                  ) : a.medical_case ? (
                    String(a.medical_case).slice(0, 8) + '…'
                  ) : (
                    '—'
                  )}
                </td>
                <td>{a.uploaded_by_name ?? '—'}</td>
                <td>{new Date(a.uploaded_at).toLocaleString()}</td>
                <td className="actions">
                  {a.file && (
                    <a href={getRelativeUrl(a.file)} target="_blank" rel="noopener noreferrer" className="btn-small btn-secondary">Open</a>
                  )}
                  <button className="btn-small btn-danger" onClick={() => handleDelete(a.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
