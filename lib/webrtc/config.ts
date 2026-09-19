/**
 * WebRTC ICE Servers Configuration (STUN + Managed TURN Fallback)
 */
export function getIceServers(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    // 1. Google STUN servers (fast direct P2P for standard home WiFi)
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:openrelay.metered.ca:80",
      ],
    },
    // 2. OpenRelay TURN Relays (Required for 4G/5G Carrier-Grade NAT & Mobile Networks)
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  // Optional custom managed TURN fallback relay (Metered.ca, Cloudflare, etc.)
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
