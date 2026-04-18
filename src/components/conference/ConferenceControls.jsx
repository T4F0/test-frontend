import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Hand, PhoneOff, LogOut } from 'lucide-react'

/**
 * Bottom control bar for the conference.
 */
export default function ConferenceControls({
  isMuted,
  isCameraOff,
  isScreenSharing,
  isHandRaised,
  isHost,
  onToggleMute,
  onToggleCamera,
  onStartScreenShare,
  onStopScreenShare,
  onRaiseHand,
  onLeave,
  onEndMeeting,
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
