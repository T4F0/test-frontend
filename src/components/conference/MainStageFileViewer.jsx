import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getAttachmentBlobUrl } from '../../api/attachmentsApi'

export default function MainStageFileViewer({ file, onClose }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')

  // Normalize different API format property names
  const fileUrl = file?.url || file?.file || ''
  const fileName = file?.name || file?.file_name || file?.original_filename || 'Fichier'
  const fileTypeStr = file?.fileType || file?.file_type || ''

  useEffect(() => {
    let objectUrl = ''
    let canceled = false

    const loadPreview = async () => {
      if (!fileUrl) return

      try {
        setPreviewUrl('')
        setPreviewError('')
        objectUrl = await getAttachmentBlobUrl(fileUrl)
        if (!canceled) {
          setPreviewUrl(objectUrl)
        }
      } catch (err) {
        if (!canceled) {
          setPreviewError("Impossible de charger l'aperçu du fichier.")
        }
      }
    }

    loadPreview()

    return () => {
      canceled = true
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl)
      }
    }
  }, [fileUrl])

  const previewType = () => {
    const t = fileTypeStr.toUpperCase()
    if (t.startsWith('IMAGE/') || t === 'IMAGE') return 'image'
    if (t.startsWith('VIDEO/') || t === 'VIDEO') return 'video'
    return 'pdf'
  }

  if (!file) return null

  return (
    <div className="main-stage-file-viewer">
      <div className="main-stage-file-header">
        <h3 className="file-title">{fileName}</h3>
        <button className="btn-close-viewer" onClick={onClose} title="Fermer l'aperçu">
          <X size={24} />
        </button>
      </div>
      <div className="main-stage-file-body">
        {!previewUrl && !previewError && (
          <div className="viewer-loading">
            <div className="loading-spinner" />
            <p>Chargement du fichier...</p>
          </div>
        )}
        {previewError && <div className="viewer-error">{previewError}</div>}
        
        {previewUrl && previewType() === 'image' && (
          <img src={previewUrl} alt={fileName} className="viewer-image" />
        )}
        
        {previewUrl && previewType() === 'video' && (
          <video src={previewUrl} controls autoPlay className="viewer-video">
            Votre navigateur ne supporte pas la lecture de vidéos.
          </video>
        )}
        
        {previewUrl && previewType() === 'pdf' && (
          <iframe src={previewUrl} title={fileName} className="viewer-frame" />
        )}
      </div>
    </div>
  )
}
