import { useEffect, useRef } from 'react'
import { resolveApiUrl } from '../../api/config'

/**
 * Dynamic video grid layout for conference participants.
 * Auto-sizes based on participant count with screen-share focus mode.
 */
export default function VideoGrid({
  localStream,
  screenStream,
  remoteStreams,
  participants,
  currentUserId,
  isCameraOff,
  isMuted,
  screenSharer,
  localProfilePicture,
}) {
  const currentParticipant = participants.find((p) => String(p.user_id) === String(currentUserId))
  const activeParticipants = participants.filter((p) => String(p.user_id) !== String(currentUserId))
  const localDisplayStream = screenSharer && String(screenSharer) === String(currentUserId) && screenStream ? screenStream : localStream

  const tiles = [
    {
      id: currentUserId,
      label: 'Vous',
      stream: localDisplayStream,
      isMuted,
      isCameraOff: screenSharer && String(screenSharer) === String(currentUserId) ? false : isCameraOff,
      isLocal: true,
      handRaised: currentParticipant?.hand_raised,
      isScreenSharer: screenSharer && String(screenSharer) === String(currentUserId),
      role: currentParticipant?.role,
      profilePicture: localProfilePicture || currentParticipant?.profile_picture,
    },
    ...activeParticipants.map((p) => {
      const stream = remoteStreams[p.user_id]
      const streamCameraOff = !stream || (stream.getVideoTracks().length > 0 && !stream.getVideoTracks()[0].enabled) || stream.getVideoTracks().length === 0
      
      // Prioritize the explicit media state signal from WebSockets if available
      const finalCameraOff = screenSharer && String(screenSharer) === String(p.user_id) ? false : (p.is_camera_off ?? streamCameraOff)

      return {
        id: p.user_id,
        label: p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : p.username || 'Participant',
        stream: stream || null,
        role: p.role,
        userRole: p.user_role,
        isMuted: p.is_muted,
        handRaised: p.hand_raised,
        isScreenSharer: screenSharer && String(screenSharer) === String(p.user_id),
        isCameraOff: finalCameraOff,
        isLocal: false,
        profilePicture: p.profile_picture,
      }
    }),
  ]

  const orderedTiles = screenSharer
    ? [
        ...tiles.filter((t) => String(t.id) === String(screenSharer)),
        ...tiles.filter((t) => String(t.id) !== String(screenSharer))
      ]
    : tiles

  const totalVideos = orderedTiles.length
  const getGridClass = () => {
    if (screenSharer) return 'video-grid screen-share-layout'
    if (totalVideos === 1) return 'video-grid grid-1'
    if (totalVideos <= 2) return 'video-grid grid-2'
    if (totalVideos <= 4) return 'video-grid grid-4'
    if (totalVideos <= 6) return 'video-grid grid-6'
    if (totalVideos <= 9) return 'video-grid grid-9'
    return 'video-grid grid-many'
  }

  return (
    <div className={getGridClass()}>
      {orderedTiles.map((tile) => (
        <VideoTile
          key={tile.id || 'local'}
          stream={tile.stream}
          label={tile.label}
          role={tile.role}
          userRole={tile.userRole}
          isMuted={tile.isMuted}
          isCameraOff={tile.isCameraOff}
          isLocal={tile.isLocal}
          handRaised={tile.handRaised}
          isScreenSharer={tile.isScreenSharer}
          profilePicture={tile.profilePicture}
        />
      ))}
    </div>
  )
}

function VideoTile({ stream, label, role, isMuted, isCameraOff, isLocal, handRaised, isScreenSharer, profilePicture }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      // Prevent redundant assignment which causes AbortError 'interrupted by a new load request'
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream || null;
      }
      
      if (stream) {
        const playVideo = async () => {
          try {
            await videoRef.current?.play();
          } catch (err) {
            // Ignore AbortError as it's common during stream setup, log others
            if (err.name !== 'AbortError') {
              console.warn('WebRTC: Autoplay prevented or playback interrupted', err);
            }
          }
        };
        playVideo();
        stream.addEventListener('addtrack', playVideo);
        return () => stream.removeEventListener('addtrack', playVideo);
      }
    }
  }, [stream])

  return (
    <div className={`video-tile ${isScreenSharer ? 'screen-sharer' : ''} ${handRaised ? 'hand-raised' : ''}`}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted={isLocal} 
        className={`${isCameraOff ? 'camera-off' : ''} ${!isScreenSharer ? 'mirrored' : ''}`} 
      />
      {(isCameraOff || !stream) && (
        <div className="video-placeholder">
          {profilePicture ? (
            <img 
              src={resolveApiUrl(profilePicture)} 
              alt={label} 
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              }}
            />
          ) : (
            <div className="avatar-circle">{(label || '?')[0].toUpperCase()}</div>
          )}
        </div>
      )}
      <div className="video-overlay">
        <span className="video-name">{label}{role === 'HOST' && <span className="host-badge">Hôte</span>}</span>
        <div className="video-indicators">
          {isMuted && <span className="indicator muted-indicator">🔇</span>}
          {handRaised && <span className="indicator hand-indicator">✋</span>}
          {isScreenSharer && <span className="indicator screen-indicator">🖥️</span>}
        </div>
      </div>
    </div>
  )
}
