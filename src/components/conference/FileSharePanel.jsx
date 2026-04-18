import { useState, useRef } from 'react'
import { Paperclip, Upload, FileText, Image, Download, Eye, X, Save } from 'lucide-react'

/**
 * File sharing panel for conference attachments.
 */
export default function FileSharePanel({
  attachments,
  caseAttachments,
  onUpload,
  onPromote,
  isOpen,
  onToggle,
  isUploading,
  activeCaseId,
}) {
  const [dragActive, setDragActive] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const fileInputRef = useRef(null)

  const normalizeAttachment = (attachment, source) => {
    // Ensure the URL is relative to the current host to avoid cross-origin iframe issues
    // or pointing to the wrong domain (like production Vercel while in development).
    let fileUrl = attachment.file || ''
    if (fileUrl.includes('/media/')) {
      fileUrl = fileUrl.substring(fileUrl.indexOf('/media/'))
    }

    return {
      id: `${source}-${attachment.id}`,
      name: attachment.original_filename || attachment.display_name || 'Attachment',
      url: fileUrl,
      fileType: attachment.file_type || '',
      size: attachment.file_size || null,
      uploadedByName: attachment.uploaded_by_name || 'Unknown',
      source,
      originalId: attachment.id,
    }
  }

  const conferenceFiles = attachments.map((attachment) => normalizeAttachment(attachment, 'meeting'))
  const filteredCaseAttachments = (caseAttachments || []).filter(
    (attachment) => !activeCaseId || attachment.medical_case_id === activeCaseId
  )
  const medicalCaseFiles = filteredCaseAttachments.map((attachment) => normalizeAttachment(attachment, 'case'))

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        onUpload(file)
      })
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        onUpload(file)
      })
    }
    e.target.value = ''
  }

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image size={16} />
    return <FileText size={16} />
  }

  const formatFileSize = (bytes) => {
    if (bytes == null) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const isPreviewable = (file) => file.fileType?.startsWith('image/') || file.fileType === 'PDF' || file.fileType === 'application/pdf'
  const previewType = (file) => (file.fileType?.startsWith('image/') ? 'image' : 'pdf')

  if (!isOpen) return null

  return (
    <div className="sidebar file-sidebar">
      <div className="sidebar-header">
        <h3>
          <Paperclip size={18} />
          Fichiers
        </h3>
        <button className="sidebar-close" onClick={onToggle}>×</button>
      </div>
      <div className="sidebar-content">
        <div
          className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={24} />
          <p>{isUploading ? 'Téléchargement...' : 'Glissez-déposez des fichiers ou cliquez pour télécharger'}</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        <div className="file-section">
          <div className="file-section-title">Pièces jointes du dossier médical</div>
          <div className="file-list">
            {medicalCaseFiles.length === 0 && <p className="no-files">Aucune pièce jointe disponible pour ce dossier</p>}
            {medicalCaseFiles.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-icon">{getFileIcon(file.fileType)}</div>
                <div className="file-info">
                  <span className="file-name" title={file.name}>{file.name}</span>
                  <span className="file-meta">{file.fileType || 'Type inconnu'} · {file.uploadedByName}</span>
                </div>
                <div className="file-actions-inline">
                  {isPreviewable(file) && (
                    <button className="file-action-btn" onClick={() => setPreviewItem(file)} title="Aperçu">
                      <Eye size={16} />
                    </button>
                  )}
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-download" title="Télécharger">
                    <Download size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="file-section">
          <div className="file-section-title">Fichiers partagés pendant la réunion</div>
          <div className="file-list">
            {conferenceFiles.length === 0 && <p className="no-files">Aucun fichier partagé pour le moment</p>}
            {conferenceFiles.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-icon">{getFileIcon(file.fileType)}</div>
                <div className="file-info">
                  <span className="file-name" title={file.name}>{file.name}</span>
                  <span className="file-meta">{[formatFileSize(file.size), file.uploadedByName].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="file-actions-inline">
                  {isPreviewable(file) && (
                    <button className="file-action-btn" onClick={() => setPreviewItem(file)} title="Aperçu">
                      <Eye size={16} />
                    </button>
                  )}
                  <button 
                    className="file-action-btn" 
                    onClick={() => onPromote(file.originalId)} 
                    title="Ajouter au dossier médical"
                  >
                    <Save size={16} />
                  </button>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-download" title="Télécharger">
                    <Download size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {previewItem && (
        <div className="file-preview-modal" onClick={() => setPreviewItem(null)}>
          <div className="file-preview-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="file-preview-header">
              <strong>{previewItem.name}</strong>
              <button className="sidebar-close" onClick={() => setPreviewItem(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="file-preview-body">
              {previewType(previewItem) === 'image' ? (
                <img src={previewItem.url} alt={previewItem.name} className="file-preview-image" />
              ) : (
                <iframe src={previewItem.url} title={previewItem.name} className="file-preview-frame" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
