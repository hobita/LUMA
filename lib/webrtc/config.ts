/**
 * WebRTC ICE Servers Configuration (STUN + Managed TURN Fallback)
 */
export function getIceServers(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    // Free Google STUN servers (handles 80-85% of standard NAT traversal)
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ];

  // Optional managed TURN fallback relay (Metered.ca, OpenRelay, Cloudflare, etc.)
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUrl.trim()) {
    const turnServer: RTCIceServer = {
      urls: turnUrl,
    };
    if (turnUsername) turnServer.username = turnUsername;
    if (turnCredential) turnServer.credential = turnCredential;
    iceServers.push(turnServer);
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
}
