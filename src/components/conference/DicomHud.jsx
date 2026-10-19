import { ShieldCheck } from 'lucide-react'

/** Read-only metadata overlay drawn on top of the image. */
export default function DicomHud({
  info,
  isAnonymized,
  totalSlices,
  currentSlice,
  voi,
  activePreset,
  zoomPct,
  isPresenter,
  isRemotePresenter,
  isFollowing,
  presenterName,
  remoteAuthor,
}) {
  return (
    <div className="dicom-hud">
      <div className="dicom-hud-top-left">
        {isAnonymized ? (
          <span className="dicom-hud-patient-anonymized">
            <ShieldCheck size={13} />
            [PATIENT ANONYMISÉ]
          </span>
        ) : (
          info.patient_name && <span>{info.patient_name}</span>
        )}
        {isAnonymized ? (
          <span className="dicom-hud-id">ID: ••••••••</span>
        ) : (
          info.patient_id_dicom && <span className="dicom-hud-id">ID: {info.patient_id_dicom}</span>
        )}
        {info.modality && (
          <span>
            {info.modality}
            {info.study_description ? ` — ${info.study_description}` : ''}
          </span>
        )}
        {totalSlices > 1 && <span className="dicom-hud-slice">Coupe: {currentSlice + 1} / {totalSlices}</span>}
        <span>Zoom: {zoomPct}%</span>
        {voi.windowWidth !== null && (
          <span>
            W: {voi.windowWidth} C: {voi.windowCenter}
            {activePreset && <span className="dicom-hud-preset-tag">{activePreset}</span>}
          </span>
        )}
      </div>
      <div className="dicom-hud-top-right">
        <span>{isAnonymized ? '[ÉTABLISSEMENT MASQUÉ]' : (info.institution_name || '')}</span>
        {info.study_date && <span>{info.study_date}</span>}
        {isAnonymized && (
          <span className="dicom-hud-phi-flag">
            <ShieldCheck size={12} />
            PHI MASQUÉ
          </span>
        )}
        {remoteAuthor && isRemotePresenter && (
          <span className="dicom-hud-author" style={{ color: remoteAuthor.color }}>
            ● Annotations de {remoteAuthor.name}
          </span>
        )}
        {isPresenter && <span className="dicom-hud-presenter-flag">● VOUS PRÉSENTEZ</span>}
        {isRemotePresenter && isFollowing && (
          <span className="dicom-hud-following-flag">● SUIVI DE {presenterName.toUpperCase()}</span>
        )}
      </div>
    </div>
  )
}
