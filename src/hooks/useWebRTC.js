import { useEffect, useRef, useState, useCallback } from "react";
import SimplePeer from "simple-peer/simplepeer.min.js";
import { getToken } from "../api/authApi";
import { RTC_ICE_SERVERS, WS_BASE_URL } from "../api/config";

/**
 * Custom hook for managing WebRTC peer connections and WebSocket signaling.
 */
export default function useWebRTC(
  roomId,
  userId,
  onChatMessage,
  onNotesUpdate,
  onConferenceEnded,
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

  const wsRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const currentVideoTrackRef = useRef(null);
  const handleSignalingMessageRef = useRef(null);

  const cleanupPeers = useCallback(() => {
    Object.values(peersRef.current).forEach((p) => {
      if (!p.destroyed) {
        try {
          p.destroy();
        } catch (e) {}
      }
    });
    peersRef.current = {};
    setRemoteStreams({});
  }, []);

  const createPeer = useCallback((peerId, initiator) => {
    if (peersRef.current[peerId]) return;

    console.log(`WebRTC: Creating peer for ${peerId}, initiator: ${initiator}`);

    const peer = new SimplePeer({
      initiator,
      stream: localStreamRef.current || undefined,
      trickle: true,
      config: {
        iceServers: RTC_ICE_SERVERS,
      },
    });

    peer.on("signal", (signalData) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        let type =
          signalData.type === "answer"
            ? "webrtc_answer"
            : signalData.candidate
              ? "webrtc_ice_candidate"
              : "webrtc_offer";
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
      delete peersRef.current[peerId];
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    });

    peersRef.current[peerId] = peer;
  }, []);

  const handleSignalingMessage = useCallback(
    (data) => {
      switch (data.type) {
        case "participants_list":
          setParticipants(data.participants || []);
          (data.participants || []).forEach((p) => {
            if (p.user_id !== userId && !peersRef.current[p.user_id])
              createPeer(p.user_id, true);
          });
          break;
        case "participant_joined":
          if (data.user_id !== userId) {
            setParticipants((prev) => {
              if (prev.find((p) => p.user_id === data.user_id)) return prev;
              return [
                ...prev,
                { ...data.user_info, is_muted: true, is_camera_off: true },
              ];
            });
          }
          break;
        case "participant_left":
          setParticipants((prev) =>
            prev.filter((p) => p.user_id !== data.user_id),
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
        case "webrtc_ice_candidate":
          const peerId = data.sender_user_id;
          if (!peersRef.current[peerId]) createPeer(peerId, false);
          const p = peersRef.current[peerId];
          if (p && !p.destroyed) p.signal(data.data);
          break;
        case "media_state_update":
          setParticipants((prev) =>
            prev.map((p) =>
              p.user_id === data.user_id
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
              p.user_id === data.user_id
                ? { ...p, hand_raised: data.hand_raised }
                : p,
            ),
          );
          break;
        case "chat_message":
          if (onChatMessage) onChatMessage(data);
          break;
        case "notes_update":
          if (onNotesUpdate && data.user_id !== userId)
            onNotesUpdate(data.notes);
          break;
        case "conference_ended":
          if (onConferenceEnded) onConferenceEnded();
          break;
        default:
          break;
      }
    },
    [createPeer, onChatMessage, userId],
  );

  useEffect(() => {
    handleSignalingMessageRef.current = handleSignalingMessage;
  }, [handleSignalingMessage]);

  const connect = useCallback(async () => {
    try {
      try {
        console.log("WebRTC: Requesting Camera/Mic access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        console.log("WebRTC: Media access GRANTED", {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });

        // Mute and Turn off camera by default
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
        stream.getVideoTracks().forEach((t) => (t.enabled = false));

        setLocalStream(stream);
        localStreamRef.current = stream;
        currentVideoTrackRef.current = stream.getVideoTracks()[0] || null;

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
        if (e.name === "NotReadableError" || e.message.includes("in use")) {
          alert(
            `Camera/Microphone is already in use by another application.\n\n1. Close other apps like Teams, Zoom, or Chrome.\n2. Ensure no other instances of this app are running.\n3. Restart the app.`,
          );
        } else if (e.name === "NotAllowedError") {
          alert(
            "Permission denied. please check your Windows Privacy settings.",
          );
        } else {
          alert(
            `Failed to access camera/microphone: ${e.message}\n\nPlease ensure hardware is connected.`,
          );
        }
      }

      const wsToken = getToken();
      if (!wsToken) {
        throw new Error("Missing access token for websocket connection");
      }
      const ws = new WebSocket(
        `${WS_BASE_URL}/ws/conference/${roomId}/?token=${encodeURIComponent(wsToken)}`,
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WS: Connected to signaling server");
        setIsConnected(true);
        // Report initial state (Muted/Camera Off) to other participants
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "media_state_update",
              is_muted: true,
              is_camera_off: true,
            }),
          );
        }
      };
      ws.onmessage = (e) =>
        handleSignalingMessageRef.current?.(JSON.parse(e.data));
      ws.onerror = (e) => console.error("WS: Connection error", e);
      ws.onclose = (e) => {
        console.warn(
          `WS: Closed code=${e.code} reason=${e.reason} clean=${e.wasClean}`,
        );
        setIsConnected(false);
        cleanupPeers();
      };
    } catch (err) {
      console.error("WebRTC: Connection error", err);
    }
  }, [cleanupPeers, roomId]);

  const replaceOutgoingVideoTrack = useCallback((nextTrack) => {
    const prevTrack = currentVideoTrackRef.current;
    Object.values(peersRef.current).forEach((p) => {
      if (p.destroyed) return;
      try {
        if (prevTrack && typeof p.replaceTrack === "function") {
          p.replaceTrack(
            prevTrack,
            nextTrack,
            localStreamRef.current || undefined,
          );
        } else if (typeof p.addTrack === "function") {
          p.addTrack(nextTrack, localStreamRef.current || undefined);
        }
      } catch (e) {
        console.warn("WebRTC: Track replacement error", e);
      }
    });
    currentVideoTrackRef.current = nextTrack;
  }, []);

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
      alert(
        "Microphone stream not available. Please ensure your mic is connected.",
      );
    }
  }, [broadcastMediaState, isCameraOff, isMuted]);

  const toggleCamera = useCallback(() => {
    console.log("WebRTC: toggleCamera clicked", {
      hasStream: !!localStreamRef.current,
    });
    if (localStreamRef.current) {
      const state = !isCameraOff;
      console.log(`WebRTC: Setting Camera enabled to ${!state}`);
      localStreamRef.current
        .getVideoTracks()
        .forEach((t) => (t.enabled = !state));
      setIsCameraOff(state);
      broadcastMediaState(isMuted, state);
    } else {
      alert(
        "Camera stream not available. Please ensure your camera is connected.",
      );
    }
  }, [broadcastMediaState, isCameraOff, isMuted]);

  const startScreenShare = useCallback(async () => {
    console.log("WebRTC: startScreenShare clicked");
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      console.log("WebRTC: Screen share stream obtained", {
        trackCount: screen.getTracks().length,
      });
      const track = screen.getVideoTracks()[0];
      setScreenStream(screen);
      setIsScreenSharing(true);
      setScreenSharer(userId);
      if (track) {
        replaceOutgoingVideoTrack(track);
        track.onended = () => stopScreenShare();
      }
      wsRef.current?.send(JSON.stringify({ type: "screen_share_started" }));
    } catch (e) {
      console.error("WebRTC: Screen share failed", e);
      alert(`Screen sharing failed: ${e.message}`);
    }
  }, [replaceOutgoingVideoTrack, userId]);

  const stopScreenShare = useCallback(() => {
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setIsScreenSharing(false);
    setScreenSharer(null);
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) replaceOutgoingVideoTrack(track);
    }
    wsRef.current?.send(JSON.stringify({ type: "screen_share_stopped" }));
  }, [replaceOutgoingVideoTrack, screenStream]);

  useEffect(
    () => () => {
      cleanupPeers();
      if (wsRef.current) wsRef.current.close();
    },
    [cleanupPeers],
  );

  return {
    localStream,
    screenStream,
    remoteStreams,
    participants,
    isConnected,
    isMuted,
    isCameraOff,
    isScreenSharing,
    screenSharer: screenSharer || (isScreenSharing ? userId : null),
    connect,
    disconnect: () => {
      cleanupPeers();
      wsRef.current?.close();
    },
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendChatMessage: (c) =>
      wsRef.current?.send(JSON.stringify({ type: "chat_message", content: c })),
    broadcastNotes: (n) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "notes_update", notes: n }));
        return true;
      }
      return false;
    },
    raiseHand: () =>
      wsRef.current?.send(JSON.stringify({ type: "raise_hand" })),
  };
}
