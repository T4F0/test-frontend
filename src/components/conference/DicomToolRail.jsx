import { useEffect, useRef, useState } from 'react'
import { Trash2, Undo2, SlidersHorizontal, SwatchBook, FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw, Ruler, SunMoon } from 'lucide-react'
import { TOOLS, TOOL_GROUPS, WL_PRESETS } from '../../lib/dicomTools'

/** Vertical tool rail (horizontal strip on narrow viewers). Tooltips come from data-tip. */
export default function DicomToolRail({
  activeTool,
  onTool,
  activePreset,
  showPresetMenu,
  onTogglePresetMenu,
  onApplyPreset,
  selectedCount,
  annotationCount,
  confirmClear,
  onDeleteSelected,
  onClearAll,
  onReset,
  windowValues,
  onSetWindow,
  isInverted,
  onInvert,
  onFlip,
  onRotate,
  showScale,
  onToggleScale,
}) {
  const [imageOpen, setImageOpen] = useState(false)
  const [width, setWidth] = useState('')
  const [center, setCenter] = useState('')
  const railRef = useRef(null)

  // The numeric fields follow the live window while the menu is open
  useEffect(() => {
    if (!showPresetMenu) return
    setWidth(windowValues.windowWidth ?? '')
    setCenter(windowValues.windowCenter ?? '')
  }, [showPresetMenu, windowValues.windowWidth, windowValues.windowCenter])

  // One menu at a time, closed by a click anywhere else
  useEffect(() => {
    if (showPresetMenu) setImageOpen(false)
  }, [showPresetMenu])

  useEffect(() => {
    if (!showPresetMenu && !imageOpen) return undefined
    const onDown = (event) => {
      if (railRef.current?.contains(event.target) && event.target.closest?.('.dv-popover-anchor')) return
      if (showPresetMenu) onTogglePresetMenu()
      setImageOpen(false)
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [imageOpen, onTogglePresetMenu, showPresetMenu])

  const applyWindow = () => onSetWindow(Number(width), Number(center))

  return (
    <div ref={railRef} className="dv-rail" role="toolbar" aria-label="Outils d'imagerie" aria-orientation="vertical">
      {TOOL_GROUPS.map(({ id, label: groupLabel }, index) => (
        <div key={id} className="dv-rail-group" role="group" aria-label={groupLabel}>
          {index > 0 && <hr className="dv-rail-sep" />}
          {TOOLS.filter((t) => t.group === id).map(({ name, icon: Icon, label, key }) => (
            <button
              key={name}
              type="button"
              className={`dv-rail-btn ${activeTool === name ? 'is-active' : ''} ${name === 'Eraser' ? 'is-eraser' : ''}`}
              onClick={() => onTool(name)}
              data-tip={`${label} · ${key.toUpperCase()}`}
              aria-label={label}
              aria-pressed={activeTool === name}
            >
              <Icon size={19} strokeWidth={1.9} />
              <span className="dv-rail-label">{label}</span>
            </button>
          ))}
        </div>
      ))}

      <div className="dv-rail-spacer" />

      <div className="dv-rail-group">
        <hr className="dv-rail-sep" />
        <div className="dv-popover-anchor">
          <button
            type="button"
            className={`dv-rail-btn ${activePreset ? 'has-value' : ''} ${showPresetMenu ? 'is-active' : ''}`}
            onClick={onTogglePresetMenu}
            data-tip={activePreset ? `Fenêtrage : ${activePreset}` : 'Fenêtrage (préréglages) · 1–6'}
            aria-label="Préréglages de fenêtrage"
            aria-haspopup="menu"
            aria-expanded={showPresetMenu}
          >
            <SlidersHorizontal size={19} strokeWidth={1.9} />
            <span className="dv-rail-label">{activePreset || 'Fenêtrage'}</span>
          </button>
          {showPresetMenu && (
            <div className="dv-popover" role="menu">
              <div className="dv-popover-title">Préréglages de fenêtrage</div>
              {WL_PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  role="menuitem"
                  className={`dv-popover-item ${activePreset === p.name ? 'is-selected' : ''}`}
                  onClick={() => onApplyPreset(p)}
                >
                  <kbd className="dicom-kbd-shortcut">{i + 1}</kbd>
                  <span className="dv-popover-main">
                    <span>{p.label}</span>
                    <span className="dv-popover-sub">L {p.windowWidth} · C {p.windowCenter}</span>
                  </span>
                </button>
              ))}
              <form
                className="dv-window-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  applyWindow()
                }}
              >
                <label>
                  Largeur
                  <input type="number" min="1" value={width} onChange={(e) => setWidth(e.target.value)} aria-label="Largeur de fenêtre" />
                </label>
                <label>
                  Centre
                  <input type="number" value={center} onChange={(e) => setCenter(e.target.value)} aria-label="Centre de fenêtre" />
                </label>
                <button type="submit" className="dv-mini">Appliquer</button>
              </form>
            </div>
          )}
        </div>

        <div className="dv-popover-anchor">
          <button
            type="button"
            className={`dv-rail-btn ${imageOpen ? 'is-active' : ''}`}
            onClick={() => {
              if (showPresetMenu) onTogglePresetMenu()
              setImageOpen((v) => !v)
            }}
            data-tip="Image : inverser, miroir, rotation, échelle"
            aria-label="Outils d'image"
            aria-haspopup="menu"
            aria-expanded={imageOpen}
          >
            <SwatchBook size={19} strokeWidth={1.9} />
            <span className="dv-rail-label">Image</span>
          </button>
          {imageOpen && (
            <div className="dv-popover" role="menu">
              <div className="dv-popover-title">Image</div>
              <div className="dv-menu-grid">
                <button type="button" role="menuitemcheckbox" aria-checked={isInverted} className={`dv-menu-tile ${isInverted ? 'is-on' : ''}`} onClick={onInvert}>
                  <SunMoon size={18} /> Inverser
                </button>
                <button type="button" role="menuitem" className="dv-menu-tile" onClick={() => onFlip('h')}>
                  <FlipHorizontal2 size={18} /> Miroir H
                </button>
                <button type="button" role="menuitem" className="dv-menu-tile" onClick={() => onFlip('v')}>
                  <FlipVertical2 size={18} /> Miroir V
                </button>
                <button type="button" role="menuitem" className="dv-menu-tile" onClick={() => onRotate(-90)}>
                  <RotateCcw size={18} /> Rotation −90°
                </button>
                <button type="button" role="menuitem" className="dv-menu-tile" onClick={() => onRotate(90)}>
                  <RotateCw size={18} /> Rotation +90°
                </button>
                <button type="button" role="menuitemcheckbox" aria-checked={showScale} className={`dv-menu-tile ${showScale ? 'is-on' : ''}`} onClick={onToggleScale}>
                  <Ruler size={18} /> Échelle
                </button>
              </div>
            </div>
          )}
        </div>

        <button type="button" className="dv-rail-btn" onClick={onReset} data-tip="Réinitialiser l'affichage · R" aria-label="Réinitialiser l'affichage">
          <Undo2 size={19} strokeWidth={1.9} />
          <span className="dv-rail-label">Réinitialiser</span>
        </button>

        {selectedCount > 0 && (
          <button type="button" className="dv-rail-btn is-danger" onClick={onDeleteSelected} data-tip="Supprimer la sélection · Suppr" aria-label="Supprimer la sélection">
            <Trash2 size={19} strokeWidth={1.9} />
            <span className="dv-rail-label">Supprimer</span>
          </button>
        )}

        <button
          type="button"
          className={`dv-rail-btn ${confirmClear ? 'is-danger is-confirm' : ''}`}
          onClick={onClearAll}
          disabled={annotationCount === 0}
          data-tip={confirmClear ? 'Cliquez à nouveau pour confirmer' : annotationCount ? `Tout effacer (${annotationCount})` : 'Aucune annotation'}
          aria-label="Tout effacer"
        >
          <Trash2 size={19} strokeWidth={1.9} />
          <span className="dv-rail-label">{confirmClear ? 'Confirmer ?' : 'Tout effacer'}</span>
          {annotationCount > 0 && <span className="dv-badge">{annotationCount}</span>}
        </button>
      </div>
    </div>
  )
}
