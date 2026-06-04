import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getAttachmentBlobUrl } from '../../api/attachmentsApi'

export default function MainStageFileViewer({ file, onClose }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')

  useEffect(() => {
    let objectUrl = ''
    let canceled = false

    const loadPreview = async () => {
      if (!file) return

      try {
        setPreviewUrl('')
        setPreviewError('')
        objectUrl = await getAttachmentBlobUrl(file.url)
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
  }, [file])

  const previewType = (fileItem) => {
    const t = fileItem?.fileType?.toUpperCase() || ''
    if (t.startsWith('IMAGE/') || t === 'IMAGE') return 'image'
    if (t.startsWith('VIDEO/') || t === 'VIDEO') return 'video'
    return 'pdf'
  }

  if (!file) return null

  return (
    <div className="main-stage-file-viewer">
      <div className="main-stage-file-header">
        <h3 className="file-title">{file.name}</h3>
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
        
        {previewUrl && previewType(file) === 'image' && (
          <img src={previewUrl} alt={file.name} className="viewer-image" />
        )}
        
        {previewUrl && previewType(file) === 'video' && (
          <video src={previewUrl} controls autoPlay className="viewer-video">
            Votre navigateur ne supporte pas la lecture de vidéos.
          </video>
        )}
        
        {previewUrl && previewType(file) === 'pdf' && (
          <iframe src={previewUrl} title={file.name} className="viewer-frame" />
        )}
      </div>
    </div>
  )
}
