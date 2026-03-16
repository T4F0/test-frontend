import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useWebRTC from '../hooks/useWebRTC'
import {
  getConferenceByRoom,
  joinConference,
  leaveConference,
  startConference,
  endConference,
  uploadConferenceAttachment,
  removeParticipant,
} from '../api/conferenceApi'
import VideoGrid from '../components/conference/VideoGrid'
import ConferenceControls from '../components/conference/ConferenceControls'
import ParticipantList from '../components/conference/ParticipantList'
import ChatSidebar from '../components/conference/ChatSidebar'
import FileSharePanel from '../components/conference/FileSharePanel'
import { Users, MessageSquare, Paperclip, Clock } from 'lucide-react'
import '../conference.css'

export default function VideoConferenceRoom() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [conference, setConference] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [showParticipants, setShowParticipants] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [joined, setJoined] = useState(false)

  const handleChatMessage = useCallback((msg) => {
    setChatMessages((prev) => [...prev, msg])
  }, [])

  const {
    localStream,
    remoteStreams,
    participants,
    isConnected,
    isMuted,
    isCameraOff,
    isScreenSharing,
    screenSharer,
    connect,
    disconnect,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    raiseHand,
    muteRemoteParticipant,
  } = useWebRTC(roomId, user?.id, handleChatMessage)

  // Load conference data
  useEffect(() => {
    loadConference()
  }, [roomId])

  // Meeting timer
  useEffect(() => {
    if (!conference?.started_at || conference?.status === 'ENDED') return
    const start = new Date(conference.started_at).getTime()
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [conference?.started_at, conference?.status])

  const loadConference = async () => {
    try {
      setLoading(true)
      const data = await getConferenceByRoom(roomId)
      setConference(data)

      // Check if the chat history came with the response
      if (data.recent_messages) {
        setChatMessages(data.recent_messages.reverse())
      }

      // Check if user is host
      const me = data.participants?.find((p) => p.user === user?.id)
      setIsHost(me?.role === 'HOST')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load conference')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    try {
      await joinConference(conference.id)
      await connect()
      setJoined(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to join conference')
    }
  }

  const handleStartMeeting = async () => {
    try {
      const updated = await startConference(conference.id)
      setConference(updated)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start meeting')
    }
  }

  const handleLeave = async () => {
    try {
      await leaveConference(conference.id)
      disconnect()
      navigate('/meetings')
    } catch (err) {
      disconnect()
      navigate('/meetings')
    }
  }

  const handleEndMeeting = async () => {
    if (!window.confirm('End this meeting for all participants?')) return
    try {
      await endConference(conference.id)
      disconnect()
      navigate('/meetings')
    } catch (err) {
      setError('Failed to end meeting')
    }
  }

  const handleUpload = async (file) => {
    try {
      setIsUploading(true)
      const attachment = await uploadConferenceAttachment(conference.id, file)
      setConference((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), attachment],
      }))
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveParticipant = async (userId) => {
    if (!window.confirm('Remove this participant?')) return
    try {
      await removeParticipant(conference.id, userId)
      loadConference()
    } catch (err) {
      console.error('Remove failed:', err)
    }
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const unreadCount = chatMessages.filter(
    (m) => m.message_type !== 'SYSTEM' && !showChat
  ).length

  if (loading) {
    return (
      <div className="conference-loading">
        <div className="loading-spinner" />
        <p>Loading conference...</p>
      </div>
    )
  }

  if (error && !conference) {
    return (
      <div className="conference-error">
        <h2>Unable to Join</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/meetings')}>Back to Meetings</button>
      </div>
    )
  }

  if (conference?.status === 'ENDED') {
    return (
      <div className="conference-ended">
        <h2>Meeting Has Ended</h2>
        <p>This conference session has concluded.</p>
        <button onClick={() => navigate('/meetings')}>Back to Meetings</button>
      </div>
    )
  }

  // Pre-join lobby
  if (!joined) {
    return (
      <div className="conference-lobby">
        <div className="lobby-card">
          <h2>Join Conference</h2>
          <p className="lobby-room">Room: <strong>{roomId}</strong></p>
          {conference?.meeting_date && (
            <p className="lobby-date">
              Scheduled: {new Date(conference.meeting_date).toLocaleString()}
            </p>
          )}
          <p className="lobby-status">
            Status: <span className={`status-${conference?.status?.toLowerCase()}`}>{conference?.status}</span>
          </p>
          <div className="lobby-participants">
            <Users size={16} />
            <span>{conference?.participants?.length || 0} participant(s) invited</span>
          </div>
          {error && <div className="lobby-error">{error}</div>}
          <div className="lobby-actions">
            <button className="btn-join" onClick={handleJoin}>
              Join Meeting
            </button>
            {isHost && conference?.status === 'WAITING' && (
              <button className="btn-start" onClick={handleStartMeeting}>
                Start Meeting
              </button>
            )}
            <button className="btn-back" onClick={() => navigate('/meetings')}>
              Back to Meetings
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="conference-room">
      {/* Header */}
      <div className="conference-header">
        <div className="header-left">
          <h2 className="conference-title">RCP Conference</h2>
          {conference?.medical_case_id && (
            <span className="case-badge">
              Case: {String(conference.medical_case_id).slice(0, 8)}...
            </span>
          )}
        </div>
        <div className="header-center">
          {conference?.started_at && (
            <div className="meeting-timer">
              <Clock size={16} />
              <span>{formatTime(elapsedTime)}</span>
            </div>
          )}
          <span className={`status-indicator status-${conference?.status?.toLowerCase()}`}>
            {conference?.status === 'ACTIVE' ? '● Live' : conference?.status}
          </span>
        </div>
        <div className="header-right">
          <button
            className={`toolbar-btn ${showParticipants ? 'active' : ''}`}
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); setShowFiles(false) }}
            title="Participants"
          >
            <Users size={18} />
            <span className="toolbar-count">{participants.length}</span>
          </button>
          <button
            className={`toolbar-btn ${showChat ? 'active' : ''}`}
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); setShowFiles(false) }}
            title="Chat"
          >
            <MessageSquare size={18} />
          </button>
          <button
            className={`toolbar-btn ${showFiles ? 'active' : ''}`}
            onClick={() => { setShowFiles(!showFiles); setShowParticipants(false); setShowChat(false) }}
            title="Files"
          >
            <Paperclip size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="conference-body">
        <div className={`video-area ${showParticipants || showChat || showFiles ? 'with-sidebar' : ''}`}>
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            currentUserId={user?.id}
            isCameraOff={isCameraOff}
            isMuted={isMuted}
            screenSharer={screenSharer}
          />
        </div>

        <ParticipantList
          participants={participants}
          currentUserId={user?.id}
          isHost={isHost}
          onMuteParticipant={muteRemoteParticipant}
          onRemoveParticipant={handleRemoveParticipant}
          isOpen={showParticipants}
          onToggle={() => setShowParticipants(false)}
        />

        <ChatSidebar
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          isOpen={showChat}
          onToggle={() => setShowChat(false)}
          currentUserId={user?.id}
        />

        <FileSharePanel
          attachments={conference?.attachments || []}
          onUpload={handleUpload}
          isOpen={showFiles}
          onToggle={() => setShowFiles(false)}
          isUploading={isUploading}
        />
      </div>

      {/* Controls */}
      <ConferenceControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        isHost={isHost}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        onRaiseHand={raiseHand}
        onLeave={handleLeave}
        onEndMeeting={handleEndMeeting}
      />
    </div>
  )
}
