import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAttachments, deleteAttachment, uploadAttachment, downloadAttachment } from '../api/attachmentsApi'
import { getSubmissions } from '../api/submissionsApi'
import { formatDate } from '../lib/dateUtils'
import { Download } from 'lucide-react'

const FILE_TYPE_LABELS = { PDF: 'PDF', IMAGE: 'Image', VIDEO: 'Video', DICOM: 'DICOM' }

export default function AttachmentsList() {
  const [attachments, setAttachments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const abortControllerRef = useRef(null)
  const [searchParams] = useSearchParams()
  const filterSubmission = searchParams.get('submission') || ''
  const navigate = useNavigate()

  useEffect(() => {
    loadSubmissions()
  }, [])

  useEffect(() => {
    loadAttachments()
  }, [filterSubmission])

  const loadSubmissions = async () => {
    try {
      const data = await getSubmissions()
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadAttachments = async () => {
    if (!filterSubmission) {
      setAttachments([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const params = { submission: filterSubmission }
      const data = await getAttachments(params)
      setAttachments(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError('Échec du chargement des pièces jointes')
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
    if (!file) return

    if (!filterSubmission) {
      setError('Sélectionnez d\'abord une soumission (dossier) pour y ajouter un fichier.')
      return
    }

    const allowedExtensions = [
      '.pdf', '.docx', '.doc', '.txt',
      '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp',
      '.mp4', '.avi', '.mov', '.webm', '.mpeg',
      '.dcm', '.dicom', '.ima'
    ]
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      setError(`Le format de fichier "${ext}" n'est pas autorisé. Formats acceptés : PDF, Word, Texte, Images, Vidéos et DICOM.`)
      e.target.value = ''
      return
    }

    try {
      setUploading(true)
      setError(null)
      abortControllerRef.current = new AbortController()

      const formData = new FormData()
      formData.append('file', file)
      formData.append('submission', filterSubmission)
      formData.append('file_type', getFileType(file))

      await uploadAttachment(formData, abortControllerRef.current.signal)
      loadAttachments()
      e.target.value = ''
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        console.log('Upload canceled by user')
      } else {
        setError('Échec du téléchargement')
      }
    } finally {
      setUploading(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette pièce jointe ?')) return
    try {
      await deleteAttachment(id)
      setAttachments(attachments.filter((a) => a.id !== id))
    } catch (err) {
      setError('Échec de la suppression')
    }
  }

  const handleFilterChange = (id) => {
    if (id) navigate(`/attachments?submission=${id}`)
    else navigate('/attachments')
  }

  const getRelativeUrl = (url) => {
    if (url && url.includes('/media/')) {
      return url.substring(url.indexOf('/media/'))
    }
    return url || ''
  }

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>📎 Pièces jointes</h1>
        <div className="list-header-actions">
          <select
            value={filterSubmission}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="">-- Sélectionner un dossier (soumission) --</option>
            {submissions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.patient_name} - {s.name || s.form_name}
              </option>
            ))}
          </select>
          {filterSubmission && (
            <div className="attachments-upload-row">
              <label className="btn-primary attachments-upload-btn">
                {uploading ? 'Upload en cours…' : '+ Uploader un fichier'}
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.webp,.tiff,.bmp,.mp4,.avi,.mov,.webm,.mpeg,.dcm,.dicom,.ima"
                  style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={handleFileSelect}
                />
              </label>
              {uploading && (
                <button 
                  className="btn-danger btn-small"
                  onClick={handleCancelUpload}
                >
                  Annuler
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      {!filterSubmission ? (
        <div className="empty-inline-card">
          <p>Veuillez sélectionner un dossier (soumission de formulaire) pour voir et gérer ses pièces jointes.</p>
        </div>
      ) : loading && attachments.length === 0 ? (
        <div className="loading">Chargement...</div>
      ) : attachments.length === 0 ? (
        <p className="empty">Aucune pièce jointe pour ce dossier.</p>
      ) : (
        <>
        <div className="attachments-table-wrapper table-responsive-wrapper">
          <table className="forms-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Nom du fichier</th>
                <th>Dossier RCP</th>
                <th>Téléchargé par</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((a) => (
                <tr key={a.id}>
                  <td><span className={`file-type-badge ${a.file_type.toLowerCase()}`}>{FILE_TYPE_LABELS[a.file_type] ?? a.file_type}</span></td>
                  <td><strong>{a.file_name || 'Sans titre'}</strong></td>
                  <td className="text-muted">{a.submission_name || '—'}</td>
                  <td>{a.uploaded_by_name ?? '—'}</td>
                  <td>{formatDate(a.uploaded_at)}</td>
                  <td className="actions">
                    {a.file && (
                      <>
                        <button 
                          className="btn-small btn-outline" 
                          onClick={() => downloadAttachment(getRelativeUrl(a.file), null)}
                        >
                          Ouvrir
                        </button>
                        <button 
                          className="btn-small btn-secondary" 
                          onClick={() => downloadAttachment(getRelativeUrl(a.file), a.file_name)}
                        >
                          <Download size={12} />
                          Télécharger
                        </button>
                      </>
                    )}
                    <button className="btn-small btn-danger" onClick={() => handleDelete(a.id)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-cards">
          {attachments.map((a) => (
            <div key={a.id} className="mobile-card">
              <div className="mobile-card-header">
                <div className="mobile-card-title">
                  <span className={`file-type-badge ${(a.file_type || '').toLowerCase()}`} style={{display: 'inline-block', marginBottom: '0.35rem'}}>
                    {FILE_TYPE_LABELS[a.file_type] ?? a.file_type}
                  </span>
                  <strong>{a.file_name || 'Sans titre'}</strong>
                </div>
              </div>
              <div className="mobile-card-body">
                <span className="text-muted">{a.submission_name || '—'}</span>
                <span className="text-muted" style={{fontSize: '0.8rem', marginLeft: 'auto'}}>
                  {a.uploaded_by_name ?? '—'} · {formatDate(a.uploaded_at)}
                </span>
              </div>
              <div className="mobile-card-actions">
                {a.file && (
                  <>
                    <button className="btn-small btn-outline" onClick={() => downloadAttachment(getRelativeUrl(a.file), null)}>
                      Ouvrir
                    </button>
                    <button className="btn-small btn-secondary" onClick={() => downloadAttachment(getRelativeUrl(a.file), a.file_name)}>
                      <Download size={12} />
                      Télécharger
                    </button>
                  </>
                )}
                <button className="btn-small btn-danger" onClick={() => handleDelete(a.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  )
}
