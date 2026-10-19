import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Hand, PhoneOff, LogOut, Maximize2, Minimize2, ALargeSmall, RotateCcw } from 'lucide-react'

/**
 * Bottom control bar for the conference: [view tools] [call controls] [leave / end].
 * Toggle labels describe the CURRENT state; the tooltip says what a click does.
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
    <div className="conference-controls" role="toolbar" aria-label="Commandes de la réunion">
      <div className="controls-left">
        <button
          className={`control-btn control-btn-sm ${isFullscreen ? 'active-primary' : ''}`}
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          <span className="control-label">{isFullscreen ? 'Réduire' : 'Plein écran'}</span>
        </button>

        {/* Reading size of the medical form on this screen (75% - 175%) */}
        <div
          className={`control-font-volume ${isFormOpen ? 'form-active' : ''}`}
          title="Taille d'affichage des formulaires sur votre écran (75 % à 175 %)"
        >
          <ALargeSmall size={20} className="font-volume-icon" />
          <div className="font-volume-body">
            <span className="control-label">Taille du dossier</span>
            <div className="font-volume-bar-row">
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
                  '--slider-fill': `${Math.max(0, Math.min(100, ((formFontScale - 0.75) / (1.75 - 0.75)) * 100))}%`,
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
                  title="Revenir à 100 %"
                  aria-label="Revenir à 100 %"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="controls-center">
        <button
          className={`control-btn ${isMuted ? 'active-danger' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Activer le micro' : 'Couper le micro'}
          aria-pressed={!isMuted}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          <span className="control-label">{isMuted ? 'Micro coupé' : 'Micro actif'}</span>
        </button>

        <button
          className={`control-btn ${isCameraOff ? 'active-danger' : ''}`}
          onClick={onToggleCamera}
          title={isCameraOff ? 'Activer la caméra' : 'Couper la caméra'}
          aria-pressed={!isCameraOff}
        >
          {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
          <span className="control-label">{isCameraOff ? 'Caméra coupée' : 'Caméra active'}</span>
        </button>

        <button
          className={`control-btn ${isScreenSharing ? 'active-primary' : ''}`}
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          title={isScreenSharing ? "Arrêter le partage d'écran" : "Partager l'écran"}
          aria-pressed={isScreenSharing}
        >
          {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
          <span className="control-label">{isScreenSharing ? 'Arrêter le partage' : "Partager l'écran"}</span>
        </button>

        <button
          className={`control-btn ${isHandRaised ? 'active-warning' : ''}`}
          onClick={onRaiseHand}
          title={isHandRaised ? 'Baisser la main' : 'Lever la main'}
          aria-pressed={isHandRaised}
        >
          <Hand size={24} />
          <span className="control-label">{isHandRaised ? 'Baisser la main' : 'Lever la main'}</span>
        </button>
      </div>

      <div className="controls-right">
        <button className="control-btn leave-btn" onClick={onLeave} title="Quitter la réunion (elle continue pour les autres)">
          <LogOut size={22} />
          <span className="control-label">Quitter</span>
        </button>

        {isHost && (
          <button className="control-btn end-btn" onClick={onEndMeeting} title="Terminer la réunion pour tous les participants">
            <PhoneOff size={22} />
            <span className="control-label">Terminer</span>
          </button>
        )}
      </div>
    </div>
  )
}
