import { ShieldCheck } from 'lucide-react'

/** Read-only overlay in the four corners of the image. */
export default function DicomHud({
  info,
  isAnonymized,
  voi,
  activePreset,
  zoomPct,
  isPresenter,
  isRemotePresenter,
  isFollowing,
  presenterName,
  remoteAuthor,
  orientation,
}) {
  return (
    <div className="dv-hud" aria-hidden="true">
      {orientation && (
        <>
          <span className="dv-orient dv-orient-top">{orientation.top}</span>
          <span className="dv-orient dv-orient-bottom">{orientation.bottom}</span>
          <span className="dv-orient dv-orient-left">{orientation.left}</span>
          <span className="dv-orient dv-orient-right">{orientation.right}</span>
        </>
      )}
      <div className="dv-hud-tl">
        {isAnonymized ? (
          <span className="dv-hud-safe"><ShieldCheck size={13} /> Patient anonymisé</span>
        ) : (
          <>
            {info.patient_name && <strong>{info.patient_name}</strong>}
            {info.patient_id_dicom && <span>ID {info.patient_id_dicom}</span>}
          </>
        )}
        {info.study_description && <span>{info.study_description}</span>}
      </div>

      <div className="dv-hud-tr">
        {!isAnonymized && info.institution_name && <span>{info.institution_name}</span>}
        {info.study_date && <span>{info.study_date}</span>}
        {remoteAuthor && isRemotePresenter && (
          <span style={{ color: remoteAuthor.color }}>● Annotations de {remoteAuthor.name}</span>
        )}
        {isPresenter && <span className="dv-hud-live">● Vous présentez</span>}
        {isRemotePresenter && isFollowing && <span className="dv-hud-follow">● Suivi de {presenterName}</span>}
      </div>

      <div className="dv-hud-bl">
        {voi.windowWidth !== null && (
          <span>
            L {voi.windowWidth} · C {voi.windowCenter}
            {activePreset && <em>{activePreset}</em>}
          </span>
        )}
        <span>Zoom {zoomPct}%</span>
      </div>

    </div>
  )
}
