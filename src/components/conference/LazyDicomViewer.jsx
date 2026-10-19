import { lazy, Suspense } from 'react'
import '../../styles/dicom-viewer.css'

// Cornerstone is ~4 MB: only download it when someone actually opens an image
const DicomViewer = lazy(() => import('./DicomViewer'))

export default function LazyDicomViewer(props) {
  return (
    <Suspense
      fallback={
        <div className="dicom-suspense-fallback" role="status">
          <div className="loading-spinner" />
          <p>Chargement de la visionneuse…</p>
        </div>
      }
    >
      <DicomViewer {...props} />
    </Suspense>
  )
}
