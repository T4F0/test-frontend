import { useState, useRef } from 'react'
import { Paperclip, Upload, FileText, Image, Download, X } from 'lucide-react'

/**
 * File sharing panel for conference attachments.
 */
export default function FileSharePanel({
  attachments,
  onUpload,
  isOpen,
  onToggle,
  isUploading,
}) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

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
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  if (!isOpen) return null

  return (
    <div className="sidebar file-sidebar">
      <div className="sidebar-header">
        <h3>
          <Paperclip size={18} />
          Files
        </h3>
        <button className="sidebar-close" onClick={onToggle}>×</button>
      </div>
      <div className="sidebar-content">
        {/* Drop zone */}
        <div
          className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={24} />
          <p>{isUploading ? 'Uploading...' : 'Drag & drop files or click to upload'}</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* File list */}
        <div className="file-list">
          {attachments.length === 0 && (
            <p className="no-files">No files shared yet</p>
          )}
          {attachments.map((att) => (
            <div key={att.id} className="file-item">
              <div className="file-icon">
                {getFileIcon(att.file_type)}
              </div>
              <div className="file-info">
                <span className="file-name" title={att.original_filename}>
                  {att.original_filename}
                </span>
                <span className="file-meta">
                  {formatFileSize(att.file_size)} · {att.uploaded_by_name}
                </span>
              </div>
              <a
                href={att.file}
                target="_blank"
                rel="noopener noreferrer"
                className="file-download"
                title="Download"
              >
                <Download size={16} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
