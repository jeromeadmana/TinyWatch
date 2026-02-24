/**
 * WebRTC configuration for LAN-only P2P connections.
 * No STUN/TURN servers needed — both devices are on the same subnet.
 */
export const RTC_CONFIG = {
  iceServers: [] as { urls: string }[],
};
