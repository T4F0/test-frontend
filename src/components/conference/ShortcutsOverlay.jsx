import { Keyboard, X } from 'lucide-react'
import { SHORTCUTS } from '../../lib/dicomTools'

export default function ShortcutsOverlay({ onClose }) {
  return (
    <div className="dicom-shortcuts-overlay" role="dialog" aria-label="Raccourcis clavier" onClick={onClose}>
      <div className="dicom-shortcuts-card" onClick={(e) => e.stopPropagation()}>
        <div className="dicom-arrow-naming-header">
          <div className="dicom-arrow-naming-title">
            <Keyboard size={18} />
            <span>Raccourcis clavier</span>
          </div>
          <button type="button" className="dicom-arrow-naming-close" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        <dl className="dicom-shortcuts-list">
          {SHORTCUTS.map(([keys, desc]) => (
            <div key={keys} className="dicom-shortcuts-row">
              <dt><kbd className="dicom-kbd-shortcut">{keys}</kbd></dt>
              <dd>{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
