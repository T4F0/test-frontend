import { useEffect } from 'react'
import DicomViewer from './DicomViewer'

export default function DicomModal({ file, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!file) return null

  return (
    <div
      className="dicom-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <div
        className="dicom-modal-window"
        style={{
          width: '95vw',
          height: '90vh',
          maxWidth: '1400px',
          backgroundColor: '#0b1120',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DicomViewer file={file} onClose={onClose} />
      </div>
    </div>
  )
}
