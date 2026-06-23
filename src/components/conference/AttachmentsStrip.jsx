import { FileText, Image, Video, Eye } from 'lucide-react'

/**
 * Permanent horizontal strip showing all case attachments.
 * Always visible above the ConferenceControls bar — never scrolls away.
 */
export default function AttachmentsStrip({ attachments, onPreview }) {
  if (!attachments || attachments.length === 0) return null

  const getFileIcon = (file) => {
    const t = (file.fileType || file.file_type || '').toUpperCase()
    if (t.startsWith('IMAGE/') || t === 'IMAGE') return <Image size={13} />
    if (t.startsWith('VIDEO/') || t === 'VIDEO') return <Video size={13} />
    return <FileText size={13} />
  }

  const isPreviewable = (file) => {
    const t = (file.fileType || file.file_type || '').toUpperCase()
    return (
      t.startsWith('IMAGE/') || t === 'IMAGE' ||
      t.startsWith('VIDEO/') || t === 'VIDEO' ||
      t === 'PDF' || t === 'APPLICATION/PDF'
    )
  }

  const getLabel = (file) => file.name || file.original_filename || file.file_name || 'Fichier'

  return (
    <div className="attachments-strip" role="toolbar" aria-label="Pièces jointes">
      <span className="attachments-strip-label">
        <FileText size={13} />
        Pièces jointes
      </span>
      <div className="attachments-strip-items">
        {attachments.map((file) => (
          <div
            key={file.id || file.originalId || getLabel(file)}
            className="attachments-strip-item"
            title={getLabel(file)}
          >
            <span className="strip-file-icon">{getFileIcon(file)}</span>
            <span className="strip-file-name">{getLabel(file)}</span>
            <div className="strip-actions">
              {isPreviewable(file) && onPreview && (
                <button
                  onClick={() => onPreview(file)}
                  title="Aperçu"
                  className="strip-action-btn"
                >
                  <Eye size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
