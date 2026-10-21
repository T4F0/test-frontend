import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAttachments, deleteAttachment, uploadAttachment, downloadAttachment } from '../api/attachmentsApi'
import { getSubmissions } from '../api/submissionsApi'
import { formatDate } from '../lib/dateUtils'
import { Download, Paperclip, FolderOpen, Trash2 } from 'lucide-react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import RowActionMenu from '../components/RowActionMenu'
import { sortRows } from '../lib/sorting'
import DicomModal from '../components/conference/DicomModal'
import PageTitle from '../components/PageTitle'
import { useConfirm } from '../components/ConfirmDialog'

const FILE_TYPE_LABELS = { PDF: 'PDF', IMAGE: 'Image', VIDEO: 'Video', DICOM: 'DICOM' }

export default function AttachmentsList() {
  const confirm = useConfirm()
  const [attachments, setAttachments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' })
  const [selectedDicom, setSelectedDicom] = useState(null)
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
    if (!(await confirm({ title: 'Supprimer cette pièce jointe ?', message: 'Le fichier sera définitivement supprimé.', confirmLabel: 'Supprimer', danger: true }))) return
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
    if (url && url.includes('/api/media/')) {
      return url.substring(url.indexOf('/api/media/'))
    }
    if (url && url.includes('/media/')) {
      return url.substring(url.indexOf('/media/'))
    }
    return url || ''
  }

  const isDicomAttachment = (a) => {
    const t = (a?.file_type || '').toUpperCase()
    const n = (a?.file_name || '').toLowerCase()
    return t === 'DICOM' || t === 'APPLICATION/DICOM' || n.endsWith('.dcm') || n.endsWith('.dicom') || n.endsWith('.ima')
  }

  const handleOpenAttachment = (a) => {
    if (isDicomAttachment(a)) {
      setSelectedDicom({
        id: a.id,
        name: a.file_name || 'DICOM',
        file: getRelativeUrl(a.file),
        url: getRelativeUrl(a.file),
        file_type: 'DICOM',
        submission: a.submission,
      })
    } else {
      downloadAttachment(getRelativeUrl(a.file), null)
    }
  }

  return (
    <div className="list-container">
      <div className="list-header">
        <PageTitle icon={Paperclip}>Pièces jointes</PageTitle>
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
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Fichier', sortable: true, render: (a) => (
              <>
                <span className={`file-type-badge ${(a.file_type || '').toLowerCase()}`} style={{ marginRight: 8 }}>{FILE_TYPE_LABELS[a.file_type] ?? a.file_type}</span>
                <strong>{a.file_name || 'Sans titre'}</strong>
              </>
            ) },
            { key: 'submission', label: 'Dossier RCP', render: (a) => <span className="text-muted">{a.submission_name || '—'}</span> },
            { key: 'by', label: 'Téléchargé par', sortable: true, render: (a) => a.uploaded_by_name ?? '—' },
            { key: 'date', label: 'Date', sortable: true, render: (a) => formatDate(a.uploaded_at) },
          ]}
          rows={sortRows(attachments, sort, {
            name: (a) => a.file_name,
            by: (a) => a.uploaded_by_name,
            date: (a) => new Date(a.uploaded_at),
          })}
          sort={sort}
          onSortChange={setSort}
          loading={loading && attachments.length === 0}
          empty={<EmptyState icon={Paperclip} title="Aucune pièce jointe" description="Ajoutez un fichier avec « Uploader un fichier » ci-dessus." />}
          actions={(a) => (
            <div className="ui-row-actions">
              {a.file && (
                <button type="button" className="ui-primary-action" onClick={() => handleOpenAttachment(a)}>
                  <FolderOpen size={15} aria-hidden="true" /> Ouvrir
                </button>
              )}
              <RowActionMenu
                label={`Autres actions pour ${a.file_name || 'ce fichier'}`}
                items={[
                  { label: 'Télécharger', icon: Download, hidden: !a.file, onClick: () => downloadAttachment(getRelativeUrl(a.file), a.file_name) },
                  { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => handleDelete(a.id) },
                ]}
              />
            </div>
          )}
        />
      )}

      <DicomModal file={selectedDicom} onClose={() => setSelectedDicom(null)} />
    </div>
  )
}
