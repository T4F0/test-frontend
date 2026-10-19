import { Layers, X } from 'lucide-react'
import { resolveApiUrl } from '../../api/config'

/** Bottom drawer listing the conference's DICOM studies and series. */
export default function DicomSeriesDrawer({ studies, activeSeriesUid, onSelectSeries, onClose }) {
  return (
    <div className="dicom-series-drawer">
      <div className="dicom-series-drawer-header">
        <h4>Séries & Coupes Cliniques</h4>
        <button className="btn-close-drawer" onClick={onClose} aria-label="Fermer la liste des séries">
          <X size={16} />
        </button>
      </div>
      <div className="dicom-series-drawer-content">
        {studies.map((study) => (
          <div key={study.study_id} className="dicom-study-group">
            <div className="dicom-study-header">
              <strong>{study.study_description || 'Examen DICOM'}</strong>
              <span>{study.modality} {study.study_date ? `• ${study.study_date}` : ''}</span>
            </div>
            <div className="dicom-series-cards-row">
              {(study.series || []).map((ser) => {
                const uid = ser.series_instance_uid || ser.series_id
                return (
                  <button
                    type="button"
                    key={ser.series_id || ser.series_instance_uid}
                    className={`dicom-series-card ${activeSeriesUid === uid ? 'is-active' : ''}`}
                    onClick={() => onSelectSeries(ser)}
                    aria-pressed={activeSeriesUid === uid}
                  >
                    <div className="series-card-thumb">
                      {ser.slices?.[0]?.thumbnail_url ? (
                        <img src={resolveApiUrl(ser.slices[0].thumbnail_url)} alt="Aperçu" />
                      ) : (
                        <Layers size={22} className="series-thumb-placeholder" />
                      )}
                    </div>
                    <div className="series-card-body">
                      <span className="series-card-desc">{ser.series_description || `Série ${ser.series_number || 1}`}</span>
                      <span className="series-card-slices">{ser.slice_count || ser.slices?.length || 1} coupe(s)</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
