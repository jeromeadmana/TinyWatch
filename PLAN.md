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
| **react-native-ble-plx** | BLE device discovery (exchange IP:port between devices) |
| **Zustand** | Lightweight state management |
| **React Navigation** | Screen navigation |
| **expo-keep-awake** | Prevent screen sleep during monitoring |

---

## Architecture

```
 SENDER (Camera Phone)                     RECEIVER (Viewer Phone)
 ======================                    ========================
 1. Start TCP server on port 9090          1. Scan for BLE advertisements
 2. Advertise IP:port via BLE              2. Read Sender's IP:port from BLE
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
- **BLE for discovery only** — bandwidth too low for video; used to exchange Sender's IP:port
- **Manual IP fallback** — if BLE fails, user can type the Sender's displayed IP address

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
|   |   |-- ble-discovery.ts         # BLE advertise (sender) / scan (receiver)
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
|   |   |-- useBLEDiscovery.ts       # BLE scan/advertise hook
|   |   |-- useSignaling.ts          # TCP signaling hook
|   |   |-- usePermissions.ts        # Permission request hook
|   |
|   |-- types/
|   |   |-- signaling.ts             # Message type definitions
|   |   |-- navigation.ts            # Navigation param types
|   |
|   |-- constants/
|       |-- ble.ts                   # BLE UUIDs
|       |-- network.ts               # Default port, timeouts
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

### Phase 5: BLE Device Discovery
- Install `react-native-ble-plx` + `@config-plugins/react-native-ble-plx`
- Rebuild native projects
- Build `ble-discovery.ts` service:
  - Sender: advertise custom BLE service with IP:port as characteristic
  - Receiver: scan for service UUID, read IP:port, stop BLE
- Get local IP via `react-native-network-info` or TCP server address
- Wire together: BLE discovery -> TCP signaling -> WebRTC streaming
- Add manual IP entry as fallback if BLE fails

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
  ["react-native-ble-plx", { isBackgroundEnabled: true, neverForLocation: true }]
],
android: {
  permissions: ["CAMERA", "RECORD_AUDIO", "BLUETOOTH_SCAN", "BLUETOOTH_ADVERTISE", "BLUETOOTH_CONNECT"]
},
ios: {
  infoPlist: {
    NSCameraUsageDescription: "Camera is used to monitor your baby",
    NSMicrophoneUsageDescription: "Microphone captures audio from the baby's room",
    UIBackgroundModes: ["audio", "voip"]
  }
}
```

---

## Potential Challenges

| Challenge | Risk | Mitigation |
|---|---|---|
| iOS background streaming | Medium | `UIBackgroundModes: audio/voip` keeps app alive while audio is active |
| BLE discovery differences (iOS vs Android) | Medium | Use GATT characteristic read (works on both); manual IP fallback |
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
5. **Phase 5**: Devices discover each other via BLE without manual IP entry
6. **Phase 6**: Stream continues when Sender app is backgrounded
