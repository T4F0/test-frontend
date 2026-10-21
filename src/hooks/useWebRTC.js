import { useEffect, useRef, useState, useCallback } from "react";
import SimplePeer from "simple-peer/simplepeer.min.js";
import { getToken } from "../api/authApi";
import { RTC_ICE_SERVERS, WS_BASE_URL } from "../api/config";
import {
  AUDIO_BPS,
  SCREEN_BPS,
  applySenderPlan,
  audioConstraints,
  createPlaceholderVideo,
  getSender,
  nextLevel,
  planVideoQuality,
  sampleStats,
  tuneOpusSdp,
  videoConstraints,
} from "../lib/rtcQuality";
import { toast } from '../lib/toast'

const QUALITY_POLL_MS = 4000;
const RECONNECT_MAX_ATTEMPTS = 8;
// Close codes the server uses for "do not come back" (unauthenticated / forbidden / bad request)
const FATAL_CLOSE_CODES = [4400, 4401, 4403];

/**
 * Custom hook for managing WebRTC peer connections and WebSocket signaling.
 */
export default function useWebRTC(
  roomId,
  userId,
  onChatMessage,
  onNotesUpdate,
  onConferenceEnded,
  onLobbyWaiting,
  onJoinAccepted,
  onJoinRejected,
  onJoinRequested,
  onDicomViewportSync,
  onDicomPresenterMode,
  onDicomAnnotationSync,
) {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenSharer, setScreenSharer] = useState(null);
  const [peerQuality, setPeerQuality] = useState({});
  const [lowData, setLowDataState] = useState(false);

  const wsRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const currentVideoTrackRef = useRef(null);
  const handleSignalingMessageRef = useRef(null);
  const isLobbyConnectionRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const qualityRef = useRef({}); // peerId -> { level, goodStreak, prev }
  const lowDataRef = useRef(false);
  const screenTrackRef = useRef(null);
  const screenStreamRef = useRef(null);
  const connectedPeersRef = useRef(new Set());
  const sendStreamRef = useRef(null); // what peers receive: microphone + (camera | screen | placeholder)
  const placeholderRef = useRef(null);

  const cleanupPeers = useCallback(() => {
    Object.values(peersRef.current).forEach((p) => {
      if (!p.destroyed) {
        try {
          p.destroy();
        } catch (e) {}
      }
    });
    peersRef.current = {};
    connectedPeersRef.current = new Set();
    qualityRef.current = {};
    setRemoteStreams({});
    setPeerQuality({});
  }, []);

  // ---- Adaptive quality -------------------------------------------------------------------------

  const remoteCount = () => Math.max(1, connectedPeersRef.current.size);

  const applyPeerPlan = useCallback(async (peerId) => {
    const peer = peersRef.current[peerId];
    if (!peer || peer.destroyed) return;
    const level = qualityRef.current[peerId]?.level ?? 0;
    if (screenTrackRef.current) {
      // Screen content: keep it sharp, spend frames sparingly
      await applySenderPlan(peer, "video", {
        maxBitrate: SCREEN_BPS,
        maxFramerate: 15,
        scaleResolutionDownBy: 1,
        degradationPreference: "maintain-resolution",
      });
    } else {
      await applySenderPlan(peer, "video", planVideoQuality(remoteCount(), level, lowDataRef.current));
    }
    await applySenderPlan(peer, "audio", { maxBitrate: AUDIO_BPS });
  }, []);

  const applyAllPlans = useCallback(() => {
    Object.keys(peersRef.current).forEach((peerId) => applyPeerPlan(peerId));
    // Capture only as many pixels as the busiest outgoing stream will keep
    const camera = localStreamRef.current?.getVideoTracks()[0];
    if (camera && camera.readyState === "live") {
      camera.applyConstraints(videoConstraints(remoteCount(), lowDataRef.current)).catch(() => {});
    }
  }, [applyPeerPlan]);

  const setLowData = useCallback(
    (value) => {
      lowDataRef.current = Boolean(value);
      setLowDataState(Boolean(value));
      applyAllPlans();
    },
    [applyAllPlans],
  );

  const createPeer = useCallback((peerId, initiator) => {
    if (peersRef.current[peerId]) return;

    console.log(`WebRTC: Creating peer for ${peerId}, initiator: ${initiator}`);

    const peer = new SimplePeer({
      initiator,
      stream: localStreamRef.current || undefined,
      trickle: true,
      sdpTransform: tuneOpusSdp,
      config: {
        iceServers: RTC_ICE_SERVERS,
        iceCandidatePoolSize: 2,
        bundlePolicy: "max-bundle",
      },
    });

    peer.on("connect", () => {
      connectedPeersRef.current.add(peerId);
      qualityRef.current[peerId] = qualityRef.current[peerId] || { level: 0, goodStreak: 0, prev: null };
      // The number of peers we upload to just changed: re-plan everyone
      applyAllPlans();
    });

    // A failed ICE connection never recovers by itself: rebuild it (the lower id initiates, avoiding glare)
    peer.on("iceStateChange", (state) => {
      if (state !== "failed" || intentionalCloseRef.current) return;
      console.warn(`WebRTC: ICE failed with ${peerId}, rebuilding the connection`);
      try {
        peer.destroy();
      } catch (e) {}
      setTimeout(() => {
        if (!peersRef.current[peerId] && wsRef.current?.readyState === WebSocket.OPEN) {
          createPeer(peerId, String(userId) < String(peerId));
        }
      }, 1000 + Math.random() * 1000);
    });

    peer.on("signal", (signalData) => {
      let type =
        signalData.type === "answer"
          ? "webrtc_answer"
          : signalData.candidate
            ? "webrtc_ice_candidate"
            : "webrtc_offer";
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type, target_user_id: peerId, data: signalData }),
        );
      }
    });

    peer.on("stream", (stream) => {
      console.log(
        `WebRTC: Received stream with ${stream.getTracks().length} tracks from ${peerId}`,
      );
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    });

    peer.on("track", (track, stream) => {
      console.log(`WebRTC: Received track (${track.kind}) from ${peerId}`);
      // Force React state update by copying to new object
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    });

    peer.on("error", (err) => {
      console.error(`WebRTC: Peer connection error for ${peerId}`, err);
    });

    peer.on("close", () => {
      if (peersRef.current[peerId] === peer) delete peersRef.current[peerId];
      connectedPeersRef.current.delete(peerId);
      delete qualityRef.current[peerId];
      setPeerQuality((prev) => {
        if (!(peerId in prev)) return prev;
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      // Fewer peers to upload to: give the rest more bandwidth
      setTimeout(applyAllPlans, 0);
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    });

    peersRef.current[peerId] = peer;
  }, [applyAllPlans, userId]);

  const handleSignalingMessage = useCallback(
    (data) => {
      switch (data.type) {
        case "participants_list":
          setParticipants(data.participants || []);
          (data.participants || []).forEach((p) => {
            if (String(p.user_id) !== String(userId) && !peersRef.current[p.user_id])
              createPeer(p.user_id, true);
          });
          break;
        case "participant_joined":
          if (String(data.user_id) !== String(userId)) {
            setParticipants((prev) => {
              if (prev.find((p) => String(p.user_id) === String(data.user_id))) return prev;
              return [
                ...prev,
                { ...data.user_info, is_muted: true, is_camera_off: true },
              ];
            });
            if (!peersRef.current[data.user_id]) {
              createPeer(data.user_id, false);
            }
          }
          break;
        case "participant_left":
          setParticipants((prev) =>
            prev.filter((p) => String(p.user_id) !== String(data.user_id)),
          );
          if (peersRef.current[data.user_id]) {
            peersRef.current[data.user_id].destroy();
            delete peersRef.current[data.user_id];
            setRemoteStreams((prev) => {
              const next = { ...prev };
              delete next[data.user_id];
              return next;
            });
          }
          break;
        case "webrtc_offer":
        case "webrtc_answer":
        case "webrtc_ice_candidate": {
          const peerId = data.sender_user_id;
          if (!peersRef.current[peerId]) createPeer(peerId, false);
          const p = peersRef.current[peerId];
          if (p && !p.destroyed) p.signal(data.data);
          break;
        }
        case "media_state_update":
          setParticipants((prev) =>
            prev.map((p) =>
              String(p.user_id) === String(data.user_id)
                ? {
                    ...p,
                    is_muted: data.is_muted,
                    is_camera_off: data.is_camera_off,
                  }
                : p,
            ),
          );
          break;
        case "screen_share_update":
          setScreenSharer(data.sharing ? data.user_id : null);
          break;
        case "hand_raise_update":
          setParticipants((prev) =>
            prev.map((p) =>
              String(p.user_id) === String(data.user_id)
                ? { ...p, hand_raised: data.hand_raised }
                : p,
            ),
          );
          break;
        case "chat_history":
          if (onChatMessage && data.messages) {
            data.messages.forEach((msg) => {
              onChatMessage({ ...msg, type: 'chat_message' });
            });
          }
          break;
        case "chat_message":
          if (onChatMessage) onChatMessage(data);
          break;
        case "notes_update":
          if (onNotesUpdate && String(data.user_id) !== String(userId))
            onNotesUpdate(data.notes);
          break;
        case "conference_ended":
          intentionalCloseRef.current = true;
          if (onConferenceEnded) onConferenceEnded();
          break;
        // ---- Ask-to-Join events ----
        case "lobby_waiting":
          // Server acknowledged lobby connection
          if (onLobbyWaiting) onLobbyWaiting();
          break;
        case "join_accepted":
          // Host accepted this user's join request
          console.log("useWebRTC: join_accepted event received from WS!");
          if (onJoinAccepted) onJoinAccepted();
          break;
        case "join_rejected":
          // Host rejected this user's join request
          if (onJoinRejected) onJoinRejected(data.reason);
          break;
        case "join_requested":
          // A new user is requesting to join (sent to hosts)
          if (onJoinRequested) onJoinRequested(data);
          break;
        case "dicom_viewport_sync":
          if (onDicomViewportSync) onDicomViewportSync(data);
          break;
        case "dicom_presenter_mode":
          if (onDicomPresenterMode) onDicomPresenterMode(data);
          break;
        case "dicom_annotation_sync":
          if (onDicomAnnotationSync) onDicomAnnotationSync(data);
          break;
        default:
          break;
      }
    },
    [
      createPeer,
      onChatMessage,
      onConferenceEnded,
      onJoinAccepted,
      onJoinRejected,
      onJoinRequested,
      onLobbyWaiting,
      onNotesUpdate,
      onDicomViewportSync,
      onDicomPresenterMode,
      onDicomAnnotationSync,
      userId,
    ],
  );


  useEffect(() => {
    handleSignalingMessageRef.current = handleSignalingMessage;
  }, [handleSignalingMessage]);

  const connect = useCallback(async ({ lobbyMode = false } = {}) => {
    try {
      // Only request media for full participant connections (not lobby mode)
      if (!lobbyMode) {
        if (!localStreamRef.current) {
          try {
            console.log("WebRTC: Requesting microphone access...");
            // Audio only at join: the camera is opened when the user turns it on (see toggleCamera),
            // so the hardware, its light and its encoder stay idle until needed.
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraints(),
              video: false,
            });
            stream.getAudioTracks().forEach((t) => (t.enabled = false)); // muted by default
            setLocalStream(stream);
            localStreamRef.current = stream;

            // Add stream to any existing peers that were created before media was ready
            Object.values(peersRef.current).forEach((peer) => {
              if (!peer.destroyed && stream) {
                try {
                  peer.addStream(stream);
                } catch (e) {}
              }
            });
          } catch (e) {
            console.error("WebRTC: Media access failed", e);
            // Joining without a microphone is still useful (chat, viewer, camera): do not block the room
            const empty = new MediaStream();
            localStreamRef.current = empty;
            setLocalStream(empty);
            if (e.name === "NotReadableError" || e.message?.includes("in use")) {
              toast.error(
                `Camera/Microphone is already in use by another application.\n\n1. Close other apps like Teams, Zoom, or Chrome.\n2. Ensure no other instances of this app are running.\n3. Restart the app.`,
              );
            } else if (e.name === "NotAllowedError") {
              toast.error("Permission refusée pour le micro. Vérifiez les autorisations du navigateur ou du système.");
            } else if (e.name !== "NotFoundError") {
              toast.error(`Impossible d'accéder au micro : ${e.message}`);
            }
          }
        }
      }

      // Close any existing WS before opening a new one
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED
          && wsRef.current.readyState !== WebSocket.CLOSING) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
        if (!lobbyMode) {
          cleanupPeers();
        }
      } else if (wsRef.current) {
        wsRef.current = null;
        if (!lobbyMode) cleanupPeers();
      }

      isLobbyConnectionRef.current = lobbyMode;

      const wsToken = getToken();
      if (!wsToken) {
        throw new Error("Missing access token for websocket connection");
      }
      const ws = new WebSocket(
        `${WS_BASE_URL}/ws/conference/${roomId}/?token=${encodeURIComponent(wsToken)}`,
      );
      wsRef.current = ws;

      const wsOpenPromise = new Promise((resolve, reject) => {
        let opened = false;
        ws.onopen = () => {
          opened = true;
          reconnectAttemptsRef.current = 0;
          intentionalCloseRef.current = false;
          console.log(`WS: Connected to signaling server (lobby=${lobbyMode})`);
          setIsConnected(true);
          if (!isLobbyConnectionRef.current && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "media_state_update",
                is_muted: true,
                is_camera_off: true,
              }),
            );
          }
          resolve();
        };
        ws.onerror = (e) => {
          console.error("WS: Connection error", e);
          if (!opened) reject(new Error("WebSocket connection failed"));
        };
        ws.onmessage = (e) =>
          handleSignalingMessageRef.current?.(JSON.parse(e.data));
        ws.onclose = (e) => {
          console.warn(
            `WS: Closed code=${e.code} reason=${e.reason} clean=${e.wasClean}`,
          );
          setIsConnected(false);
          if (!opened) {
            reject(new Error(`WebSocket closed before open: code=${e.code}`));
            return;
          }
          if (!lobbyMode) {
            cleanupPeers();
            const retry =
              !intentionalCloseRef.current &&
              !FATAL_CLOSE_CODES.includes(e.code) &&
              reconnectAttemptsRef.current < RECONNECT_MAX_ATTEMPTS;
            if (retry) {
              // Any unexpected drop (network change, sleep, proxy timeout) is retried, with jittered backoff
              const delay =
                Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000) + Math.random() * 500;
              reconnectAttemptsRef.current += 1;
              console.log(`WS: Unexpected close (${e.code}), reconnect #${reconnectAttemptsRef.current} in ${Math.round(delay)}ms`);
              reconnectTimerRef.current = setTimeout(() => connect({ lobbyMode: false }), delay);
            } else if (!intentionalCloseRef.current) {
              console.warn("WS: giving up reconnecting");
              reconnectAttemptsRef.current = 0;
            }
          }
        };
      });

      try {
        await wsOpenPromise;
      } catch (err) {
        console.error("WebRTC: WS open failed", err);
        if (!lobbyMode) cleanupPeers();
        return;
      }
    } catch (err) {
      console.error("WebRTC: Connection error", err);
    }
  }, [cleanupPeers, roomId]);

  /**
   * Transition from lobby WebSocket connection to full participant connection.
   * Called after the host accepts a join request.
   * Closes the lobby WS and opens a new connection as a full participant.
   */
  const reconnectAsParticipant = useCallback(async () => {
    console.log("WebRTC: Reconnecting as full participant (was lobby user)");
    await connect({ lobbyMode: false });
  }, [connect]);

  // Point every peer's video sender at `nextTrack` (or at nothing). replaceTrack needs no renegotiation;
  // a peer that has never carried video gets the track added, which renegotiates once.
  const replaceOutgoingVideoTrack = useCallback(
    (nextTrack) => {
      Object.values(peersRef.current).forEach((p) => {
        if (p.destroyed) return;
        try {
          const sender = getSender(p, "video");
          if (sender) {
            sender.replaceTrack(nextTrack).catch(() => {});
          } else if (nextTrack && typeof p.addTrack === "function") {
            p.addTrack(nextTrack, localStreamRef.current || undefined);
          }
        } catch (e) {
          console.warn("WebRTC: Track replacement error", e);
        }
      });
      currentVideoTrackRef.current = nextTrack;
      setTimeout(applyAllPlans, 200);
    },
    [applyAllPlans],
  );

  const broadcastMediaState = useCallback((muted, cameraOff) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "media_state_update",
          is_muted: muted,
          is_camera_off: cameraOff,
        }),
      );
    }
  }, []);

  const toggleMute = useCallback(() => {
    console.log("WebRTC: toggleMute clicked", {
      hasStream: !!localStreamRef.current,
    });
    if (localStreamRef.current) {
      const state = !isMuted;
      console.log(`WebRTC: Setting Mic enabled to ${!state}`);
      localStreamRef.current
        .getAudioTracks()
        .forEach((t) => (t.enabled = !state));
      setIsMuted(state);
      broadcastMediaState(state, isCameraOff);
    } else {
      toast.error(
        "Microphone stream not available. Please ensure your mic is connected.",
      );
    }
  }, [broadcastMediaState, isCameraOff, isMuted]);

  const cameraBusyRef = useRef(false);

  // The camera is opened when turned on and released when turned off, instead of capturing all the time.
  const toggleCamera = useCallback(async () => {
    if (!localStreamRef.current) {
      toast.error("Flux local indisponible. Vérifiez que votre matériel est connecté.");
      return;
    }
    if (cameraBusyRef.current) return;
    cameraBusyRef.current = true;
    try {
      if (isCameraOff) {
        const media = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints(remoteCount(), lowDataRef.current),
          audio: false,
        });
        const track = media.getVideoTracks()[0];
        localStreamRef.current.getVideoTracks().forEach((t) => {
          localStreamRef.current.removeTrack(t);
          t.stop();
        });
        localStreamRef.current.addTrack(track);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        if (!screenTrackRef.current) replaceOutgoingVideoTrack(track);
        else currentVideoTrackRef.current = track;
        setIsCameraOff(false);
        broadcastMediaState(isMuted, false);
      } else {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          localStreamRef.current.removeTrack(t);
          t.stop();
        });
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        if (!screenTrackRef.current) replaceOutgoingVideoTrack(null);
        else currentVideoTrackRef.current = null;
        setIsCameraOff(true);
        broadcastMediaState(isMuted, true);
      }
    } catch (e) {
      console.error("WebRTC: camera toggle failed", e);
      if (e.name === "NotAllowedError") {
        toast.error("Permission refusée pour la caméra. Vérifiez les autorisations du navigateur ou du système.");
      } else if (e.name === "NotReadableError") {
        toast.error("La caméra est déjà utilisée par une autre application.");
      } else if (e.name === "NotFoundError") {
        toast.error("Aucune caméra détectée.");
      } else {
        toast.error(`Impossible d'activer la caméra : ${e.message}`);
      }
    } finally {
      cameraBusyRef.current = false;
    }
  }, [broadcastMediaState, isCameraOff, isMuted, replaceOutgoingVideoTrack]);

  const startScreenShare = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 10, max: 15 } },
        audio: false,
      });
      const track = screen.getVideoTracks()[0];
      screenStreamRef.current = screen;
      setScreenStream(screen);
      setIsScreenSharing(true);
      setScreenSharer(userId);
      if (track) {
        // Slides / images: favour sharp text over motion
        track.contentHint = "detail";
        screenTrackRef.current = track;
        replaceOutgoingVideoTrack(track);
        track.onended = () => stopScreenShare();
      }
      wsRef.current?.send(JSON.stringify({ type: "screen_share_started" }));
    } catch (e) {
      if (e.name !== "NotAllowedError") {
        console.error("WebRTC: Screen share failed", e);
        toast.error(`Le partage d'écran a échoué : ${e.message}`);
      }
    }
  }, [replaceOutgoingVideoTrack, userId]);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    screenTrackRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
    setScreenSharer(null);
    // Back to the camera if it is on, otherwise stop sending video
    const camera = localStreamRef.current?.getVideoTracks()[0] || null;
    replaceOutgoingVideoTrack(camera);
    wsRef.current?.send(JSON.stringify({ type: "screen_share_stopped" }));
  }, [replaceOutgoingVideoTrack]);

  // ---- Quality monitor: sample every peer, degrade fast / recover slowly, tell the UI --------------
  useEffect(() => {
    const timer = setInterval(async () => {
      const ids = Object.keys(peersRef.current).filter((id) => connectedPeersRef.current.has(id));
      if (ids.length === 0) return;
      const updates = {};
      await Promise.all(
        ids.map(async (peerId) => {
          const peer = peersRef.current[peerId];
          const state = qualityRef.current[peerId];
          if (!peer || peer.destroyed || !state) return;
          let sample = null;
          try {
            sample = await sampleStats(peer, state.prev);
          } catch (e) {
            return;
          }
          if (!sample) return;
          state.prev = { bytes: sample.bytes, timestamp: sample.timestamp };
          const next = nextLevel(state, sample);
          const changed = next.level !== state.level;
          state.level = next.level;
          state.goodStreak = next.goodStreak;
          updates[peerId] = { level: next.level, rttMs: sample.rttMs, lossPct: Math.round(sample.lossPct), kbps: sample.kbps };
          if (changed) applyPeerPlan(peerId);
        }),
      );
      if (Object.keys(updates).length) {
        setPeerQuality((prev) => ({ ...prev, ...updates }));
      }
    }, QUALITY_POLL_MS);
    return () => clearInterval(timer);
  }, [applyPeerPlan]);

  // Release the camera, microphone and screen capture when leaving, not just the connections
  const stopAllLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    screenTrackRef.current = null;
    currentVideoTrackRef.current = null;
  }, []);

  useEffect(
    () => () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      cleanupPeers();
      if (wsRef.current) wsRef.current.close();
      stopAllLocalMedia();
    },
    [cleanupPeers, stopAllLocalMedia],
  );

  const sendDicomViewportSync = useCallback((attachmentId, viewportState) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "dicom_viewport_sync",
          attachment_id: attachmentId,
          viewport_state: viewportState,
        }),
      );
      return true;
    }
    return false;
  }, []);

  const sendDicomPresenterMode = useCallback((attachmentId, isPresenting, fileInfo = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "dicom_presenter_mode",
          attachment_id: attachmentId,
          is_presenting: isPresenting,
          file_info: fileInfo,
        }),
      );
      return true;
    }
    return false;
  }, []);

  const sendDicomAnnotationSync = useCallback((attachmentId, action, annotationPayload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "dicom_annotation_sync",
          attachment_id: attachmentId,
          action: action,
          ...annotationPayload,
        }),
      );
      return true;
    }
    return false;
  }, []);

  return {
    localStream,
    screenStream,
    remoteStreams,
    participants,
    isConnected,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised: false,
    screenSharer: screenSharer || (isScreenSharing ? userId : null),
    connect,
    reconnectAsParticipant,
    disconnect: () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      cleanupPeers();
      wsRef.current?.close();
      stopAllLocalMedia();
    },
    peerQuality,
    lowData,
    setLowData,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendChatMessage: (c) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "chat_message", content: c }));
      }
    },
    broadcastNotes: (n) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "notes_update", notes: n }));
        return true;
      }
      return false;
    },
    raiseHand: () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "raise_hand" }));
      }
    },
    muteRemoteParticipant: (targetUserId) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "mute_participant", target_user_id: targetUserId }));
      }
    },
    sendDicomViewportSync,
    sendDicomPresenterMode,
    sendDicomAnnotationSync,
  };
}
