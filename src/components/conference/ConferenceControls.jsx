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
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          <span className="control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          className={`control-btn ${isCameraOff ? 'active-danger' : ''}`}
          onClick={onToggleCamera}
          title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          <span className="control-label">{isCameraOff ? 'Start Video' : 'Stop Video'}</span>
        </button>

        <button
          className={`control-btn ${isScreenSharing ? 'active-primary' : ''}`}
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
          <span className="control-label">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
        </button>

        <button
          className={`control-btn ${isHandRaised ? 'active-warning' : ''}`}
          onClick={onRaiseHand}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand size={22} />
          <span className="control-label">{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
        </button>
      </div>

      <div className="controls-right">
        <button
          className="control-btn leave-btn"
          onClick={onLeave}
          title="Leave meeting"
        >
          <LogOut size={22} />
          <span className="control-label">Leave</span>
        </button>

        {isHost && (
          <button
            className="control-btn end-btn"
            onClick={onEndMeeting}
            title="End meeting for all"
          >
            <PhoneOff size={22} />
            <span className="control-label">End Meeting</span>
          </button>
        )}
      </div>
    </div>
  )
}
