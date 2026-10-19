import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { CINE_SPEEDS } from '../../lib/dicomTools'

/** Floating scroll / cine controls shown over the bottom of the image. */
export default function DicomSliceBar({ current, total, onChange, playing, onTogglePlay, fps, onFps }) {
  return (
    <div className="dv-slicebar" role="group" aria-label="Navigation dans la série">
      <button type="button" className="dv-icon-btn" onClick={() => onChange(current - 1)} disabled={current <= 0} aria-label="Coupe précédente" title="Coupe précédente (↑)">
        <ChevronLeft size={17} />
      </button>
      <input
        type="range"
        className="dv-slider"
        min={0}
        max={total - 1}
        value={current}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        aria-label="Position dans la série"
        aria-valuetext={`Coupe ${current + 1} sur ${total}`}
        style={{ '--dv-fill': `${total > 1 ? (current / (total - 1)) * 100 : 0}%` }}
      />
      <button type="button" className="dv-icon-btn" onClick={() => onChange(current + 1)} disabled={current >= total - 1} aria-label="Coupe suivante" title="Coupe suivante (↓)">
        <ChevronRight size={17} />
      </button>
      <span className="dv-slice-count" aria-live="off">{current + 1}<span>/{total}</span></span>
      <span className="dv-divider" />
      <button
        type="button"
        className={`dv-icon-btn ${playing ? 'is-active' : ''}`}
        onClick={onTogglePlay}
        aria-pressed={playing}
        aria-label={playing ? 'Mettre en pause' : 'Lecture continue'}
        title={playing ? 'Pause (Espace)' : 'Lecture continue (Espace)'}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <select className="dv-select" value={fps} onChange={(e) => onFps(Number(e.target.value))} aria-label="Vitesse de lecture" title="Vitesse de lecture">
        {CINE_SPEEDS.map((v) => (
          <option key={v} value={v}>{v} i/s</option>
        ))}
      </select>
    </div>
  )
}
