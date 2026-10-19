import { ArrowUpRight, Check, X } from 'lucide-react'

const QUICK_TERMS = ['Lésion', 'Sténose', 'Calcul', 'Dilatation', 'Tumeur', 'Reflux', 'Polype', 'Adénome', 'Fistule']

/**
 * In-viewer prompt that names an arrow annotation (keeps fullscreen, avoids native browser dialogs).
 * `prompt` is { isEditing } while open.
 */
export default function ArrowLabelDialog({ prompt, text, onTextChange, onConfirm, onCancel, inputRef }) {
  return (
    <div
      className="dicom-arrow-naming-backdrop"
      onClick={onCancel}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="dicom-arrow-naming-modal"
        role="dialog"
        aria-label={prompt.isEditing ? "Modifier l'annotation" : "Nommer l'annotation"}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dicom-arrow-naming-header">
          <div className="dicom-arrow-naming-title">
            <ArrowUpRight size={18} className="dicom-arrow-icon" />
            <span>{prompt.isEditing ? "Modifier l'annotation" : "Nommer l'annotation"}</span>
          </div>
          <button type="button" className="dicom-arrow-naming-close" onClick={onCancel} title="Fermer (Échap)" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="dicom-arrow-naming-body">
          <label className="dicom-arrow-naming-label" htmlFor="dicom-arrow-label-input">Texte du repère :</label>
          <div className="dicom-arrow-input-wrap">
            <input
              id="dicom-arrow-label-input"
              ref={inputRef}
              type="text"
              className="dicom-arrow-naming-input"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onConfirm(text)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  e.stopPropagation()
                  onCancel()
                }
              }}
              placeholder="Ex : Lésion, Sténose, Calcul, Dilatation..."
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="dicom-arrow-quick-section">
            <span className="dicom-arrow-quick-title">Termes fréquents :</span>
            <div className="dicom-arrow-quick-chips">
              {QUICK_TERMS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`dicom-arrow-chip ${text === chip ? 'is-active' : ''}`}
                  onClick={() => {
                    onTextChange(chip)
                    onConfirm(chip)
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="dicom-arrow-naming-footer">
          <button type="button" className="dicom-arrow-btn-cancel" onClick={onCancel}>Annuler</button>
          <button type="button" className="dicom-arrow-btn-confirm" onClick={() => onConfirm(text)}>
            <Check size={15} />
            <span>Valider</span>
          </button>
        </div>
      </div>
    </div>
  )
}
