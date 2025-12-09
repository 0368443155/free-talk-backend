# V2 CORE ISSUES FIX PLAN

> **Priority:** HIGH  
> **Timeline:** 2-3 days  
> **Goal:** Fix core stability issues in V2

---

## 🔥 CRITICAL ISSUES TO FIX NOW

### Issue 1: No Connection State Tracking ⚠️
**Problem:** Users don't know if peers are connected/disconnected  
**Impact:** Confusion when video doesn't show  
**Priority:** HIGH

**Fix:**
```typescript
// File: services/p2p/core/p2p-peer-connection-manager.ts

// Add property
private connectionStates = new Map<string, RTCPeerConnectionState>();

// Update in createPeerConnection
pc.onconnectionstatechange = () => {
  const state = pc.connectionState;
  this.connectionStates.set(targetUserId, state);
  this.emit('connection-state-changed', { userId: targetUserId, state });
  
  console.log(`🔌 Connection to ${targetUserId}: ${state}`);
  
  // Handle failed connections
  if (state === 'failed') {
    this.handleConnectionFailed(targetUserId);
  }
};

// Add getter
public getConnectionState(userId: string): RTCPeerConnectionState {
  return this.connectionStates.get(userId) || 'new';
}

public getAllConnectionStates(): Map<string, RTCPeerConnectionState> {
  return new Map(this.connectionStates);
}
```

**Expose in hook:**
```typescript
// File: hooks/use-webrtc-v2.ts

const connectionStates = useSyncExternalStore(
  (callback) => {
    if (!peerConnectionManagerRef.current) return () => {};
    
    const handleChange = () => callback();
    peerConnectionManagerRef.current.on('connection-state-changed', handleChange);
    
    return () => {
      peerConnectionManagerRef.current?.off('connection-state-changed', handleChange);
    };
  },
  () => {
    if (!peerConnectionManagerRef.current) return new Map();
    return peerConnectionManagerRef.current.getAllConnectionStates();
  },
  () => new Map()
);

// Add to return
return {
  // ... existing
  connectionStates, // NEW
};
```

---

### Issue 2: No Auto-Reconnection ⚠️
**Problem:** When connection fails, it stays failed  
**Impact:** Users have to refresh page  
**Priority:** HIGH

**Fix:**
```typescript
// File: services/p2p/core/p2p-peer-connection-manager.ts

private reconnectAttempts = new Map<string, number>();
private readonly MAX_RECONNECT_ATTEMPTS = 3;
private readonly RECONNECT_DELAY = 2000; // 2 seconds

private async handleConnectionFailed(userId: string) {
  const attempts = this.reconnectAttempts.get(userId) || 0;
  
  if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
    this.log('error', `Max reconnect attempts reached for ${userId}`);
    this.emit('reconnect-failed', { userId });
    return;
  }
  
  this.log('warn', `Connection to ${userId} failed, attempting reconnect (${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);
  this.reconnectAttempts.set(userId, attempts + 1);
  
  // Close old connection
  this.closePeerConnection(userId);
  
  // Wait before reconnecting
  await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));
  
  // Create new connection
  await this.createPeerConnection(userId);
  
  // Re-add local tracks
  const localStream = this.mediaManager?.getLocalStream();
  if (localStream) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
  }
  
  // Create new offer
  await this.createOffer(userId);
  
  this.emit('reconnecting', { userId, attempt: attempts + 1 });
}

// Reset attempts on successful connection
private handleConnectionConnected(userId: string) {
  this.reconnectAttempts.delete(userId);
  this.emit('reconnected', { userId });
}
```

---

### Issue 3: Media State Not Synced on Reconnect ⚠️
**Problem:** After reconnect, mic/camera state may be wrong  
**Impact:** User thinks they're muted but they're not (or vice versa)  
**Priority:** HIGH

**Fix:**
```typescript
// File: services/p2p/core/p2p-media-manager.ts

public async syncStateToServer(): Promise<void> {
  if (!this.socket || !this.socket.connected) return;
  
  const state = this.getState();
  
  // Sync all media states
  await Promise.all([
    this.syncMicToDatabase(state.mic.isMuted),
    this.syncCameraToDatabase(state.camera.isVideoOff),
  ]);
  
  // Sync screen share state
  if (this.socket) {
    this.socket.emit('media:screen-share', {
      isSharing: state.screen.isSharing
    });
  }
}
```

**Call on reconnect:**
```typescript
// File: hooks/use-webrtc-v2.ts

// In socket reconnect handler
useEffect(() => {
  if (!socket) return;
  
  const handleReconnect = async () => {
    console.log('🔄 Socket reconnected, syncing media state...');
    
    if (mediaManagerRef.current) {
      await mediaManagerRef.current.syncStateToServer();
    }
    
    // Re-establish peer connections
    if (peerConnectionManagerRef.current) {
      // Request peers again
      socket.emit('meeting:request-peers');
    }
  };
  
  socket.on('connect', handleReconnect);
  
  return () => {
    socket.off('connect', handleReconnect);
  };
}, [socket]);
```

---

### Issue 4: No Visual Feedback for Connection Issues ⚠️
**Problem:** Users don't see when connection is poor/failed  
**Impact:** Bad UX, users confused  
**Priority:** MEDIUM

**Fix:**
```typescript
// File: section/meetings/video-grid.tsx

// Add connection state badge to each video tile
<div className="absolute top-2 right-2">
  {connectionState === 'connecting' && (
    <Badge variant="secondary" className="text-xs">
      Connecting...
    </Badge>
  )}
  {connectionState === 'failed' && (
    <Badge variant="destructive" className="text-xs">
      Connection Failed
    </Badge>
  )}
  {connectionState === 'disconnected' && (
    <Badge variant="secondary" className="text-xs">
      Reconnecting...
    </Badge>
  )}
</div>
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Day 1: Connection State Tracking
- [ ] Add `connectionStates` Map to P2PPeerConnectionManager
- [ ] Add `onconnectionstatechange` handler
- [ ] Add getters for connection states
- [ ] Expose via useSyncExternalStore in hook
- [ ] Test with multiple peers
- [ ] Add UI badges for connection states

### Day 2: Auto-Reconnection
- [ ] Add `handleConnectionFailed` method
- [ ] Add reconnect attempt tracking
- [ ] Add exponential backoff
- [ ] Add max attempts limit
- [ ] Test network interruption scenarios
- [ ] Add reconnecting UI feedback

### Day 3: State Sync & Polish
- [ ] Add `syncStateToServer` method
- [ ] Call on socket reconnect
- [ ] Test mic/camera state after reconnect
- [ ] Test screen share state after reconnect
- [ ] Add error recovery UI
- [ ] Final testing

---

## 🧪 TESTING PLAN

### Test 1: Connection State
1. Start meeting with 2 users
2. Check connection state shows "connected"
3. Disconnect one user's network
4. Check state shows "disconnected"
5. Reconnect network
6. Check state shows "connected" again

### Test 2: Auto-Reconnection
1. Start meeting with 2 users
2. Disable network for 5 seconds
3. Check "Reconnecting..." message appears
4. Enable network
5. Check connection re-establishes automatically
6. Verify video/audio works after reconnect

### Test 3: State Sync
1. Start meeting, mute mic
2. Disconnect and reconnect
3. Verify mic is still muted
4. Turn off camera
5. Disconnect and reconnect
6. Verify camera is still off

### Test 4: Screen Share After Reconnect
1. Start screen share
2. Disconnect network
3. Reconnect
4. Verify screen share still works
5. Verify camera still visible

---

## 🎯 SUCCESS CRITERIA

- ✅ Connection state visible for all peers
- ✅ Auto-reconnects on network failure (max 3 attempts)
- ✅ Media state preserved after reconnect
- ✅ UI shows reconnecting status
- ✅ No manual refresh needed
- ✅ Works with 5+ concurrent users

---

## 📊 ESTIMATED IMPACT

**Before:**
- Users confused when video doesn't show
- Manual refresh required on network issues
- Media state inconsistent after reconnect
- Poor UX during network problems

**After:**
- Clear visual feedback on connection state
- Automatic recovery from network issues
- Consistent media state
- Professional UX like Zoom/Meet

---

**Next Step:** Implement Day 1 tasks (Connection State Tracking)
