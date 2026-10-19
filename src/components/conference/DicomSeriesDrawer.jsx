import { Layers } from 'lucide-react'
import { resolveApiUrl } from '../../api/config'

/** Study / series list (content of the side panel's "Séries" tab). */
export default function DicomSeriesDrawer({ studies, activeSeriesUid, onSelectSeries }) {
  return (
    <div className="dv-series">
      {studies.map((study) => (
        <section key={study.study_id} className="dv-study">
          <header className="dv-study-head">
            <strong>{study.study_description || 'Examen DICOM'}</strong>
            <span>{[study.modality, study.study_date].filter(Boolean).join(' · ')}</span>
          </header>
          {(study.series || []).map((ser) => {
            const uid = ser.series_instance_uid || ser.series_id
            const count = ser.slice_count || ser.slices?.length || 1
            return (
              <button
                type="button"
                key={ser.series_id || ser.series_instance_uid}
                className={`dv-series-card ${activeSeriesUid === uid ? 'is-active' : ''}`}
                onClick={() => onSelectSeries(ser)}
                aria-pressed={activeSeriesUid === uid}
              >
                <span className="dv-series-thumb">
                  {ser.slices?.[0]?.thumbnail_url ? (
                    <img src={resolveApiUrl(ser.slices[0].thumbnail_url)} alt="" />
                  ) : (
                    <Layers size={20} />
                  )}
                </span>
                <span className="dv-series-info">
                  <span className="dv-series-name">{ser.series_description || `Série ${ser.series_number || 1}`}</span>
                  <span className="dv-series-count">{count} coupe{count > 1 ? 's' : ''}</span>
                </span>
              </button>
            )
          })}
        </section>
      ))}
    </div>
  )
}
