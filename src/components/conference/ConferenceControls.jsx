import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Hand, PhoneOff, LogOut, Maximize2, Minimize2, ALargeSmall, RotateCcw } from 'lucide-react'

/**
 * Bottom control bar for the conference.
 */
export default function ConferenceControls({
  isMuted,
  isCameraOff,
  isScreenSharing,
  isHandRaised,
  isHost,
  isFullscreen,
  formFontScale = 1,
  onFormFontScaleChange,
  isFormOpen = false,
  onToggleMute,
  onToggleCamera,
  onStartScreenShare,
  onStopScreenShare,
  onRaiseHand,
  onLeave,
  onEndMeeting,
  onToggleFullscreen,
}) {
  return (
    <div className="conference-controls">
      <div className="controls-left">
        <button
          className={`control-btn ${isMuted ? 'active-danger' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Activer le micro' : 'Désactiver le micro'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          <span className="control-label">{isMuted ? 'Activer micro' : 'Muet'}</span>
        </button>

        <button
          className={`control-btn ${isCameraOff ? 'active-danger' : ''}`}
          onClick={onToggleCamera}
          title={isCameraOff ? 'Activer la caméra' : 'Désactiver la caméra'}
        >
          {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          <span className="control-label">{isCameraOff ? 'Vidéo' : 'Arrêter Vidéo'}</span>
        </button>

        <button
          className={`control-btn ${isScreenSharing ? 'active-primary' : ''}`}
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
        >
          {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
          <span className="control-label">{isScreenSharing ? 'Arrêter partage' : 'Partager écran'}</span>
        </button>

        <button
          className={`control-btn ${isHandRaised ? 'active-warning' : ''}`}
          onClick={onRaiseHand}
          title={isHandRaised ? 'Baisser la main' : 'Lever la main'}
        >
          <Hand size={22} />
          <span className="control-label">{isHandRaised ? 'Baisser la main' : 'Lever la main'}</span>
        </button>

        <button
          className={`control-btn ${isFullscreen ? 'active-primary' : ''}`}
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        >
          {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
          <span className="control-label">{isFullscreen ? 'Réduire' : 'Plein écran'}</span>
        </button>

        {/* Volume bar for form visualization font size (75% - 175%) */}
        <div
          className={`control-btn control-font-volume ${isFormOpen ? 'form-active' : ''}`}
          title="Taille d'affichage des formulaires pour votre écran (75% à 175%)"
        >
          <div className="font-volume-bar-row">
            <ALargeSmall size={19} className="font-volume-icon" />
            <input
              type="range"
              min="0.75"
              max="1.75"
              step="0.05"
              value={formFontScale}
              onChange={(e) => onFormFontScaleChange && onFormFontScaleChange(parseFloat(e.target.value))}
              onDoubleClick={() => onFormFontScaleChange && onFormFontScaleChange(1.0)}
              className="font-volume-slider"
              style={{
                '--slider-fill': `${Math.max(0, Math.min(100, ((formFontScale - 0.75) / (1.75 - 0.75)) * 100))}%`
              }}
              aria-label="Taille du texte du formulaire"
            />
            <span className="font-volume-pct">{Math.round(formFontScale * 100)}%</span>
            {formFontScale !== 1 && (
              <button
                type="button"
                className="font-volume-reset-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onFormFontScaleChange && onFormFontScaleChange(1.0)
                }}
                title="Réinitialiser la taille à 100%"
                aria-label="Réinitialiser à 100%"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
          <span className="control-label">Taille dossier</span>
        </div>
      </div>

      <div className="controls-right">
        <button
          className="control-btn leave-btn"
          onClick={onLeave}
          title="Quitter la réunion"
        >
          <LogOut size={22} />
          <span className="control-label">Quitter</span>
        </button>

        {isHost && (
          <button
            className="control-btn end-btn"
            onClick={onEndMeeting}
            title="Terminer la réunion pour tous"
          >
            <PhoneOff size={22} />
            <span className="control-label">Finir réunion</span>
          </button>
        )}
      </div>
    </div>
  )
}
