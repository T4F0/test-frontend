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
import {
  listMeetingJoinRequests,
  acceptMeetingJoinRequest,
  rejectMeetingJoinRequest,
  askToJoinMeeting,
} from '../api/meetingsApi'
import VideoGrid from '../components/conference/VideoGrid'
import ConferenceControls from '../components/conference/ConferenceControls'
import ParticipantList from '../components/conference/ParticipantList'
import ChatSidebar from '../components/conference/ChatSidebar'
import MedicalCasesSidebar from '../components/conference/MedicalCasesSidebar'
import MainStageFileViewer from '../components/conference/MainStageFileViewer'
import MainStageFormDetails from '../components/conference/MainStageFormDetails'
import AttachmentsStrip from '../components/conference/AttachmentsStrip'
import { getSubmission } from '../api/submissionsApi'
import { getForm } from '../api/formsApi'
import { getAttachments, downloadAttachment } from '../api/attachmentsApi'
import { Users, MessageSquare, ClipboardList, Clock, UserCheck, X, Check, XCircle } from 'lucide-react'
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
  const initializedActiveCaseRef = useRef(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [joined, setJoined] = useState(false)
  const [activeSubmissionId, setActiveSubmissionId] = useState(null)
  const [activeFormDetail, setActiveFormDetail] = useState(null)
  const [formDetailLoading, setFormDetailLoading] = useState(false)
  const [formDetailData, setFormDetailData] = useState({ form: null, submission: null, attachments: [] })
  const [formDetailError, setFormDetailError] = useState(null)

  // ---- Ask-to-Join state ----
  // Whether the current user is in lobby mode (non-participant waiting for host approval)
  const [isInLobby, setIsInLobby] = useState(false)
  // Whether the lobby WS connection has been initiated
  const [lobbyConnected, setLobbyConnected] = useState(false)
  // Pending join requests shown to the host
  const [joinRequests, setJoinRequests] = useState([])
  const [showAdmissions, setShowAdmissions] = useState(false)
  // Host notification toast for new join requests
  const [joinToast, setJoinToast] = useState(null) // { message, requestId }
  const [isToastLeaving, setIsToastLeaving] = useState(false)
  const joinToastTimerRef = useRef(null)
  const joinToastRef = useRef(null)
  const toastCloseTimeoutRef = useRef(null)

  const dismissToast = useCallback(() => {
    setIsToastLeaving(true)
    if (joinToastTimerRef.current) clearTimeout(joinToastTimerRef.current)
    if (toastCloseTimeoutRef.current) clearTimeout(toastCloseTimeoutRef.current)
    toastCloseTimeoutRef.current = setTimeout(() => {
      setJoinToast(null)
      joinToastRef.current = null
      setIsToastLeaving(false)
    }, 300) // matches 300ms transition in CSS
  }, [])

  const triggerToast = useCallback((message, requestId) => {
    if (joinToastTimerRef.current) clearTimeout(joinToastTimerRef.current)
    if (toastCloseTimeoutRef.current) clearTimeout(toastCloseTimeoutRef.current)
    
    setIsToastLeaving(false)
    const nextToast = { message, requestId }
    joinToastRef.current = nextToast
    setJoinToast(nextToast)
    
    joinToastTimerRef.current = setTimeout(() => {
      dismissToast()
    }, 5000)
  }, [dismissToast])

  useEffect(() => {
    return () => {
      if (joinToastTimerRef.current) clearTimeout(joinToastTimerRef.current)
      if (toastCloseTimeoutRef.current) clearTimeout(toastCloseTimeoutRef.current)
    }
  }, [])

  // Ref to break circular dependency: handleJoinAccepted (defined before useWebRTC)
  // needs access to reconnectAsParticipant (returned by useWebRTC)
  const reconnectAsParticipantRef = useRef(null)
  // Ref to always hold the latest conference data (avoids stale closure in callbacks)
  const conferenceDataRef = useRef(null)
  // Ref for the lobby polling interval
  const lobbyPollIntervalRef = useRef(null)
  // Ref for host-side polling interval (checks for pending join requests)
  const hostPollIntervalRef = useRef(null)



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

  // ---- Ask-to-Join event handlers (passed to useWebRTC) ----

  const handleLobbyWaiting = useCallback(() => {
    // Server confirmed we're in lobby mode
    setIsInLobby(true)
    setLobbyConnected(true)
  }, [])

  // Shared logic: called both from WS join_accepted event and from poll fallback
  const doJoinAfterAcceptance = useCallback(async () => {
    // Stop the polling interval immediately to prevent duplicate calls
    if (lobbyPollIntervalRef.current) {
      clearInterval(lobbyPollIntervalRef.current)
      lobbyPollIntervalRef.current = null
    }
    setIsInLobby(false)
    setLobbyConnected(false)
    // Use the ref so we always have the latest conference data (avoids stale closure)
    const conf = conferenceDataRef.current
    try {
      if (conf) {
        await joinConference(conf.id)
      }
    } catch (err) {
      console.error('Failed to join conference after acceptance:', err)
    }
    try {
      if (reconnectAsParticipantRef.current) {
        await reconnectAsParticipantRef.current()
      }
    } catch (err) {
      console.error('Failed to reconnect as participant:', err)
    }
    setJoined(true)
  }, [])

  const handleJoinAccepted = useCallback(async () => {
    console.log("VideoConferenceRoom: handleJoinAccepted invoked via WS!")
    await doJoinAfterAcceptance()
  }, [doJoinAfterAcceptance])

  const handleJoinRejected = useCallback((reason) => {
    if (reason === 'meeting_ended') {
      alert('La réunion est terminée.')
    } else {
      alert("Votre demande pour rejoindre a été refusée par l'hôte.")
    }
    navigate('/meetings')
  }, [navigate])

  const handleJoinRequested = useCallback((data) => {
    // Host received a new join request via WebSocket
    const { request_id, user_id, user_name, user_role } = data
    setJoinRequests(prev => {
      if (prev.find(r => r.id === request_id)) return prev
      return [...prev, { id: request_id, user_id, user_name, user_role }]
    })
    // Show toast notification
    triggerToast(`${user_name} demande à rejoindre`, request_id)
    // Auto-open admissions panel
    setShowAdmissions(true)
    setShowParticipants(false)
    setShowChat(false)
    setShowCases(false)
  }, [triggerToast])

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
    reconnectAsParticipant,
    disconnect,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    broadcastNotes,
    raiseHand,
    muteRemoteParticipant,
  } = useWebRTC(
    roomId,
    user?.id,
    handleChatMessage,
    handleNotesSync,
    handleConferenceEnded,
    handleLobbyWaiting,
    handleJoinAccepted,
    handleJoinRejected,
    handleJoinRequested,
  )

  // Keep the ref in sync so handleJoinAccepted can call it without a circular dep
  reconnectAsParticipantRef.current = reconnectAsParticipant


  useEffect(() => {
    loadConference()
  }, [roomId])

  // Polling fallback: while in lobby, periodically check if the host has accepted.
  // This ensures the user auto-joins even if the WS join_accepted event was missed
  // (e.g., due to brief WS disconnects or timing issues).
  useEffect(() => {
    if (!isInLobby || joined) {
      // Not in lobby or already joined — clear any existing poll
      if (lobbyPollIntervalRef.current) {
        clearInterval(lobbyPollIntervalRef.current)
        lobbyPollIntervalRef.current = null
      }
      return
    }

    const conf = conferenceDataRef.current
    const meetingId = conf?.meeting_id || conf?.meeting
    if (!meetingId) return

    let polling = true

    const poll = async () => {
      if (!polling) return
      try {
        const res = await askToJoinMeeting(meetingId)
        if (res.status === 'accepted' || res.status === 'already_participant') {
          polling = false
          await doJoinAfterAcceptance()
        }
      } catch (err) {
        // Ignore poll errors silently (network hiccup, etc.)
      }
    }

    lobbyPollIntervalRef.current = setInterval(poll, 3000)

    return () => {
      polling = false
      if (lobbyPollIntervalRef.current) {
        clearInterval(lobbyPollIntervalRef.current)
        lobbyPollIntervalRef.current = null
      }
    }
  }, [isInLobby, joined, doJoinAfterAcceptance])

  useEffect(() => {
    if (conference?.submissions?.length > 0 && !initializedActiveCaseRef.current) {
      setActiveSubmissionId(conference.submissions[0].id)
      initializedActiveCaseRef.current = true
    }
  }, [conference])

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
      conferenceDataRef.current = data  // keep ref in sync

      if (data.recent_messages) {
        setChatMessages(data.recent_messages.reverse())
      }

      const me = data.participants?.find((p) => p.user === user?.id)
      const isMeetingHost = data.meeting_coordinator_id === user?.id || user?.role === 'ADMIN'
      setIsHost(me?.role === 'HOST' || isMeetingHost)

      if (data.status === 'ACTIVE') {
        if (me || isMeetingHost) {
          // User is already a participant or is the meeting host/coordinator:
          // auto-join directly without requiring a button click.
          // This also ensures the host is connected to WS and can receive
          // real-time join_requested events without needing a page refresh.
          try {
            await joinConference(data.id)
          } catch (e) {
            // Ignore — user may already be a conference participant
          }
          await connect()
          setJoined(true)
        } else {
          // Non-participant entering a live meeting: connect as lobby user,
          // then notify the host via HTTP (fires the WS join_requested event).
          const meetingId = data.meeting_id || data.meeting
          let alreadyAccepted = false
          if (meetingId) {
            try {
              const res = await askToJoinMeeting(meetingId)
              if (res.status === 'accepted' || res.status === 'already_participant') {
                // Already accepted (e.g., on page refresh after host accepted) — join immediately
                alreadyAccepted = true
                try {
                  await joinConference(data.id)
                } catch (e) {}
                await connect()
                setJoined(true)
                setIsInLobby(false)
                setLobbyConnected(false)
              }
            } catch (err) {
              console.error('Failed to send join request:', err)
            }
          }
          if (!alreadyAccepted) {
            // Still pending: enter lobby mode and wait for WS event or poll
            setIsInLobby(true)
            setLobbyConnected(true)
            await connect({ lobbyMode: true })
          }
        }
      }
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

  // For non-participants: connect to WebSocket in lobby mode first, then let
  // backend WebSocket event drive the accepted/rejected flow
  const handleLobbyConnect = useCallback(async () => {
    try {
      await connect({ lobbyMode: true })  // connect as lobby user
    } catch (err) {
      console.error('Lobby connect error:', err)
    }
  }, [connect])

  // Host: load current pending join requests from the API
  const loadJoinRequests = useCallback(async () => {
    if (!conference?.meeting_id && !conference?.meeting) return
    const meetingId = conference.meeting_id || conference.meeting
    try {
      const data = await listMeetingJoinRequests(meetingId)
      setJoinRequests(data)
    } catch (err) {
      console.error('Failed to load join requests:', err)
    }
  }, [conference])

  useEffect(() => {
    if (isHost && conference) {
      loadJoinRequests()
    }
  }, [isHost, conference, loadJoinRequests])

  // Host polling fallback: check for pending join requests every 5 seconds.
  // This ensures the host always sees requests even if the WS join_requested
  // event was missed (e.g., connection briefly down, or request sent before
  // host's WS was established).
  useEffect(() => {
    if (!isHost || !joined || !conference) {
      if (hostPollIntervalRef.current) {
        clearInterval(hostPollIntervalRef.current)
        hostPollIntervalRef.current = null
      }
      return
    }
    const meetingId = conference.meeting_id || conference.meeting
    if (!meetingId) return

    const pollHostRequests = async () => {
      try {
        const data = await listMeetingJoinRequests(meetingId)
        if (data && data.length > 0) {
          setJoinRequests(prev => {
            // Merge: add any new requests not already in state
            const existing = new Set(prev.map(r => r.id))
            const newOnes = data.filter(r => !existing.has(r.id))
            if (newOnes.length === 0) return prev
            // Show toast for first new request
            const first = newOnes[0]
            triggerToast(`${first.user_name} demande à rejoindre`, first.id)
            setShowAdmissions(true)
            return [...prev, ...newOnes]
          })
        }
      } catch (err) {
        // Ignore poll errors silently
      }
    }

    hostPollIntervalRef.current = setInterval(pollHostRequests, 5000)

    return () => {
      if (hostPollIntervalRef.current) {
        clearInterval(hostPollIntervalRef.current)
        hostPollIntervalRef.current = null
      }
    }
  }, [isHost, joined, conference, triggerToast])

  // Host: accept a join request
  const handleAcceptJoinRequest = async (requestId) => {
    if (!conference?.meeting_id && !conference?.meeting) return
    const meetingId = conference.meeting_id || conference.meeting
    try {
      await acceptMeetingJoinRequest(meetingId, requestId)
      setJoinRequests(prev => prev.filter(r => r.id !== requestId))
      if (joinToastRef.current?.requestId === requestId) {
        dismissToast()
      }
    } catch (err) {
      console.error('Accept failed:', err)
      alert(err.response?.data?.detail || 'Échec de l\'acceptation')
    }
  }

  // Host: reject a join request
  const handleRejectJoinRequest = async (requestId) => {
    if (!conference?.meeting_id && !conference?.meeting) return
    const meetingId = conference.meeting_id || conference.meeting
    try {
      await rejectMeetingJoinRequest(meetingId, requestId)
      setJoinRequests(prev => prev.filter(r => r.id !== requestId))
      if (joinToastRef.current?.requestId === requestId) {
        dismissToast()
      }
    } catch (err) {
      console.error('Reject failed:', err)
      alert(err.response?.data?.detail || 'Échec du refus')
    }
  }


  const handleStartMeeting = async () => {
    try {
      const updated = await startConference(conference.id)
      setConference(updated)
      // Auto-join immediately as host/coordinator
      await joinConference(updated.id)
      await connect()
      setJoined(true)
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
    if (!file) return
    const allowedExtensions = [
      '.pdf', '.docx', '.doc', '.txt',
      '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp',
      '.mp4', '.avi', '.mov', '.webm', '.mpeg',
      '.dcm', '.dicom', '.ima'
    ]
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      alert(`Le format de fichier "${ext}" n'est pas autorisé. Formats acceptés : PDF, Word, Texte, Images, Vidéos et DICOM.`)
      return
    }

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
    // If the user is in lobby mode (waiting for host approval)
    if (isInLobby || lobbyConnected) {
      return (
        <div className="conference-lobby">
          <div className="lobby-card" style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h2>{conference?.meeting_title || 'Demande d\'accès'}</h2>
            <p className="lobby-room" style={{ marginTop: '0.5rem' }}>
              Salle : <strong>{roomId}</strong>
            </p>
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              background: 'rgba(59,130,246,0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(59,130,246,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                <strong style={{ color: '#e2e8f0' }}>En attente de l'hôte...</strong>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                L'hôte doit approuver votre demande pour vous permettre d'entrer.
              </p>
            </div>
            <div className="lobby-actions" style={{ marginTop: '1.5rem' }}>
              <button
                className="btn-back"
                onClick={() => {
                  disconnect()
                  navigate('/meetings')
                }}
                style={{ width: '100%' }}
              >
                Annuler et retourner aux réunions
              </button>
            </div>
          </div>
        </div>
      )
    }

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
      {/* Join Request Toast for Hosts */}
      {joinToast && (
        <div
          className={`join-request-toast ${isToastLeaving ? 'leaving' : ''}`}
          id="join-request-toast"
        >
          <div style={{ fontSize: '1.5rem' }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>Demande d'accès</div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{joinToast.message}</div>
          </div>
          <button
            onClick={dismissToast}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

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
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); setShowCases(false); setShowAdmissions(false); }}
            title="Participants"
          >
            <Users size={18} />
            <span className="toolbar-count">{participants.length}</span>
          </button>
          <button
            className={`toolbar-btn ${showChat ? 'active' : ''}`}
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); setShowCases(false); setShowAdmissions(false); }}
            title="Chat"
          >
            <MessageSquare size={18} />
            {!!unreadCount && <span className="toolbar-count">{unreadCount}</span>}
          </button>
          <button
            className={`toolbar-btn ${showCases ? 'active' : ''}`}
            onClick={() => { setShowCases(!showCases); setShowParticipants(false); setShowChat(false); setShowAdmissions(false); }}
            title="Dossiers Médicaux"
          >
            <ClipboardList size={18} />
          </button>
          {isHost && (
            <button
              className={`toolbar-btn ${showAdmissions ? 'active' : ''}`}
              onClick={() => { setShowAdmissions(!showAdmissions); setShowParticipants(false); setShowChat(false); setShowCases(false); }}
              title="Admissions"
              id="admissions-btn"
              style={{ position: 'relative' }}
            >
              <UserCheck size={18} />
              {joinRequests.length > 0 && (
                <span className="toolbar-count" style={{ background: '#ef4444' }}>{joinRequests.length}</span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="conference-body">
        <div className={`video-area ${showParticipants || showChat || showCases ? 'with-sidebar' : ''} ${(activePreviewItem || activeFormDetail) ? 'has-preview' : ''}`}>
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
          {activePreviewItem && (
            <MainStageFileViewer 
              file={activePreviewItem} 
              onClose={() => setActivePreviewItem(null)} 
            />
          )}
          {/* Video grid — hidden when a dossier or file viewer is active */}
          {!activePreviewItem && !activeFormDetail && (
            <div className="full-video-container">
              <VideoGrid
                localStream={localStream}
                screenStream={screenStream}
                remoteStreams={remoteStreams}
                participants={participants}
                currentUserId={user?.id}
                isCameraOff={isCameraOff}
                isMuted={isMuted}
                screenSharer={screenSharer}
                localProfilePicture={user?.profile_picture}
              />
            </div>
          )}
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
          isCoordinator={user?.role === 'COORDINATEUR' || user?.role === 'ADMIN'}
        />

        {/* Host Admissions Sidebar */}
        {isHost && showAdmissions && (
          <div
            className="sidebar-panel"
            style={{
              width: 320,
              height: '100%',
              maxHeight: '100%',
              background: '#0f172a',
              borderLeft: '1px solid rgba(59,130,246,0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            id="admissions-sidebar"
          >
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(59,130,246,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={18} color="#60a5fa" />
                <strong style={{ color: '#e2e8f0' }}>Demandes d'accès</strong>
                {joinRequests.length > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '0 6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>{joinRequests.length}</span>
                )}
              </div>
              <button
                onClick={() => setShowAdmissions(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="sidebar-content" style={{ padding: '0.75rem' }}>
              {joinRequests.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0', fontSize: '0.9rem' }}>
                  Aucune demande en attente
                </div>
              ) : (
                joinRequests.map(req => (
                  <div
                    key={req.id}
                    style={{
                      background: 'rgba(30,58,138,0.3)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '10px',
                      padding: '0.875rem',
                      marginBottom: '0.625rem',
                    }}
                    id={`join-req-${req.id}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                      <div style={{
                        width: 36, height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, color: '#fff', fontSize: '0.9rem', flexShrink: 0,
                      }}>
                        {req.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.875rem', truncate: true }}>
                          {req.user_name}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{req.user_role}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleAcceptJoinRequest(req.id)}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #16a34a, #15803d)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                        id={`accept-req-${req.id}`}
                      >
                        <Check size={14} /> Accepter
                      </button>
                      <button
                        onClick={() => handleRejectJoinRequest(req.id)}
                        style={{
                          flex: 1,
                          background: 'rgba(239,68,68,0.2)',
                          border: '1px solid rgba(239,68,68,0.4)',
                          borderRadius: '8px',
                          color: '#f87171',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                        id={`reject-req-${req.id}`}
                      >
                        <XCircle size={14} /> Refuser
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Permanent attachments strip — visible only when a patient dossier is open */}
      {activeFormDetail && (
        <AttachmentsStrip
          attachments={formDetailData.attachments}
          onPreview={(file) => {
            setActivePreviewItem(file)
          }}
        />
      )}

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
