import { useEffect, useRef } from 'react'
import DicomViewer from './LazyDicomViewer'

export default function DicomModal({ file, onClose }) {
  const windowRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Move focus into the dialog and give it back to the opener on close
  useEffect(() => {
    if (!file) return undefined
    const opener = document.activeElement
    windowRef.current?.focus()
    return () => opener?.focus?.()
  }, [file])

  if (!file) return null

  return (
    <div className="dicom-modal-backdrop" onClick={onClose}>
      <div
        ref={windowRef}
        className="dicom-modal-window"
        role="dialog"
        aria-modal="true"
        aria-label="Visionneuse DICOM"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <DicomViewer file={file} onClose={onClose} />
      </div>
    </div>
  )
}
