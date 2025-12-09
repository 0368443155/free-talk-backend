# WEBRTC HOOKS COMPREHENSIVE AUDIT

> **Date:** 2025-12-09  
> **Purpose:** Rà soát toàn bộ logic V1, V2, và LiveKit để fix core issues  
> **Goal:** Update V2 to work perfectly without LiveKit

---

## 📊 HOOK COMPARISON MATRIX

| Feature | V1 (use-webrtc.ts) | V2 (use-webrtc-v2.ts) | LiveKit | Status V2 |
|---------|-------------------|----------------------|---------|-----------|
| **Architecture** | Monolithic (792 lines) | Modular + Managers (697 lines) | External SDK | ✅ Better |
| **State Management** | useState | useSyncExternalStore | LiveKit SDK | ✅ Better |
| **Auto-start Stream** | ✅ Works | ✅ Fixed | ✅ Auto | ✅ OK |
| **WebRTC Signaling** | ✅ Complete | ✅ Fixed | N/A (SFU) | ✅ OK |
| **Screen Share** | ❌ Replaces camera | ✅ Separate stream | ✅ Separate | ✅ OK |
| **Peer Management** | ✅ Manual Map | ✅ Manager class | ✅ SDK handles | ✅ OK |
| **Media Control** | ✅ Direct track | ✅ Manager methods | ✅ SDK methods | ✅ OK |
| **ICE Handling** | ✅ Manual | ✅ Manager handles | ✅ SDK handles | ✅ OK |
| **Negotiation** | ✅ Manual | ✅ Manager handles | ✅ SDK handles | ✅ OK |
| **Error Handling** | ⚠️ Basic | ✅ Comprehensive | ✅ SDK handles | ✅ Better |
| **Device Switching** | ❌ Missing | ✅ Implemented | ✅ SDK handles | ✅ Better |
| **Connection Quality** | ❌ Missing | ⚠️ Partial | ✅ Built-in | ⚠️ TODO |
| **Reconnection** | ⚠️ Manual | ⚠️ Manual | ✅ Auto | ⚠️ TODO |

---

## 🔍 CRITICAL ISSUES FOUND

### Issue 1: Missing Connection State Tracking
**V1:** No connection state tracking  
**V2:** Has `onconnectionstatechange` but not exposed  
**LiveKit:** Full connection state management  

**Fix Needed:**
```typescript
// Add to V2 return interface
connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed'
```

### Issue 2: No Reconnection Logic
**V1:** Requires manual refresh  
**V2:** Requires manual refresh  
**LiveKit:** Auto-reconnects  

**Fix Needed:**
```typescript
// Add to P2PPeerConnectionManager
private handleConnectionStateChange(pc: RTCPeerConnection, userId: string) {
  if (pc.connectionState === 'failed') {
    // Auto-reconnect logic
    this.reconnectToPeer(userId);
  }
}
```

### Issue 3: Device Switching Not Tested
**V1:** No device switching  
**V2:** Has methods but not tested  
**LiveKit:** Works perfectly  

**Fix Needed:**
- Test `switchCamera()` and `switchMicrophone()`
- Add UI controls for device selection

### Issue 4: No Bandwidth/Quality Monitoring
**V1:** No monitoring  
**V2:** Has metrics collector but not integrated  
**LiveKit:** Full stats monitoring  

**Fix Needed:**
```typescript
// Expose from V2
const { bandwidth, quality } = useWebRTCV2({...});
```

---

## 🎯 LIVEKIT PATTERNS TO ADOPT (P2P Way)

### 1. **Separate Screen Share Track** ✅ DONE
**LiveKit:**
```typescript
// Screen share is separate publication
localParticipant.publishTrack(screenTrack, { source: 'screen_share' });
```

**V2 (P2P):**
```typescript
// ✅ Already implemented
pc.addTrack(screenTrack, screenStream); // Separate from camera
```

### 2. **Track Source Identification**
**LiveKit:**
```typescript
publication.source === 'camera' | 'microphone' | 'screen_share'
```

**V2 (P2P) - TODO:**
```typescript
// Add track metadata
track.label.includes('screen') // Current approach
// Better: Add to PeerConnection metadata
{
  userId: string,
  tracks: {
    camera?: MediaStreamTrack,
    screen?: MediaStreamTrack,
    audio?: MediaStreamTrack
  }
}
```

### 3. **Automatic Media State Sync**
**LiveKit:**
```typescript
// SDK automatically syncs track mute state
track.muted = true; // Broadcasts to all
```

**V2 (P2P) - PARTIAL:**
```typescript
// ✅ Has socket sync
socket.emit('media:toggle-mic', { isMuted });
// ⚠️ But no automatic track state sync on reconnect
```

**Fix Needed:**
```typescript
// On reconnect, sync all track states
private async syncMediaState() {
  const state = this.mediaManager.getState();
  socket.emit('media:sync-state', {
    isMuted: state.mic.isMuted,
    isVideoOff: state.camera.isVideoOff,
    isScreenSharing: state.screen.isSharing
  });
}
```

### 4. **Connection Quality Indicators**
**LiveKit:**
```typescript
participant.connectionQuality // 'excellent' | 'good' | 'poor'
```

**V2 (P2P) - TODO:**
```typescript
// Use P2PMetricsCollector
const quality = useSyncExternalStore(
  (callback) => metricsCollector.on('quality-changed', callback),
  () => metricsCollector.getQuality()
);
```

### 5. **Graceful Degradation**
**LiveKit:**
```typescript
// Auto-adjusts quality based on bandwidth
room.options.adaptiveStream = true;
```

**V2 (P2P) - TODO:**
```typescript
// Implement bandwidth-based quality adjustment
if (bandwidth < threshold) {
  // Reduce video resolution
  await switchToLowerQuality();
}
```

---

## 🔧 V2 FIXES NEEDED

### Priority 1: Core Functionality ✅ DONE
- [x] Auto-start stream
- [x] WebRTC signaling handlers
- [x] Separate screen share
- [x] Basic peer management

### Priority 2: Stability (TODO)
- [ ] Connection state tracking
- [ ] Auto-reconnection on failure
- [ ] Media state sync on reconnect
- [ ] Error recovery

### Priority 3: Features (TODO)
- [ ] Device switching UI
- [ ] Bandwidth monitoring UI
- [ ] Connection quality indicators
- [ ] Graceful degradation

### Priority 4: Polish (TODO)
- [ ] Loading states
- [ ] Better error messages
- [ ] Network status indicators
- [ ] Reconnecting UI

---

## 📝 DETAILED COMPARISON

### A. Stream Initialization

**V1:**
```typescript
// Simple, direct
const stream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
});
setLocalStream(stream);
```

**V2:**
```typescript
// Managed, with retry
await mediaManager.initializeLocalStream(true, true);
// Stream stored in manager, exposed via useSyncExternalStore
```

**LiveKit:**
```typescript
// SDK handles everything
await room.localParticipant.enableCameraAndMicrophone();
```

**Winner:** V2 (best balance of control + reliability)

---

### B. Peer Connection Setup

**V1:**
```typescript
// Manual setup
const pc = new RTCPeerConnection(ICE_SERVERS);
pc.ontrack = (event) => { /* handle */ };
pc.onicecandidate = (event) => { /* handle */ };
peers.set(userId, { userId, connection: pc });
```

**V2:**
```typescript
// Manager handles setup
await peerConnectionManager.createPeerConnection(targetUserId);
// All handlers set up automatically
```

**LiveKit:**
```typescript
// SDK handles everything
// No manual peer connection management
```

**Winner:** V2 (good abstraction, still controllable)

---

### C. Screen Share

**V1:** ❌ BROKEN
```typescript
// Replaces camera track
videoSender.replaceTrack(screenTrack); // Camera disappears!
```

**V2:** ✅ CORRECT
```typescript
// Adds as separate track
pc.addTrack(screenTrack, screenStream);
mediaManager.setScreenStream(screenStream);
```

**LiveKit:** ✅ CORRECT
```typescript
// Separate publication
await room.localParticipant.publishTrack(screenTrack, {
  source: TrackSource.ScreenShare
});
```

**Winner:** V2 = LiveKit (both correct)

---

### D. Media Control

**V1:**
```typescript
// Direct track manipulation
const toggleMute = () => {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }
};
```

**V2:**
```typescript
// Manager with sync
const toggleMute = async () => {
  await mediaManager.enableMicrophone(!isMuted);
  // Manager handles:
  // - Track state
  // - UI state (via events)
  // - Database sync
  // - Socket broadcast
};
```

**LiveKit:**
```typescript
// SDK method
await room.localParticipant.setMicrophoneEnabled(!isMuted);
// SDK handles everything
```

**Winner:** V2 (comprehensive, still transparent)

---

## 🎯 RECOMMENDED V2 IMPROVEMENTS

### 1. Add Connection State Tracking
```typescript
// In P2PPeerConnectionManager
private connectionStates = new Map<string, RTCPeerConnectionState>();

public getConnectionState(userId: string): RTCPeerConnectionState {
  return this.connectionStates.get(userId) || 'new';
}

// Expose in hook
const connectionStates = useSyncExternalStore(
  (callback) => peerConnectionManager.on('connection-state-changed', callback),
  () => peerConnectionManager.getAllConnectionStates()
);
```

### 2. Add Auto-Reconnection
```typescript
// In P2PPeerConnectionManager
private async handleConnectionFailed(userId: string) {
  console.warn(`Connection to ${userId} failed, attempting reconnect...`);
  
  // Close old connection
  this.closePeerConnection(userId);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create new connection
  await this.createPeerConnection(userId);
  
  // Re-add local tracks
  const localStream = this.mediaManager.getLocalStream();
  if (localStream) {
    await this.addLocalTracks(userId, localStream);
  }
  
  // Initiate new offer
  await this.createOffer(userId);
}
```

### 3. Add Bandwidth Monitoring
```typescript
// Expose from hook
const { bandwidth, quality } = useWebRTCV2({...});

// In component
{bandwidth.inbound > 0 && (
  <div>
    ↓ {formatBandwidth(bandwidth.inbound)} 
    ↑ {formatBandwidth(bandwidth.outbound)}
    Quality: {quality}
  </div>
)}
```

### 4. Add Device Selection UI
```typescript
// Get available devices
const devices = await navigator.mediaDevices.enumerateDevices();
const cameras = devices.filter(d => d.kind === 'videoinput');
const mics = devices.filter(d => d.kind === 'audioinput');

// Switch device
await mediaManager.switchCamera(selectedCameraId);
await mediaManager.switchMicrophone(selectedMicId);
```

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Stability (Week 1)
1. Add connection state tracking
2. Implement auto-reconnection
3. Add media state sync on reconnect
4. Test with network interruptions

### Phase 2: Monitoring (Week 2)
1. Integrate P2PMetricsCollector
2. Add bandwidth monitoring UI
3. Add connection quality indicators
4. Add network status warnings

### Phase 3: Features (Week 3)
1. Add device selection UI
2. Test device switching
3. Add graceful degradation
4. Optimize for low bandwidth

### Phase 4: Polish (Week 4)
1. Add loading states
2. Improve error messages
3. Add reconnecting UI
4. Performance optimization

---

## ✅ CONCLUSION

### V2 Current State:
- ✅ **Core functionality:** Working
- ✅ **Screen share:** Fixed (separate stream)
- ✅ **Architecture:** Better than V1
- ⚠️ **Stability:** Needs reconnection logic
- ⚠️ **Monitoring:** Needs UI integration
- ⚠️ **Features:** Needs device selection

### Recommendation:
**Use V2 with Priority 1 & 2 fixes:**
1. Keep current V2 (core works)
2. Add connection state tracking (Priority 2)
3. Add auto-reconnection (Priority 2)
4. Add monitoring UI (Priority 2)
5. Polish later (Priority 3 & 4)

**Timeline:** 2-3 weeks for production-ready V2

---

**Status:** V2 is 70% complete, needs stability improvements
