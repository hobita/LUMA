"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getIceServers } from "@/lib/webrtc/config";
import { SignalingPayload, WebRTCConnectionState } from "@/types/webrtc";

interface UseWebRTCOptions {
  slug: string;
  currentUserId: string;
  isOwner: boolean;
  partnerOnline: boolean;
}

export function useWebRTC({
  slug,
  currentUserId,
  isOwner,
  partnerOnline,
}: UseWebRTCOptions) {
  // DOM Video Element Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Connection & Media States
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>("new");
  const [hasRemoteMedia, setHasRemoteMedia] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Reactive streams: when these change, the component rebinds srcObject
  const [localDisplayStream, setLocalDisplayStream] = useState<MediaStream | null>(null);
  const [remoteDisplayStream, setRemoteDisplayStream] = useState<MediaStream | null>(null);

  const [remoteMediaState, setRemoteMediaState] = useState({
    micActive: true,
    videoActive: true,
    screenSharing: false,
  });

  // Internal WebRTC & Stream References
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const bufferedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null);
  const isInitiatorRef = useRef(isOwner);

  // Send signaling payload via Supabase Realtime & Local BroadcastChannel
  const broadcastSignaling = useCallback(
    (payload: SignalingPayload) => {
      // 1. Supabase Realtime
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "SIGNALING",
          payload,
        });
      }

      // 2. Local Tab BroadcastChannel fallback
      if (typeof window !== "undefined" && window.BroadcastChannel) {
        const bc = new BroadcastChannel(`luma-webrtc-${slug}`);
        bc.postMessage(payload);
        bc.close();
      }
    },
    [slug]
  );

  // Initialize Local Media (Camera & Microphone)
  const initLocalMedia = useCallback(async () => {
    try {
      if (localStreamRef.current) return localStreamRef.current;

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        // Fallback to audio-only if camera unavailable or denied
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        setVideoActive(false); // No camera track available
      }

      localStreamRef.current = stream;
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        cameraTrackRef.current = vTrack;
      }

      // Expose stream as reactive state so component can bind srcObject
      setLocalDisplayStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Media device access denied";
      console.warn("Local media initialization error:", errorMsg);
      setMediaError(errorMsg);
      return null;
    }
  }, []);

  // Flush any buffered ICE candidates once remote description is set
  const flushCandidates = useCallback(() => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    while (bufferedCandidatesRef.current.length > 0) {
      const candidate = bufferedCandidatesRef.current.shift();
      if (candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) =>
          console.warn("Error adding queued ICE candidate:", e)
        );
      }
    }
  }, []);

  // Create PeerConnection
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(getIceServers());
    pcRef.current = pc;

    // Attach local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteDisplayStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setHasRemoteMedia(true);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        broadcastSignaling({
          type: "candidate",
          senderId: currentUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === "connected") {
        setHasRemoteMedia(true);
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setHasRemoteMedia(false);
      }
    };

    return pc;
  }, [broadcastSignaling, currentUserId]);

  // Initiate WebRTC Offer
  const startCall = useCallback(async () => {
    const stream = await initLocalMedia();
    const pc = createPeerConnection();

    // Ensure tracks are added
    if (stream) {
      stream.getTracks().forEach((track) => {
        const senders = pc.getSenders();
        if (!senders.some((s) => s.track === track)) {
          pc.addTrack(track, stream);
        }
      });
    }

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      broadcastSignaling({
        type: "offer",
        senderId: currentUserId,
        sdp: offer.sdp,
      });
    } catch (err) {
      console.error("Error creating WebRTC offer:", err);
    }
  }, [initLocalMedia, createPeerConnection, broadcastSignaling, currentUserId]);

  // Handle incoming signaling messages
  const handleSignaling = useCallback(
    async (payload: SignalingPayload) => {
      if (!payload || payload.senderId === currentUserId) return;

      if (payload.type === "media_state" && payload.mediaState) {
        setRemoteMediaState(payload.mediaState);
        return;
      }

      if (payload.type === "peer_ready") {
        // Partner is ready: if we are the owner or ready, start call
        if (isInitiatorRef.current) {
          startCall();
        }
        return;
      }

      if (payload.type === "offer" && payload.sdp) {
        await initLocalMedia();
        const pc = createPeerConnection();

        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "offer", sdp: payload.sdp })
        );
        flushCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        broadcastSignaling({
          type: "answer",
          senderId: currentUserId,
          sdp: answer.sdp,
        });
        return;
      }

      if (payload.type === "answer" && payload.sdp) {
        const pc = pcRef.current;
        if (pc && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: payload.sdp })
          );
          flushCandidates();
        }
        return;
      }

      if (payload.type === "candidate" && payload.candidate) {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.warn("Error adding ICE candidate:", e);
          }
        } else {
          bufferedCandidatesRef.current.push(payload.candidate);
        }
      }
    },
    [
      currentUserId,
      initLocalMedia,
      createPeerConnection,
      flushCandidates,
      broadcastSignaling,
      startCall,
    ]
  );

  // Setup Realtime & BroadcastChannel listeners
  useEffect(() => {
    initLocalMedia();

    const supabase = supabaseRef.current;
    const channel = supabase.channel(`room:${slug}:webrtc`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "SIGNALING" }, ({ payload }) => {
        handleSignaling(payload as SignalingPayload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Announce peer ready
          broadcastSignaling({
            type: "peer_ready",
            senderId: currentUserId,
          });
        }
      });

    // Local tab broadcast listener
    let localBc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      localBc = new BroadcastChannel(`luma-webrtc-${slug}`);
      localBc.onmessage = (e) => {
        handleSignaling(e.data as SignalingPayload);
      };
    }

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      localBc?.close();

      // Clean up peer connection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      // Stop local tracks on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [slug, currentUserId, initLocalMedia, handleSignaling, broadcastSignaling]);

  // When partner presence changes to online, trigger peer ready
  useEffect(() => {
    if (partnerOnline) {
      broadcastSignaling({
        type: "peer_ready",
        senderId: currentUserId,
      });
      if (isInitiatorRef.current) {
        startCall();
      }
    }
  }, [partnerOnline, broadcastSignaling, currentUserId, startCall]);

  // Media Controls: Toggle Microphone
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicActive(audioTrack.enabled);

      broadcastSignaling({
        type: "media_state",
        senderId: currentUserId,
        mediaState: {
          micActive: audioTrack.enabled,
          videoActive,
          screenSharing,
        },
      });
    }
  }, [broadcastSignaling, currentUserId, videoActive, screenSharing]);

  // Media Controls: Toggle Camera
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const vTrack = localStreamRef.current.getVideoTracks()[0];
    if (vTrack) {
      vTrack.enabled = !vTrack.enabled;
      setVideoActive(vTrack.enabled);

      broadcastSignaling({
        type: "media_state",
        senderId: currentUserId,
        mediaState: {
          micActive,
          videoActive: vTrack.enabled,
          screenSharing,
        },
      });
    }
  }, [broadcastSignaling, currentUserId, micActive, screenSharing]);

  // Stop screen sharing — extracted as a ref-based function so `onended` never captures stale closures
  const stopScreenSharingRef = useRef<() => void>(() => {});
  stopScreenSharingRef.current = async () => {
    // Save reference before clearing
    const stoppedScreenTrack = screenTrackRef.current;

    // Stop the screen track
    if (stoppedScreenTrack) {
      stoppedScreenTrack.stop();
      screenTrackRef.current = null;
    }

    // Revert peer connection sender to camera track
    const pc = pcRef.current;
    if (cameraTrackRef.current && pc) {
      // Find the sender: it either still holds the (now stopped) screen track,
      // holds any video-kind track, or has a null track (stopped track gets nulled by browser)
      const videoSender = pc.getSenders().find(
        (s) =>
          s.track === stoppedScreenTrack ||
          s.track?.kind === "video" ||
          (s !== pc.getSenders().find((x) => x.track?.kind === "audio") && !s.track)
      );

      if (videoSender) {
        try {
          await videoSender.replaceTrack(cameraTrackRef.current);
        } catch (e) {
          console.warn("Error restoring camera track:", e);
        }
      }
    }

    // Restore local camera preview
    if (localStreamRef.current) {
      setLocalDisplayStream(localStreamRef.current);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setScreenSharing(false);

    broadcastSignaling({
      type: "media_state",
      senderId: currentUserId,
      mediaState: {
        micActive,
        videoActive,
        screenSharing: false,
      },
    });
  };

  // Media Controls: Toggle Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (!screenSharing) {
      // Start sharing screen
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        screenTrackRef.current = screenTrack;

        // Replace video track in peer connection (if connected)
        const pc = pcRef.current;
        if (pc) {
          // Find the sender that's carrying a video track (camera)
          const videoSender = pc
            .getSenders()
            .find((s) => s.track?.kind === "video");

          if (videoSender) {
            await videoSender.replaceTrack(screenTrack);
          } else {
            // No video sender yet (e.g. audio-only fallback) — add the screen track
            pc.addTrack(screenTrack, screenStream);
          }
        }

        // Preview locally
        setLocalDisplayStream(screenStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setScreenSharing(true);

        broadcastSignaling({
          type: "media_state",
          senderId: currentUserId,
          mediaState: {
            micActive,
            videoActive,
            screenSharing: true,
          },
        });

        // When user stops sharing via browser native UI banner
        screenTrack.onended = () => {
          stopScreenSharingRef.current();
        };
      } catch {
        // User cancelled screen picker dialog
      }
    } else {
      stopScreenSharingRef.current();
    }
  }, [screenSharing, broadcastSignaling, currentUserId, micActive, videoActive]);

  return {
    localVideoRef,
    remoteVideoRef,
    localDisplayStream,
    remoteDisplayStream,
    connectionState,
    hasRemoteMedia,
    micActive,
    videoActive,
    screenSharing,
    remoteMediaState,
    mediaError,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    startCall,
  };
}
