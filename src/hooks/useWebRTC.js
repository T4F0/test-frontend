import { useEffect, useRef, useState, useCallback } from 'react'
import SimplePeer from 'simple-peer'
import { getToken } from '../api/authApi'

/**
 * Custom hook for managing WebRTC peer connections and WebSocket signaling.
 * Supports mesh topology for multi-participant video conferencing.
 */
export default function useWebRTC(roomId, userId, onChatMessage) {
  const [localStream, setLocalStream] = useState(null)
  const [screenStream, setScreenStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState({}) // { peerId: stream }
  const [participants, setParticipants] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenSharer, setScreenSharer] = useState(null)

  const wsRef = useRef(null)
  const peersRef = useRef({}) // { peerId: SimplePeer instance }
  const localStreamRef = useRef(null)

  // Initialize WebSocket connection
  const connect = useCallback(async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      setLocalStream(stream)
      localStreamRef.current = stream

      // Connect to WebSocket
      const token = getToken()
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const wsHost = window.location.host
      const wsUrl = `${wsProtocol}://${wsHost}/ws/conference/${roomId}/?token=${token}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleSignalingMessage(data)
      }

      ws.onclose = () => {
        setIsConnected(false)
        cleanupPeers()
      }

      ws.onerror = (err) => {
        console.error('WebSocket error:', err)
      }
    } catch (err) {
      console.error('Failed to initialize media:', err)
      // Connect without media if camera/mic not available
      const token = getToken()
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const wsHost = window.location.host
      const wsUrl = `${wsProtocol}://${wsHost}/ws/conference/${roomId}/?token=${token}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => setIsConnected(true)
      ws.onmessage = (event) => handleSignalingMessage(JSON.parse(event.data))
      ws.onclose = () => { setIsConnected(false); cleanupPeers() }
    }
  }, [roomId])

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback((data) => {
    switch (data.type) {
      case 'participants_list':
        setParticipants(data.participants || [])
        // Create peer connections for existing participants
        ;(data.participants || []).forEach((p) => {
          if (p.user_id !== userId && !peersRef.current[p.user_id]) {
            createPeer(p.user_id, true) // we are the initiator
          }
        })
        break

      case 'participant_joined':
        if (data.user_id !== userId) {
          setParticipants((prev) => {
            const exists = prev.find((p) => p.user_id === data.user_id)
            if (exists) return prev
            return [...prev, data.user_info]
          })
          // Wait for the new peer to initiate
        }
        break

      case 'participant_left':
        setParticipants((prev) => prev.filter((p) => p.user_id !== data.user_id))
        if (peersRef.current[data.user_id]) {
          peersRef.current[data.user_id].destroy()
          delete peersRef.current[data.user_id]
          setRemoteStreams((prev) => {
            const next = { ...prev }
            delete next[data.user_id]
            return next
          })
        }
        break

      case 'webrtc_offer':
      case 'webrtc_answer':
      case 'webrtc_ice_candidate':
        handleWebRTCSignal(data)
        break

      case 'chat_message':
        if (onChatMessage) {
          onChatMessage(data)
        }
        break

      case 'hand_raise_update':
        setParticipants((prev) =>
          prev.map((p) =>
            p.user_id === data.user_id ? { ...p, hand_raised: data.hand_raised } : p
          )
        )
        break

      case 'force_mute':
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false })
          setIsMuted(true)
        }
        break

      case 'screen_share_update':
        setScreenSharer(data.sharing ? data.user_id : null)
        break
    }
  }, [userId, onChatMessage])

  // Create a peer connection
  const createPeer = useCallback((peerId, initiator) => {
    if (peersRef.current[peerId]) return

    const peer = new SimplePeer({
      initiator,
      stream: localStreamRef.current || undefined,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    })

    peer.on('signal', (signalData) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        let type = 'webrtc_offer'
        if (signalData.type === 'answer') type = 'webrtc_answer'
        else if (signalData.candidate) type = 'webrtc_ice_candidate'

        ws.send(JSON.stringify({
          type,
          target_user_id: peerId,
          data: signalData,
        }))
      }
    })

    peer.on('stream', (stream) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }))
    })

    peer.on('close', () => {
      delete peersRef.current[peerId]
      setRemoteStreams((prev) => {
        const next = { ...prev }
        delete next[peerId]
        return next
      })
    })

    peer.on('error', (err) => {
      console.error(`Peer error with ${peerId}:`, err)
      delete peersRef.current[peerId]
    })

    peersRef.current[peerId] = peer
  }, [])

  // Handle incoming WebRTC signals
  const handleWebRTCSignal = useCallback((data) => {
    const peerId = data.sender_user_id
    if (!peersRef.current[peerId]) {
      createPeer(peerId, false)
    }

    try {
      const peer = peersRef.current[peerId]
      if (peer && !peer.destroyed) {
        peer.signal(data.data)
      }
    } catch (err) {
      console.error('Error signaling peer:', err)
    }
  }, [createPeer])

  // Toggle microphone
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const newMuted = !isMuted
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !newMuted
      })
      setIsMuted(newMuted)
    }
  }, [isMuted])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const newOff = !isCameraOff
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !newOff
      })
      setIsCameraOff(newOff)
    }
  }, [isCameraOff])

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      setScreenStream(screen)
      setIsScreenSharing(true)

      // Replace video track in all peer connections
      const videoTrack = screen.getVideoTracks()[0]
      Object.values(peersRef.current).forEach((peer) => {
        if (!peer.destroyed) {
          const sender = peer._pc?.getSenders()?.find((s) => s.track?.kind === 'video')
          if (sender) {
            sender.replaceTrack(videoTrack)
          }
        }
      })

      // Notify via WebSocket
      wsRef.current?.send(JSON.stringify({ type: 'screen_share_started' }))

      // Handle user stopping screen share via browser UI
      videoTrack.onended = () => {
        stopScreenShare()
      }
    } catch (err) {
      console.error('Screen share error:', err)
    }
  }, [])

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop())
      setScreenStream(null)
    }
    setIsScreenSharing(false)

    // Restore camera track
    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0]
      if (cameraTrack) {
        Object.values(peersRef.current).forEach((peer) => {
          if (!peer.destroyed) {
            const sender = peer._pc?.getSenders()?.find((s) => s.track?.kind === 'video')
            if (sender) {
              sender.replaceTrack(cameraTrack)
            }
          }
        })
      }
    }

    wsRef.current?.send(JSON.stringify({ type: 'screen_share_stopped' }))
  }, [screenStream])

  // Send chat message
  const sendChatMessage = useCallback((content, messageType = 'TEXT') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        content,
        message_type: messageType,
      }))
    }
  }, [])

  // Raise hand
  const raiseHand = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'raise_hand' }))
    }
  }, [])

  // Mute a participant (host only)
  const muteRemoteParticipant = useCallback((targetUserId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mute_participant',
        target_user_id: targetUserId,
      }))
    }
  }, [])

  // Cleanup
  const cleanupPeers = useCallback(() => {
    Object.values(peersRef.current).forEach((peer) => {
      if (!peer.destroyed) peer.destroy()
    })
    peersRef.current = {}
    setRemoteStreams({})
  }, [])

  const disconnect = useCallback(() => {
    cleanupPeers()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      setLocalStream(null)
      localStreamRef.current = null
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop())
      setScreenStream(null)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [screenStream, cleanupPeers])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  return {
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
  }
}
