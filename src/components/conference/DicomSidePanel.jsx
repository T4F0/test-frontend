import { Images, Layers, X } from 'lucide-react'
import DicomThumbnailPanel from './DicomThumbnailPanel'
import DicomSeriesDrawer from './DicomSeriesDrawer'

/** Left panel with two tabs: slice thumbnails and the dossier's series. */
export default function DicomSidePanel({
  tab,
  onTab,
  onClose,
  slicesCount,
  seriesCount,
  imageIds,
  currentSlice,
  onSliceSelect,
  voiRange,
  studies,
  activeSeriesUid,
  onSelectSeries,
}) {
  return (
    <aside className="dv-panel" aria-label="Coupes et séries">
      <div className="dv-panel-tabs" role="tablist">
        {slicesCount > 1 && (
          <button type="button" role="tab" aria-selected={tab === 'slices'} className={`dv-tab ${tab === 'slices' ? 'is-active' : ''}`} onClick={() => onTab('slices')}>
            <Images size={14} /> Coupes
          </button>
        )}
        {seriesCount > 0 && (
          <button type="button" role="tab" aria-selected={tab === 'series'} className={`dv-tab ${tab === 'series' ? 'is-active' : ''}`} onClick={() => onTab('series')}>
            <Layers size={14} /> Séries
          </button>
        )}
        <button type="button" className="dv-icon-btn dv-panel-close" onClick={onClose} aria-label="Fermer le panneau">
          <X size={16} />
        </button>
      </div>
      <div className="dv-panel-body">
        {tab === 'slices' && slicesCount > 1 && (
          <DicomThumbnailPanel
            imageIds={imageIds}
            currentSlice={currentSlice}
            onSliceSelect={onSliceSelect}
            totalSlices={slicesCount}
            voiRange={voiRange}
          />
        )}
        {tab === 'series' && seriesCount > 0 && (
          <DicomSeriesDrawer studies={studies} activeSeriesUid={activeSeriesUid} onSelectSeries={onSelectSeries} />
        )}
      </div>
    </aside>
  )
}
