import { useState, useEffect, useCallback, useRef } from 'react'
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
  const abortControllerRef = useRef(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [joined, setJoined] = useState(false)
  const [activeSubmissionId, setActiveSubmissionId] = useState(null)
  const [notes, setNotes] = useState('')
  const [notesSaveStatus, setNotesSaveStatus] = useState('idle')

  const handleChatMessage = useCallback((msg) => {
    setChatMessages((prev) => [...prev, msg])
  }, [])

  const handleNotesSync = useCallback((newNotes) => {
    setNotes(newNotes)
  }, [])

  const handleConferenceEnded = useCallback(() => {
    alert("La réunion a été terminée par l'hôte.")
    navigate('/meetings')
  }, [navigate])

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
  } = useWebRTC(roomId, user?.id, handleChatMessage, handleNotesSync, handleConferenceEnded)

  useEffect(() => {
    loadConference()
  }, [roomId])

  useEffect(() => {
    if (conference?.submissions?.length > 0 && !activeSubmissionId) {
      setActiveSubmissionId(conference.submissions[0].id)
    }
  }, [conference, activeSubmissionId])

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
      const success = broadcastNotes(notes)
      if (success) {
        setNotesSaveStatus('idle')
      } else {
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

      const me = data.participants?.find((p) => p.user === user?.id)
      setIsHost(me?.role === 'HOST')
    } catch (err) {
      setError(err.response?.data?.detail || 'Échec du chargement de la conférence')
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
      setError(err.response?.data?.detail || 'Échec de l\'accès à la conférence')
    }
  }

  const handleStartMeeting = async () => {
    try {
      const updated = await startConference(conference.id)
      setConference(updated)
    } catch (err) {
      setError(err.response?.data?.detail || 'Échec du démarrage de la réunion')
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
    if (!window.confirm('Terminer cette réunion pour tous les participants ?')) return
    try {
      await endConference(conference.id)
      disconnect()
      navigate('/meetings')
    } catch (err) {
      setError('Échec de la fermeture de la réunion')
    }
  }

  const handleUpload = async (file) => {
    try {
      setIsUploading(true)
      abortControllerRef.current = new AbortController()
      
      const attachment = await uploadConferenceAttachment(
        conference.id, 
        file, 
        '', 
        activeSubmissionId,
        abortControllerRef.current.signal
      )
      
      setConference((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), attachment],
      }))
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        console.log('Upload canceled by user')
      } else {
        console.error('Upload failed:', err)
      }
    } finally {
      setIsUploading(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handleRemoveParticipant = async (userId) => {
    if (!window.confirm('Supprimer ce participant ?')) return
    try {
      await removeParticipant(conference.id, userId)
      loadConference()
    } catch (err) {
      console.error('Remove failed:', err)
    }
  }

  const handlePromoteAttachment = async (attachmentId) => {
    if (!activeSubmissionId) return alert('Veuillez sélectionner un dossier correctement.');
    try {
      await promoteConferenceAttachment(conference.id, attachmentId, activeSubmissionId)
      loadConference()
      alert('Le fichier a été ajouté avec succès au dossier permanent.')
    } catch (err) {
      console.error('Promotion failed:', err)
      alert('Échec de l\'ajout du fichier au dossier : ' + (err.response?.data?.detail || err.message))
    }
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const unreadCount = chatMessages.filter((m) => m.message_type !== 'SYSTEM' && !showChat).length
  const raisedHands = participants.filter((p) => p.hand_raised)

  if (loading) {
    return (
      <div className="conference-loading">
        <div className="loading-spinner" />
        <p>Chargement de la conférence...</p>
      </div>
    )
  }

  if (error && !conference) {
    return (
      <div className="conference-error">
        <h2>Impossible de rejoindre</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/meetings')}>Retour aux réunions</button>
      </div>
    )
  }

  if (conference?.status === 'ENDED') {
    return (
      <div className="conference-ended">
        <h2>La réunion est terminée</h2>
        <button onClick={() => navigate('/meetings')}>Retour aux réunions</button>
      </div>
    )
  }

  if (!joined) {
    return (
      <div className="conference-lobby">
        <div className="lobby-card">
          <h2>{conference?.meeting_title || 'Rejoindre la conférence'}</h2>
          <p className="lobby-room">Salle : <strong>{roomId}</strong></p>
          <p className="lobby-status">
            Statut : <span className={`status-${conference?.status?.toLowerCase()}`}>{conference?.status}</span>
          </p>
          <div className="lobby-participants">
            <Users size={16} />
            <span>{conference?.participants?.length || 0} participant(s) invité(s)</span>
          </div>
          <div className="lobby-actions">
            <button className="btn-join" onClick={handleJoin}>Rejoindre la réunion</button>
            {isHost && conference?.status === 'WAITING' && (
              <button className="btn-start" onClick={handleStartMeeting}>Démarrer la réunion</button>
            )}
            <button className="btn-back" onClick={() => navigate('/meetings')}>Retour</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="conference-room">
      <div className="conference-header">
        <div className="header-left">
          <h2 className="conference-title">{conference?.meeting_title || 'Conférence RCP'}</h2>
          {conference?.submissions?.length > 0 && (
            <div className="header-case-selector">
              <ClipboardList size={16} />
              <select 
                value={activeSubmissionId || ''} 
                onChange={(e) => setActiveSubmissionId(e.target.value)}
                className="case-switcher"
              >
                {conference.submissions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.patient_name} - {s.name || s.form_name}
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
            title="Fichiers"
          >
            <Paperclip size={18} />
          </button>
          <button
            className={`toolbar-btn ${showResume ? 'active' : ''}`}
            onClick={() => { setShowResume(!showResume); setShowParticipants(false); setShowChat(false); setShowFiles(false); setShowNotes(false) }}
            title="Résumé Clinique"
          >
            <ClipboardList size={18} />
          </button>
          <button
            className={`toolbar-btn ${showNotes ? 'active' : ''}`}
            onClick={() => { setShowNotes(!showNotes); setShowParticipants(false); setShowChat(false); setShowFiles(false); setShowResume(false) }}
            title="Notes"
          >
            <FileText size={18} />
          </button>
        </div>
      </div>

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
          submissionAttachments={conference?.submission_attachments || []}
          onUpload={handleUpload}
          onCancelUpload={handleCancelUpload}
          onPromote={handlePromoteAttachment}
          isOpen={showFiles}
          onToggle={() => setShowFiles(false)}
          isUploading={isUploading}
          activeSubmissionId={activeSubmissionId}
        />

        <MeetingNotesSidebar
          isOpen={showNotes}
          onToggle={() => setShowNotes(false)}
          notes={notes}
          onChange={setNotes}
          canEdit={conference?.can_edit_notes}
          saveStatus={notesSaveStatus}
        />

        <CaseResumeSidebar
          isOpen={showResume}
          onToggle={() => setShowResume(false)}
          meetingId={conference?.meeting}
          activeSubmissionId={activeSubmissionId}
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
