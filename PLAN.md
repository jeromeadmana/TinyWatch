# TinyWatch - Baby Monitor App Implementation Plan

## Context

Build a cross-platform baby monitor mobile app called **TinyWatch** using React Native (Expo). One phone acts as a camera (Sender), streaming live video+audio over the local WiFi network to another phone (Receiver/Viewer). The app works without internet — just two phones on the same WiFi. BLE is used for device discovery, WebRTC for P2P video streaming.

**Project location:** `C:\sources\TinyWatch`

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Expo + Dev Client** | React Native with native module support, no Xcode/Android Studio needed |
| **TypeScript** | Type safety |
| **react-native-webrtc** | P2P video/audio streaming via WebRTC |
| **react-native-tcp-socket** | Local TCP signaling (replaces cloud WebSocket server) |
| **react-native-zeroconf** | mDNS/Zeroconf auto-discovery (exchange IP:port on LAN) |
| **Zustand** | Lightweight state management |
| **React Navigation** | Screen navigation |
| **expo-keep-awake** | Prevent screen sleep during monitoring |

---

## Architecture

```
 SENDER (Camera Phone)                     RECEIVER (Viewer Phone)
 ======================                    ========================
 1. Start TCP server on port 9090          1. Browse for mDNS services
 2. Publish mDNS service with IP:port      2. Discover Sender's IP:port via mDNS
         |                                          |
         |<---- TCP signaling connection ------>|
         |                                          |
 3. Capture camera + mic (getUserMedia)    3. Receive WebRTC offer via TCP
 4. Create WebRTC offer                    4. Create WebRTC answer
 5. Exchange SDP + ICE via TCP             5. Exchange SDP + ICE via TCP
         |                                          |
         |<==== WebRTC P2P video+audio ========>|
         |      (direct LAN, no internet)           |
```

**Key design decisions:**
- **No cloud server needed** — TCP signaling runs locally on the Sender device
- **No STUN/TURN servers** — both devices on same subnet, host ICE candidates suffice (`iceServers: []`)
- **mDNS for discovery only** — used to exchange Sender's IP:port on the local network
- **Manual IP fallback** — if mDNS fails, user can type the Sender's displayed IP address

---

## Project Structure

```
C:\sources\TinyWatch\
|-- app.config.ts                    # Expo config with plugins + permissions
|-- package.json
|-- tsconfig.json
|
|-- src/
|   |-- App.tsx                      # Root: navigation setup
|   |
|   |-- screens/
|   |   |-- RoleSelectionScreen.tsx   # Choose "Camera" or "Viewer"
|   |   |-- SenderScreen.tsx         # Camera preview + connection status
|   |   |-- ReceiverScreen.tsx       # Remote video display + controls
|   |
|   |-- services/
|   |   |-- signaling.ts             # TCP server/client for SDP exchange
|   |   |-- webrtc.ts                # RTCPeerConnection lifecycle
|   |   |-- discovery.ts             # mDNS publish (sender) / browse (receiver)
|   |   |-- network.ts               # Get local IP address
|   |   |-- permissions.ts           # Camera, mic, BLE permission helpers
|   |
|   |-- store/
|   |   |-- useAppStore.ts           # Zustand store
|   |
|   |-- components/
|   |   |-- VideoView.tsx            # RTCView wrapper
|   |   |-- ConnectionStatus.tsx     # Status indicator
|   |   |-- PermissionGate.tsx       # Permission check wrapper
|   |   |-- ErrorBanner.tsx          # Error display with retry
|   |
|   |-- hooks/
|   |   |-- useWebRTC.ts             # WebRTC lifecycle hook
|   |   |-- useDiscovery.ts          # mDNS publish/browse hooks
|   |   |-- useSignaling.ts          # TCP signaling hook
|   |   |-- usePermissions.ts        # Permission request hook
|   |
|   |-- types/
|   |   |-- signaling.ts             # Message type definitions
|   |   |-- navigation.ts            # Navigation param types
|   |
|   |-- constants/
|       |-- network.ts               # Default port, timeouts, mDNS service config
|       |-- webrtc.ts                # RTCPeerConnection config
```

---

## Implementation Phases

### Phase 1: Project Scaffolding + Navigation
- Create Expo project with TypeScript: `npx create-expo-app TinyWatch --template blank-typescript`
- Install deps: `expo-dev-client`, `@react-navigation/native`, `@react-navigation/native-stack`, `zustand`
- Create 3 screens: `RoleSelectionScreen`, `SenderScreen`, `ReceiverScreen`
- Set up stack navigation: role selection -> camera/viewer screen
- Set up Zustand store with role and connection state
- Run `npx expo prebuild` and verify build on Android device/emulator

### Phase 2: Camera + Local Preview
- Install `react-native-webrtc` + `@config-plugins/react-native-webrtc`
- Rebuild native projects: `npx expo prebuild --clean`
- On SenderScreen: call `mediaDevices.getUserMedia({ video: true, audio: true })`
- Render local camera via `<RTCView streamURL={localStream.toURL()} />`
- Handle camera/mic permissions with user-friendly messages
- Install + activate `expo-keep-awake` on both screens

### Phase 3: TCP Signaling Channel
- Install `react-native-tcp-socket`
- Build `signaling.ts` service:
  - Sender: start TCP server on port 9090
  - Receiver: connect to TCP server at given IP:port
  - Exchange newline-delimited JSON messages
- Message protocol: `{ type: 'offer'|'answer'|'ice-candidate'|'bye', ... }`
- Test with hardcoded IP: two phones exchanging messages over TCP

### Phase 4: WebRTC P2P Streaming (Core Feature)
- Build `webrtc.ts` service:
  - Create `RTCPeerConnection` with `iceServers: []` (LAN only)
  - Sender: add camera tracks, create offer, gather ICE, send via TCP
  - Receiver: receive offer, create answer, send via TCP
  - Handle `ontrack` event to get remote stream
- On ReceiverScreen: render remote video via `<RTCView>`
- Handle disconnection/reconnection
- Test end-to-end: Sender streams camera, Receiver views it (hardcoded IP)

### Phase 5: mDNS/Zeroconf Auto-Discovery
> **Note:** Originally planned as BLE, but `react-native-ble-plx` cannot act as a BLE peripheral (GATT server). mDNS/Zeroconf is the standard protocol for local network service discovery and a better fit since both devices are already on the same WiFi.

- Install `react-native-zeroconf` + `expo-build-properties`
- Rebuild native projects
- Build `discovery.ts` service:
  - Sender: publish `_tinywatch._tcp` mDNS service with IP:port when TCP server starts
  - Receiver: browse for `_tinywatch._tcp` services, display discovered senders
- Update `app.config.ts`: iOS `NSBonjourServices`, Android multicast permissions
- Update `SenderScreen`: publish mDNS service, show "Discoverable" indicator
- Update `ReceiverScreen`: show discovered devices list with tap-to-connect, keep manual IP entry as fallback

### Phase 6: Polish + Background Mode
- Android: foreground service via `react-native-background-actions` with persistent notification
- iOS (when building via EAS): `UIBackgroundModes: ["audio", "voip"]` in app.config.ts
- UI polish: connection status indicators, error messages, disconnect button
- Reconnection logic if WebRTC connection drops
- Volume controls on Receiver

---

## Platform Notes (Windows Development)

- **Daily development**: Test on Android device/emulator from Windows
- **iOS builds**: Use Expo EAS Build (cloud service) when ready — builds iOS from any OS
- **No Xcode/Android Studio needed** for routine development — `npx expo run:android` handles everything
- Requires a physical Android device or Android emulator (can set up via Android Studio SDK tools without using the IDE)

---

## Key Dependencies (app.config.ts)

```typescript
plugins: [
  "@config-plugins/react-native-webrtc",
  ["expo-build-properties", { android: { usesCleartextTraffic: true } }]
],
android: {
  permissions: ["CAMERA", "RECORD_AUDIO", "ACCESS_WIFI_STATE", "CHANGE_WIFI_MULTICAST_STATE"]
},
ios: {
  infoPlist: {
    NSCameraUsageDescription: "Camera is used to monitor your baby",
    NSMicrophoneUsageDescription: "Microphone captures audio from the baby's room",
    NSBonjourServices: ["_tinywatch._tcp"],
    UIBackgroundModes: ["audio", "voip"]
  }
}
```

---

## Potential Challenges

| Challenge | Risk | Mitigation |
|---|---|---|
| iOS background streaming | Medium | `UIBackgroundModes: audio/voip` keeps app alive while audio is active |
| mDNS discovery differences (iOS vs Android) | Low | Standard protocol, well-supported on both; manual IP fallback |
| AP isolation on some WiFi networks | Low | Document as known limitation; devices must be on same subnet |
| TCP message framing | Low | Use newline-delimited JSON with proper buffering |

---

## Future Enhancements (Post-MVP)
- Cry/noise detection alerts
- Two-way audio (talk-back button)
- Night vision / low-light camera filter
- Motion detection
- Multiple simultaneous viewers
- Local recording
- Battery status sharing between devices

---

## Verification / Testing Plan
1. **Phase 1**: App launches, navigation between screens works
2. **Phase 2**: Camera preview shows on Sender screen
3. **Phase 3**: Two devices exchange test messages via TCP (hardcoded IP)
4. **Phase 4**: Receiver sees Sender's camera feed with audio — **core MVP test**
5. **Phase 5**: Devices discover each other via mDNS without manual IP entry
6. **Phase 6**: Stream continues when Sender app is backgrounded
