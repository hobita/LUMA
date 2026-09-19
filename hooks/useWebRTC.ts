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
  const [isMovieStreaming, setIsMovieStreaming] = useState(false);
  const [remoteMovieStream, setRemoteMovieStream] = useState<MediaStream | null>(null);
  const [remoteMovieTitle, setRemoteMovieTitle] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Reactive streams: when these change, the component rebinds srcObject
  const [localDisplayStream, setLocalDisplayStream] = useState<MediaStream | null>(null);
  const [remoteDisplayStream, setRemoteDisplayStream] = useState<MediaStream | null>(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);

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
  const screenSenderRef = useRef<RTCRtpSender | null>(null);
  const movieStreamRef = useRef<MediaStream | null>(null);
  const movieSendersRef = useRef<RTCRtpSender[]>([]);
  const remoteMovieStreamIdRef = useRef<string | null>(null);
  const isNegotiatingRef = useRef<boolean>(false);
  // Track IDs of the first remote video stream (camera) to distinguish from screen
  const remoteVideoStreamIdRef = useRef<string | null>(null);
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

    // Handle remote tracks — distinguish camera vs screen vs movie stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      const track = event.track;

      // 1. Is this the partner's Movie Stream?
      if (
        remoteMovieStreamIdRef.current &&
        (remoteStream.id === remoteMovieStreamIdRef.current ||
          remoteStream.id.includes("movie"))
      ) {
        setRemoteMovieStream(remoteStream);
        track.onended = () => {
          if (remoteStream.getTracks().every((t) => t.readyState === "ended")) {
            setRemoteMovieStream(null);
          }
        };
        setHasRemoteMedia(true);
        return;
      }

      // 2. Video Tracks: Camera vs Screen Share
      if (track.kind === "video") {
        if (!remoteVideoStreamIdRef.current) {
          // First video stream = camera
          remoteVideoStreamIdRef.current = remoteStream.id;
          setRemoteDisplayStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        } else if (remoteStream.id !== remoteVideoStreamIdRef.current) {
          // Check if this might be a movie stream that arrived before the signaling message
          if (remoteMovieStreamIdRef.current && remoteStream.id === remoteMovieStreamIdRef.current) {
            setRemoteMovieStream(remoteStream);
          } else {
            // Second video stream = screen share
            setRemoteScreenStream(remoteStream);

            track.onended = () => {
              setRemoteScreenStream(null);
            };
            track.onmute = () => {
              setRemoteScreenStream(null);
            };
          }
        }
      } else if (track.kind === "audio") {
        // If it's part of the movie stream
        if (remoteMovieStreamIdRef.current && remoteStream.id === remoteMovieStreamIdRef.current) {
          setRemoteMovieStream(remoteStream);
        } else if (!remoteVideoStreamIdRef.current) {
          // Audio-only case for camera/call
          setRemoteDisplayStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        }
      }
      setHasRemoteMedia(true);
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

    // Connection state changes (handles both standard and mobile/cellular iceConnectionState)
    const updateState = () => {
      const cState = pc.connectionState;
      const iceState = pc.iceConnectionState;

      if (cState === "connected" || iceState === "connected" || iceState === "completed") {
        setConnectionState("connected");
        setHasRemoteMedia(true);
      } else if (cState === "failed" || iceState === "failed") {
        setConnectionState("failed");
        try {
          pc.restartIce();
        } catch {}
      } else if (cState === "connecting" || iceState === "checking") {
        setConnectionState("connecting");
      } else if (cState === "disconnected" || iceState === "disconnected") {
        setConnectionState("disconnected");
      }
    };

    pc.onconnectionstatechange = updateState;
    pc.oniceconnectionstatechange = updateState;

    return pc;
  }, [broadcastSignaling, currentUserId]);

  // WebRTC Perfect Renegotiation: triggers offer/answer cycle when tracks change
  const renegotiate = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (isNegotiatingRef.current || pc.signalingState !== "stable") return;
      isNegotiatingRef.current = true;

      const offer = await pc.createOffer();
      if (pc.signalingState !== "stable") return;

      await pc.setLocalDescription(offer);
      broadcastSignaling({
        type: "offer",
        senderId: currentUserId,
        sdp: offer.sdp,
      });
    } catch (err) {
      console.warn("WebRTC renegotiation offer error:", err);
    } finally {
      isNegotiatingRef.current = false;
    }
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

      if (payload.type === "movie_stream_state" && payload.movieState) {
        if (payload.movieState.active) {
          remoteMovieStreamIdRef.current = payload.movieState.streamId;
          setRemoteMovieTitle(payload.movieState.title);
        } else {
          remoteMovieStreamIdRef.current = null;
          setRemoteMovieTitle(null);
          setRemoteMovieStream(null);
        }
        return;
      }

      if (payload.type === "peer_ready") {
        if (isInitiatorRef.current) {
          startCall();
        } else {
          // Acknowledge so the initiator knows we are subscribed and ready
          broadcastSignaling({
            type: "peer_ready",
            senderId: currentUserId,
          });
        }
        return;
      }

      if (payload.type === "offer" && payload.sdp) {
        await initLocalMedia();
        const pc = createPeerConnection();

        // Handle offer collision (glare)
        if (pc.signalingState !== "stable") {
          if (!isInitiatorRef.current) {
            // Polite peer rolls back local offer to accept partner's offer
            await pc.setLocalDescription({ type: "rollback" });
          } else {
            // Impolite peer ignores colliding offer
            return;
          }
        }

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
    const mediaTimer = setTimeout(() => {
      initLocalMedia();
    }, 0);

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
      clearTimeout(mediaTimer);
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

      // Stop movie stream tracks on unmount
      if (movieStreamRef.current) {
        movieStreamRef.current.getTracks().forEach((track) => track.stop());
        movieStreamRef.current = null;
      }
    };
  }, [slug, currentUserId, initLocalMedia, handleSignaling, broadcastSignaling]);

  // When partner presence changes to online, trigger peer ready and retry until connected
  useEffect(() => {
    if (!partnerOnline || connectionState === "connected") return;

    let retryCount = 0;
    const maxRetries = 6;

    const attemptConnect = () => {
      broadcastSignaling({
        type: "peer_ready",
        senderId: currentUserId,
      });
      if (isInitiatorRef.current) {
        startCall();
      }
    };

    attemptConnect();

    const timer = setInterval(() => {
      if (retryCount >= maxRetries) {
        clearInterval(timer);
        return;
      }
      retryCount++;
      attemptConnect();
    }, 2500);

    return () => clearInterval(timer);
  }, [partnerOnline, connectionState, broadcastSignaling, currentUserId, startCall]);

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

  // Stop screen sharing callback
  const stopScreenSharing = useCallback(async () => {
    // Stop the screen track
    const stoppedScreenTrack = screenTrackRef.current;
    if (stoppedScreenTrack) {
      stoppedScreenTrack.stop();
      screenTrackRef.current = null;
    }

    // Remove the screen sender from the peer connection
    const pc = pcRef.current;
    if (pc && screenSenderRef.current) {
      try {
        pc.removeTrack(screenSenderRef.current);
      } catch (e) {
        console.warn("Error removing screen sender:", e);
      }
      screenSenderRef.current = null;
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

    await renegotiate();
  }, [broadcastSignaling, currentUserId, micActive, videoActive, renegotiate]);

  const stopScreenSharingRef = useRef(stopScreenSharing);
  useEffect(() => {
    stopScreenSharingRef.current = stopScreenSharing;
  }, [stopScreenSharing]);

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

        // ADD screen track as a SECOND sender (camera stays untouched)
        const pc = pcRef.current;
        if (pc) {
          const sender = pc.addTrack(screenTrack, screenStream);
          screenSenderRef.current = sender;
        }

        // Preview locally: show screen in main local view
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

        // Trigger renegotiation for screen sharing track
        await renegotiate();

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
  }, [screenSharing, broadcastSignaling, currentUserId, micActive, videoActive, renegotiate]);

  // Start Cinema Movie Streaming: broadcast local video element stream to partner
  const startMovieStream = useCallback(
    async (stream: MediaStream, title: string) => {
      const pc = createPeerConnection();
      if (!pc) return;

      // Clean up previous movie senders if any
      movieSendersRef.current.forEach((sender) => {
        try {
          pc.removeTrack(sender);
        } catch {}
      });
      movieSendersRef.current = [];

      movieStreamRef.current = stream;

      // Add all tracks (video + audio) from the captured movie
      stream.getTracks().forEach((track) => {
        try {
          const sender = pc.addTrack(track, stream);
          movieSendersRef.current.push(sender);
        } catch (e) {
          console.warn("Error adding movie track:", e);
        }
      });

      setIsMovieStreaming(true);

      // Notify partner of movie stream
      broadcastSignaling({
        type: "movie_stream_state",
        senderId: currentUserId,
        movieState: {
          active: true,
          title,
          streamId: stream.id,
        },
      });

      // Renegotiate immediately so partner receives the stream
      await renegotiate();
    },
    [createPeerConnection, broadcastSignaling, currentUserId, renegotiate]
  );

  // Stop Cinema Movie Streaming
  const stopMovieStream = useCallback(async () => {
    const pc = pcRef.current;
    if (pc) {
      movieSendersRef.current.forEach((sender) => {
        try {
          pc.removeTrack(sender);
        } catch {}
      });
      movieSendersRef.current = [];
    }

    if (movieStreamRef.current) {
      movieStreamRef.current.getTracks().forEach((t) => t.stop());
      movieStreamRef.current = null;
    }

    setIsMovieStreaming(false);

    broadcastSignaling({
      type: "movie_stream_state",
      senderId: currentUserId,
      movieState: {
        active: false,
        title: "",
        streamId: "",
      },
    });

    await renegotiate();
  }, [broadcastSignaling, currentUserId, renegotiate]);

  return {
    localVideoRef,
    remoteVideoRef,
    localDisplayStream,
    remoteDisplayStream,
    remoteScreenStream,
    remoteMovieStream,
    remoteMovieTitle,
    isMovieStreaming,
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
    startMovieStream,
    stopMovieStream,
    startCall,
  };
}
