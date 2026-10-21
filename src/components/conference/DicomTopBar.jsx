import { Shield, ShieldCheck, Images, Layers, Radio, Eye, EyeOff, MousePointer2, Keyboard, X, ImagePlus } from 'lucide-react'

/** Title, panel toggles, anonymisation and the three presenter states. */
export default function DicomTopBar({
  title,
  modality,
  subtitle,
  isAnonymized,
  onToggleAnonymized,
  sidePanel,
  onSidePanel,
  slicesCount,
  seriesCount,
  canPresent,
  isPresenter,
  isRemotePresenter,
  presenterName,
  isFollowing,
  onToggleFollow,
  pointerMode,
  onTogglePointer,
  onRequestPresent,
  onStopPresent,
  showHelp,
  onToggleHelp,
  onClose,
  canSaveFinding,
  showSaveFinding,
  savingFinding,
  onSaveFinding,
}) {
  return (
    <header className="dv-topbar">
      <div className="dv-title">
        <h3 title={title}>{title}</h3>
        {modality && <span className="dv-chip dv-chip-modality">{modality}</span>}
        {subtitle && <span className="dv-subtitle" title={subtitle}>{subtitle}</span>}
      </div>

      <div className="dv-topbar-actions">
        {slicesCount > 1 && (
          <button
            type="button"
            className={`dv-btn ${sidePanel === 'slices' ? 'is-active' : ''}`}
            onClick={() => onSidePanel('slices')}
            aria-pressed={sidePanel === 'slices'}
            title="Panneau des coupes"
          >
            <Images size={16} />
            <span className="dv-btn-label">Coupes</span>
            <span className="dv-count">{slicesCount}</span>
          </button>
        )}
        {seriesCount > 0 && (
          <button
            type="button"
            className={`dv-btn ${sidePanel === 'series' ? 'is-active' : ''}`}
            onClick={() => onSidePanel('series')}
            aria-pressed={sidePanel === 'series'}
            title="Séries du dossier"
          >
            <Layers size={16} />
            <span className="dv-btn-label">Séries</span>
            <span className="dv-count">{seriesCount}</span>
          </button>
        )}

        <button
          type="button"
          className={`dv-btn ${isAnonymized ? 'is-safe' : ''}`}
          onClick={onToggleAnonymized}
          aria-pressed={isAnonymized}
          title={isAnonymized ? 'Afficher les identifiants patient' : 'Masquer les identifiants patient (protection des données)'}
        >
          {isAnonymized ? <ShieldCheck size={16} /> : <Shield size={16} />}
          <span className="dv-btn-label">{isAnonymized ? 'Anonymisé' : 'Anonymiser'}</span>
        </button>

        {showSaveFinding && (
          <button
            type="button"
            className="dv-btn"
            onClick={onSaveFinding}
            disabled={savingFinding || !canSaveFinding}
            title={canSaveFinding ? 'Enregistrer cette image et les mesures dans le dossier du patient' : "Disponible pour une image ouverte depuis un dossier patient"}
          >
            <ImagePlus size={16} />
            <span className="dv-btn-label">{savingFinding ? 'Enregistrement…' : 'Image clé'}</span>
          </button>
        )}

        <span className="dv-divider" />

        {isPresenter && (
          <div className="dv-live">
            <span className="dv-live-dot" />
            <span className="dv-live-text">En direct</span>
            <button
              type="button"
              className={`dv-mini ${pointerMode ? 'is-on' : ''}`}
              onClick={onTogglePointer}
              aria-pressed={pointerMode}
              title="Pointeur laser visible par les participants"
            >
              <MousePointer2 size={13} /> Pointeur
            </button>
            <button type="button" className="dv-mini is-stop" onClick={onStopPresent} title="Arrêter la présentation">
              Arrêter
            </button>
          </div>
        )}

        {isRemotePresenter && !isPresenter && (
          <div className={`dv-follow ${isFollowing ? 'is-following' : 'is-paused'}`}>
            {isFollowing ? <Eye size={15} /> : <EyeOff size={15} />}
            <span className="dv-follow-text">
              {isFollowing ? 'Suivi de ' : 'En pause · '}
              <strong>{presenterName}</strong>
            </span>
            <button type="button" className="dv-mini" onClick={onToggleFollow}>
              {isFollowing ? 'Mettre en pause' : 'Reprendre'}
            </button>
          </div>
        )}

        {!isPresenter && !isRemotePresenter && canPresent && (
          <button type="button" className="dv-btn is-primary" onClick={onRequestPresent} title="Présenter cette imagerie à tous les participants">
            <Radio size={16} />
            <span className="dv-btn-label">Présenter</span>
          </button>
        )}

        <button
          type="button"
          className={`dv-icon-btn ${showHelp ? 'is-active' : ''}`}
          onClick={onToggleHelp}
          aria-pressed={showHelp}
          aria-label="Raccourcis clavier"
          title="Raccourcis clavier (?)"
        >
          <Keyboard size={17} />
        </button>
        <button type="button" className="dv-icon-btn" onClick={onClose} aria-label="Fermer l'imagerie" title="Fermer (Échap)">
          <X size={19} />
        </button>
      </div>
    </header>
  )
}
