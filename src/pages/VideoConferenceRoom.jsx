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
import MedicalCasesSidebar from '../components/conference/MedicalCasesSidebar'
import MainStageFileViewer from '../components/conference/MainStageFileViewer'
import MainStageFormDetails from '../components/conference/MainStageFormDetails'
import { getSubmission } from '../api/submissionsApi'
import { getForm } from '../api/formsApi'
import { getAttachments, downloadAttachment } from '../api/attachmentsApi'
import { Users, MessageSquare, ClipboardList, Clock } from 'lucide-react'
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
  const [showCases, setShowCases] = useState(false)
  const [activePreviewItem, setActivePreviewItem] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const abortControllerRef = useRef(null)
  const conferenceRef = useRef(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [joined, setJoined] = useState(false)
  const [activeSubmissionId, setActiveSubmissionId] = useState(null)
  const [activeFormDetail, setActiveFormDetail] = useState(null)
  const [formDetailLoading, setFormDetailLoading] = useState(false)
  const [formDetailData, setFormDetailData] = useState({ form: null, submission: null, attachments: [] })
  const [formDetailError, setFormDetailError] = useState(null)

  // Draggable PIP states
  const [pipPosition, setPipPosition] = useState({ x: 0, y: 0 })
  const [isDraggingPip, setIsDraggingPip] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Reset PIP position when closed
  useEffect(() => {
    if (!activePreviewItem && !activeFormDetail) {
      setPipPosition({ x: 0, y: 0 })
    }
  }, [activePreviewItem, activeFormDetail])

  const handlePipMouseDown = (e) => {
    // Only drag with left click and when in PIP mode
    if (e.button !== 0) return
    setIsDraggingPip(true)
    dragStartRef.current = {
      x: e.clientX - pipPosition.x,
      y: e.clientY - pipPosition.y
    }
    e.preventDefault()
  }

  const handlePipMouseMove = useCallback((e) => {
    if (!isDraggingPip) return
    const newX = e.clientX - dragStartRef.current.x
    const newY = e.clientY - dragStartRef.current.y
    
    // Keep PIP within the bounds of the video area viewport (with 10px margin at edges)
    const videoArea = document.querySelector('.video-area')
    if (videoArea) {
      const bounds = videoArea.getBoundingClientRect()
      
      // Initial pos is right: 20px (defaultLeft = bounds.width - 320 - 20)
      const minX = 10 - (bounds.width - 320 - 20)
      const maxX = 10
      
      // Initial pos is bottom: 20px (defaultTop = bounds.height - 240 - 20)
      const minY = 10 - (bounds.height - 240 - 20)
      const maxY = 10
      
      const constrainedX = Math.max(minX, Math.min(maxX, newX))
      const constrainedY = Math.max(minY, Math.min(maxY, newY))
      setPipPosition({ x: constrainedX, y: constrainedY })
    } else {
      setPipPosition({ x: newX, y: newY })
    }
  }, [isDraggingPip, pipPosition])

  const handlePipMouseUp = useCallback(() => {
    setIsDraggingPip(false)
  }, [])

  useEffect(() => {
    if (isDraggingPip) {
      window.addEventListener('mousemove', handlePipMouseMove)
      window.addEventListener('mouseup', handlePipMouseUp)
    } else {
      window.removeEventListener('mousemove', handlePipMouseMove)
      window.removeEventListener('mouseup', handlePipMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handlePipMouseMove)
      window.removeEventListener('mouseup', handlePipMouseUp)
    }
  }, [isDraggingPip, handlePipMouseMove, handlePipMouseUp])

  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (conferenceRef.current) {
        conferenceRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`)
        })
      }
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleChatMessage = useCallback((msg) => {
    setChatMessages((prev) => [...prev, msg])
  }, [])

  const handleNotesSync = useCallback(() => {}, [])

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

  const loadConference = async () => {
    try {
      setLoading(true)
      const data = await getConferenceByRoom(roomId)
      setConference(data)

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
        attachments: [...(prev.attachments || []), { ...attachment, submission_id: attachment.submission_id || activeSubmissionId }],
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

  const handleShowFormDetails = async (sub) => {
    if (activeFormDetail && activeFormDetail.id === sub.id) {
      // Toggle off if clicking the same case details button
      setActiveFormDetail(null)
      setFormDetailData({ form: null, submission: null, attachments: [] })
      return
    }
    setActivePreviewItem(null) // Hide other file previews
    setFormDetailLoading(true)
    setFormDetailError(null)
    setActiveFormDetail(sub)
    try {
      const subData = await getSubmission(sub.id)
      const formId = subData.form
      
      const [formData, attachData] = await Promise.all([
        getForm(formId),
        getAttachments({ submission: sub.id })
      ])
      setFormDetailData({ form: formData, submission: subData, attachments: attachData || [] })
    } catch (err) {
      console.error('Failed to load form details in conference stage:', err)
      setFormDetailError('Impossible de charger les détails du formulaire.')
    } finally {
      setFormDetailLoading(false)
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
    <div className={`conference-room ${isFullscreen ? 'fullscreen-active' : ''}`} ref={conferenceRef}>
      <div className="conference-header">
        <div className="header-left">
          <h2 className="conference-title">{conference?.meeting_title || 'Conférence RCP'}</h2>
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
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); setShowCases(false); }}
            title="Participants"
          >
            <Users size={18} />
            <span className="toolbar-count">{participants.length}</span>
          </button>
          <button
            className={`toolbar-btn ${showChat ? 'active' : ''}`}
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); setShowCases(false); }}
            title="Chat"
          >
            <MessageSquare size={18} />
            {!!unreadCount && <span className="toolbar-count">{unreadCount}</span>}
          </button>
          <button
            className={`toolbar-btn ${showCases ? 'active' : ''}`}
            onClick={() => { setShowCases(!showCases); setShowParticipants(false); setShowChat(false); }}
            title="Dossiers Médicaux"
          >
            <ClipboardList size={18} />
          </button>
        </div>
      </div>

      <div className="conference-body">
        <div className={`video-area ${showParticipants || showChat || showCases ? 'with-sidebar' : ''} ${(activePreviewItem || activeFormDetail) ? 'has-preview' : ''}`}>
          {activePreviewItem && (
            <MainStageFileViewer 
              file={activePreviewItem} 
              onClose={() => setActivePreviewItem(null)} 
            />
          )}
          {activeFormDetail && (
            <div className="main-stage-form-wrapper" style={{ flex: 1, height: '100%', overflowY: 'auto', background: '#0f172a', borderRadius: '12px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
              {formDetailLoading && (
                <div className="form-detail-panel-loading" style={{ height: '100%' }}>
                  <div className="form-detail-spinner" />
                  Chargement des détails…
                </div>
              )}
              {formDetailError && (
                <div style={{ padding: '2rem' }}>
                  <div className="form-detail-panel-error">
                    {formDetailError}
                  </div>
                  <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => { setActiveFormDetail(null); setFormDetailData({ form: null, submission: null, attachments: [] }) }}>
                    Fermer
                  </button>
                </div>
              )}
              {!formDetailLoading && !formDetailError && formDetailData.form && formDetailData.submission && (
                <MainStageFormDetails
                  form={formDetailData.form}
                  submission={formDetailData.submission}
                  attachments={formDetailData.attachments}
                  onClose={() => { setActiveFormDetail(null); setFormDetailData({ form: null, submission: null, attachments: [] }) }}
                  downloadAttachment={downloadAttachment}
                />
              )}
            </div>
          )}
          <div 
            className={(activePreviewItem || activeFormDetail) ? 'pip-video-container' : 'full-video-container'}
            style={(activePreviewItem || activeFormDetail) ? {
              transform: `translate(${pipPosition.x}px, ${pipPosition.y}px)`,
              cursor: isDraggingPip ? 'grabbing' : 'grab',
              transition: isDraggingPip ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            } : {}}
            onMouseDown={(activePreviewItem || activeFormDetail) ? handlePipMouseDown : undefined}
          >
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

        <MedicalCasesSidebar
          submissions={conference?.submissions || []}
          attachments={conference?.attachments || []}
          submissionAttachments={conference?.submission_attachments || []}
          onUpload={handleUpload}
          onCancelUpload={handleCancelUpload}
          onPromote={handlePromoteAttachment}
          isOpen={showCases}
          onToggle={() => setShowCases(false)}
          isUploading={isUploading}
          activeSubmissionId={activeSubmissionId}
          setActiveSubmissionId={setActiveSubmissionId}
          onPreviewFile={(file) => {
            setActivePreviewItem(file);
            setActiveFormDetail(null);
            setFormDetailData({ form: null, submission: null, attachments: [] });
          }}
          onShowFormDetails={handleShowFormDetails}
          activeFormDetailId={activeFormDetail ? activeFormDetail.id : null}
        />
      </div>

      <ConferenceControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isHost={isHost}
        isFullscreen={isFullscreen}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        onRaiseHand={raiseHand}
        onLeave={handleLeave}
        onEndMeeting={handleEndMeeting}
        onToggleFullscreen={handleToggleFullscreen}
      />
    </div>
  )
}
