import { useEffect, useRef } from 'react'

/**
 * Dynamic video grid layout for conference participants.
 * Auto-sizes based on participant count with screen-share focus mode.
 */
export default function VideoGrid({
  localStream,
  remoteStreams,
  participants,
  currentUserId,
  isCameraOff,
  isMuted,
  screenSharer,
}) {
  // Calculate grid layout class
  const totalVideos = 1 + Object.keys(remoteStreams).length
  const getGridClass = () => {
    if (screenSharer) return 'video-grid screen-share-layout'
    if (totalVideos === 1) return 'video-grid grid-1'
    if (totalVideos === 2) return 'video-grid grid-2'
    if (totalVideos <= 4) return 'video-grid grid-4'
    if (totalVideos <= 6) return 'video-grid grid-6'
    if (totalVideos <= 9) return 'video-grid grid-9'
    return 'video-grid grid-many'
  }

  const getParticipantInfo = (peerId) => {
    return participants.find((p) => p.user_id === peerId) || {}
  }

  return (
    <div className={getGridClass()}>
      {/* Local video */}
      <VideoTile
        stream={localStream}
        label="You"
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isLocal={true}
        handRaised={false}
        isScreenSharer={screenSharer === currentUserId}
      />

      {/* Remote videos */}
      {Object.entries(remoteStreams).map(([peerId, stream]) => {
        const info = getParticipantInfo(peerId)
        const name = info.first_name
          ? `${info.first_name} ${info.last_name || ''}`.trim()
          : info.username || 'Participant'
        return (
          <VideoTile
            key={peerId}
            stream={stream}
            label={name}
            role={info.role}
            userRole={info.user_role}
            isMuted={info.is_muted}
            handRaised={info.hand_raised}
            isScreenSharer={screenSharer === peerId}
          />
        )
      })}
    </div>
  )
}

function VideoTile({
  stream,
  label,
  role,
  userRole,
  isMuted,
  isCameraOff,
  isLocal,
  handRaised,
  isScreenSharer,
}) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className={`video-tile ${isScreenSharer ? 'screen-sharer' : ''} ${handRaised ? 'hand-raised' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={isCameraOff ? 'camera-off' : ''}
      />
      {(isCameraOff || !stream) && (
        <div className="video-placeholder">
          <div className="avatar-circle">
            {(label || '?')[0].toUpperCase()}
          </div>
        </div>
      )}
      <div className="video-overlay">
        <span className="video-name">
          {label}
          {role === 'HOST' && <span className="host-badge">Host</span>}
        </span>
        <div className="video-indicators">
          {isMuted && <span className="indicator muted-indicator" title="Muted">🔇</span>}
          {handRaised && <span className="indicator hand-indicator" title="Hand raised">✋</span>}
          {isScreenSharer && <span className="indicator screen-indicator" title="Sharing screen">🖥️</span>}
        </div>
      </div>
    </div>
  )
}
