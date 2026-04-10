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
  updateConferenceNotes,
  promoteConferenceAttachment,
} from '../api/conferenceApi'
import VideoGrid from '../components/conference/VideoGrid'
import ConferenceControls from '../components/conference/ConferenceControls'
import ParticipantList from '../components/conference/ParticipantList'
import ChatSidebar from '../components/conference/ChatSidebar'
import FileSharePanel from '../components/conference/FileSharePanel'
import MeetingNotesSidebar from '../components/conference/MeetingNotesSidebar'
import CaseResumeSidebar from '../components/conference/CaseResumeSidebar'
import { Users, MessageSquare, Paperclip, Clock, FileText, ClipboardList } from 'lucide-react'
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
  const [showNotes, setShowNotes] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [joined, setJoined] = useState(false)
  const [activeCaseId, setActiveCaseId] = useState(null)
  const [notes, setNotes] = useState('')
  const [notesSaveStatus, setNotesSaveStatus] = useState('idle')

  const handleChatMessage = useCallback((msg) => {
    setChatMessages((prev) => [...prev, msg])
  }, [])

  const handleNotesSync = useCallback((newNotes) => {
    setNotes(newNotes)
  }, [])

  const {
    localStream,
    screenStream,
    remoteStreams,
    participants,
    isMuted,
    isCameraOff,
    isScreenSharing,
    screenSharer,
    isHandRaised,
    connect,
    disconnect,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    broadcastNotes,
    raiseHand,
    muteRemoteParticipant,
  } = useWebRTC(roomId, user?.id, handleChatMessage, handleNotesSync)

  useEffect(() => {
    loadConference()
  }, [roomId])

  useEffect(() => {
    if (conference?.medical_cases?.length > 0 && !activeCaseId) {
      setActiveCaseId(conference.medical_cases[0].id)
    }
  }, [conference, activeCaseId])

  useEffect(() => {
    if (!conference?.started_at || conference?.status === 'ENDED') return undefined
    const start = new Date(conference.started_at).getTime()
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [conference?.started_at, conference?.status])

  useEffect(() => {
    if (!conference?.can_edit_notes || !joined) return undefined
    if (notes === (conference.notes || '')) {
      setNotesSaveStatus('idle')
      return undefined
    }

    setNotesSaveStatus('saving')
    const timer = setTimeout(() => {
      // Broadcast to WebSocket - the Consumer will handle DB saving
      console.log('Debouncing notes broadcast...', notes.length);
      const success = broadcastNotes(notes)
      if (success) {
        console.log('Notes broadcasted successfully');
        setNotesSaveStatus('idle')
      } else {
        console.warn('WebSocket not ready, notes not sent');
        // If WebSocket fails, we should ideally fallback to an API call or just reset status
        setNotesSaveStatus('idle') 
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [conference?.can_edit_notes, conference?.notes, joined, notes, broadcastNotes])

  const loadConference = async () => {
    try {
      setLoading(true)
      const data = await getConferenceByRoom(roomId)
      setConference(data)
      setNotes(data.notes || '')

      if (data.recent_messages) {
        setChatMessages(data.recent_messages.reverse())
      }

      const me = data.participants?.find((participant) => participant.user === user?.id)
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
      const attachment = await uploadConferenceAttachment(conference.id, file, '', activeCaseId)
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
  const handlePromoteAttachment = async (attachmentId) => {
    if (!activeCaseId) return alert('Please select a medical case correctly.');
    try {
      await promoteConferenceAttachment(conference.id, attachmentId, activeCaseId)
      // Reload conference to show the new attachment in the "Medical case attachments" section
      loadConference()
      alert('File has been successfully added to the medical case.')
    } catch (err) {
      console.error('Promotion failed:', err)
      alert('Failed to add file to medical case: ' + (err.response?.data?.detail || err.message))
    }
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const unreadCount = chatMessages.filter((message) => message.message_type !== 'SYSTEM' && !showChat).length
  const raisedHands = participants.filter((participant) => participant.hand_raised)

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

  if (!joined) {
    return (
      <div className="conference-lobby">
        <div className="lobby-card">
          <h2>{conference?.meeting_title || 'Join Conference'}</h2>
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
      <div className="conference-header">
        <div className="header-left">
          <h2 className="conference-title">{conference?.meeting_title || 'RCP Conference'}</h2>
          {conference?.medical_cases?.length > 0 && (
            <div className="header-case-selector">
              <ClipboardList size={16} />
              <select 
                value={activeCaseId || ''} 
                onChange={(e) => setActiveCaseId(e.target.value)}
                className="case-switcher"
              >
                {conference.medical_cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.patient_name} - {c.name}
                  </option>
                ))}
              </select>
            </div>
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
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); setShowFiles(false); setShowNotes(false); setShowResume(false) }}
            title="Participants"
          >
            <Users size={18} />
            <span className="toolbar-count">{participants.length}</span>
          </button>
          <button
            className={`toolbar-btn ${showChat ? 'active' : ''}`}
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); setShowFiles(false); setShowNotes(false); setShowResume(false) }}
            title="Chat"
          >
            <MessageSquare size={18} />
            {!!unreadCount && <span className="toolbar-count">{unreadCount}</span>}
          </button>
          <button
            className={`toolbar-btn ${showFiles ? 'active' : ''}`}
            onClick={() => { setShowFiles(!showFiles); setShowParticipants(false); setShowChat(false); setShowNotes(false); setShowResume(false) }}
            title="Files"
          >
            <Paperclip size={18} />
          </button>
          <button
            className={`toolbar-btn ${showNotes ? 'active' : ''}`}
            onClick={() => { setShowNotes(!showNotes); setShowParticipants(false); setShowChat(false); setShowFiles(false); setShowResume(false) }}
            title="Meeting Notes"
          >
            <FileText size={18} />
          </button>
          <button
            className={`toolbar-btn ${showResume ? 'active' : ''}`}
            onClick={() => { setShowResume(!showResume); setShowParticipants(false); setShowChat(false); setShowFiles(false); setShowNotes(false) }}
            title="Case Resume"
          >
            <ClipboardList size={18} />
          </button>
        </div>
      </div>

      {!!raisedHands.length && (
        <div className="raised-hands-banner">
          <span className="raised-hands-icon">✋</span>
          <span>
            Raised hands: {raisedHands.map((participant) => participant.first_name ? `${participant.first_name} ${participant.last_name || ''}`.trim() : participant.username).join(', ')}
          </span>
        </div>
      )}

      <div className="conference-body">
        <div className={`video-area ${showParticipants || showChat || showFiles || showNotes || showResume ? 'with-sidebar' : ''}`}>
          <VideoGrid
            localStream={localStream}
            screenStream={screenStream}
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
          caseAttachments={conference?.medical_case_attachments || []}
          onUpload={handleUpload}
          onPromote={handlePromoteAttachment}
          isOpen={showFiles}
          onToggle={() => setShowFiles(false)}
          isUploading={isUploading}
          activeCaseId={activeCaseId}
        />

        <MeetingNotesSidebar
          isOpen={showNotes}
          onToggle={() => setShowNotes(false)}
          notes={notes}
          onChange={setNotes}
          canEdit={conference?.can_edit_notes}
          saveStatus={notesSaveStatus}
          updatedAt={conference?.notes_updated_at}
          updatedByName={conference?.notes_updated_by_name}
        />

        <CaseResumeSidebar
          isOpen={showResume}
          onToggle={() => setShowResume(false)}
          meetingId={conference?.meeting}
          activeCaseId={activeCaseId}
        />
      </div>

      <ConferenceControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
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
