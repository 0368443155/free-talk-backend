# USE-WEBRTC-V2 IMPLEMENTATION GUIDE

> **Based on:** use-webrtc.ts (v1) logic + Phase0 docs  
> **Goal:** Fix use-webrtc-v2 to work properly  
> **Status:** Step-by-step guide

---

## 🎯 3 FIXES CẦN THIẾT

### Fix 1: Remove isOnline Dependency (Chicken-Egg Problem)

**File:** `hooks/use-webrtc-v2.ts`

**Line 104-110:** Change from:
```typescript
useEffect(() => {
  if (!socket || !isOnline) {  // ❌ BAD: isOnline causes chicken-egg
    if (mediaManagerRef.current) {
      cleanupManagers();
    }
    return;
  }
```

**To:**
```typescript
useEffect(() => {
  if (!socket) {  // ✅ GOOD: Only check socket
    if (mediaManagerRef.current) {
      cleanupManagers();
    }
    return;
  }
```

**Line 209:** Change dependency array from:
```typescript
}, [socket, meetingId, userId, isOnline, cleanupManagers]);  // ❌ BAD
```

**To:**
```typescript
}, [socket, meetingId, userId, cleanupManagers]);  // ✅ GOOD
```

---

### Fix 2: Add Auto-Start Effect

**File:** `hooks/use-webrtc-v2.ts`

**After line 384** (after `startLocalStream` function), add:

```typescript
// 🔥 FIX: AUTO-START local stream when socket connects
useEffect(() => {
  if (socket?.connected && !localStream && mediaManagerRef.current) {
    console.log('🎥 [useWebRTCV2] Auto-starting local stream...');
    startLocalStream()
      .then(() => {
        console.log('✅ [useWebRTCV2] Stream started');
      })
      .catch((error: any) => {
        console.error('❌ [useWebRTCV2] Failed:', error);
        toast.error(
          error?.message?.includes('permission')
            ? error.message
            : "Failed to access camera/microphone",
          { duration: 5000 }
        );
      });
  }
}, [socket?.connected, localStream, startLocalStream]);
```

**Also update `startLocalStream`** to emit `media:ready`:

**Line 368-384:** Change from:
```typescript
const startLocalStream = useCallback(async () => {
  if (!mediaManagerRef.current || !socket) return;

  try {
    await mediaManagerRef.current.initializeLocalStream(true, true);
    mediaManagerRef.current.emit('stream-changed');
    
    // Emit media:ready to notify other peers
    if (socket.connected) {
      socket.emit('media:ready', { roomId: meetingId });  // ❌ Missing userId
    }
  } catch (error: any) {
    toast.error(`Failed to start local stream: ${error.message}`);
  }
}, [socket, meetingId]);
```

**To:**
```typescript
const startLocalStream = useCallback(async () => {
  if (!mediaManagerRef.current || !socket) return;

  try {
    console.log('📹 [useWebRTCV2] Starting local stream...');
    await mediaManagerRef.current.initializeLocalStream(true, true);
    mediaManagerRef.current.emit('stream-changed');
    
    // 🔥 FIX: Emit media:ready with userId (like v1)
    if (socket.connected) {
      socket.emit('media:ready', { roomId: meetingId, userId });
      console.log('✅ [useWebRTCV2] Emitted media:ready');
    }
  } catch (error: any) {
    console.error('❌ [useWebRTCV2] Failed:', error);
    toast.error(`Failed to start local stream: ${error.message}`);
  }
}, [socket, meetingId, userId]);  // ✅ Add userId dependency
```

---

### Fix 3: Add WebRTC Signaling Handlers

**File:** `hooks/use-webrtc-v2.ts`

**Line 470-590:** Change from:
```typescript
useEffect(() => {
  if (!socket || !isOnline || !peerConnectionManagerRef.current) return;  // ❌ BAD
  
  // ... handlePeerReady, handleUserLeft ...
  
  socket.on('media:ready', handlePeerReady);
  socket.on('meeting:user-left', handleUserLeft);
  
  socket.emit('meeting:request-peers');
  
  return () => {
    socket.off('media:ready', handlePeerReady);
    socket.off('meeting:user-left', handleUserLeft);
  };
}, [socket, userId, isOnline]);  // ❌ BAD
```

**To:**
```typescript
useEffect(() => {
  if (!socket?.connected || !peerConnectionManagerRef.current) return;  // ✅ GOOD
  
  // ... handlePeerReady, handleUserLeft (keep same) ...
  
  // 🔥 FIX: Add WebRTC signaling handlers (CRITICAL!)
  const handleOffer = async (data: { fromUserId: string; roomId: string; offer: RTCSessionDescriptionInit }) => {
    if (!peerConnectionManagerRef.current) return;
    console.log(`📨 [useWebRTCV2] Received offer from ${data.fromUserId}`);
    try {
      await peerConnectionManagerRef.current.handleRemoteOffer(data.fromUserId, data.offer);
      console.log(`✅ [useWebRTCV2] Processed offer`);
    } catch (error: any) {
      console.error(`❌ [useWebRTCV2] Failed to handle offer:`, error);
    }
  };

  const handleAnswer = async (data: { fromUserId: string; roomId: string; answer: RTCSessionDescriptionInit }) => {
    if (!peerConnectionManagerRef.current) return;
    console.log(`📨 [useWebRTCV2] Received answer from ${data.fromUserId}`);
    try {
      await peerConnectionManagerRef.current.handleRemoteAnswer(data.fromUserId, data.answer);
      console.log(`✅ [useWebRTCV2] Processed answer`);
    } catch (error: any) {
      console.error(`❌ [useWebRTCV2] Failed to handle answer:`, error);
    }
  };

  const handleIceCandidate = async (data: { fromUserId: string; roomId: string; candidate: RTCIceCandidateInit }) => {
    if (!peerConnectionManagerRef.current) return;
    try {
      await peerConnectionManagerRef.current.handleRemoteIceCandidate(data.fromUserId, data.candidate);
    } catch (error: any) {
      console.error(`❌ [useWebRTCV2] Failed to add ICE candidate:`, error);
    }
  };
  
  // Register all handlers
  socket.on('media:ready', handlePeerReady);
  socket.on('meeting:user-left', handleUserLeft);
  socket.on('media:offer', handleOffer);  // ✅ NEW
  socket.on('media:answer', handleAnswer);  // ✅ NEW
  socket.on('media:ice-candidate', handleIceCandidate);  // ✅ NEW
  
  socket.emit('meeting:request-peers');
  
  return () => {
    socket.off('media:ready', handlePeerReady);
    socket.off('meeting:user-left', handleUserLeft);
    socket.off('media:offer', handleOffer);  // ✅ NEW
    socket.off('media:answer', handleAnswer);  // ✅ NEW
    socket.off('media:ice-candidate', handleIceCandidate);  // ✅ NEW
  };
}, [socket, userId]);  // ✅ GOOD: Removed isOnline
```

---

## 📝 SUMMARY OF CHANGES

### 1. Remove `isOnline` Dependency
- **Why:** Creates chicken-egg problem (need stream to be online, need to be online to start stream)
- **Where:** Lines 104, 209, 470, 590
- **Change:** Use `socket.connected` instead

### 2. Add Auto-Start Effect
- **Why:** Stream must start automatically when socket connects
- **Where:** After line 384
- **Change:** Add useEffect with `socket?.connected` dependency

### 3. Add Signaling Handlers
- **Why:** Peers can't connect without offer/answer/ICE handlers
- **Where:** Lines 470-590
- **Change:** Add 3 handlers: `handleOffer`, `handleAnswer`, `handleIceCandidate`

---

## 🧪 TESTING AFTER FIXES

### Expected Console Logs:

```
🎥 [useWebRTCV2] Auto-starting local stream...
📹 [useWebRTCV2] Starting local stream...
✅ [useWebRTCV2] Stream started
✅ [useWebRTCV2] Emitted media:ready
📨 [useWebRTCV2] Received offer from <userId>
✅ [useWebRTCV2] Processed offer
📨 [useWebRTCV2] Received answer from <userId>
✅ [useWebRTCV2] Processed answer
```

### Expected Behavior:

1. ✅ Camera auto-starts when socket connects
2. ✅ Local video displays
3. ✅ Peer video displays
4. ✅ Mic/camera controls work
5. ✅ No "Connecting..." stuck

---

## 🚀 ALTERNATIVE: Use V1 Temporarily

**If fixes are too complex, revert to v1:**

```typescript
// meeting-room.tsx line 24
import { useWebRTC } from "@/hooks/use-webrtc";
```

**Then implement v2 properly later following Phase0 docs.**

---

## 📚 REFERENCES

- `hooks/use-webrtc.ts` (v1) - Working implementation
- `docs/Phase0_ImproveMeetingRoom/` - Detailed implementation guide
- `docs/Phase0_ImproveMeetingRoom/DEVIL_DETAILS_CHECKLIST.md` - Critical issues

---

**Recommendation:** 
1. Apply these 3 fixes manually (copy-paste code above)
2. Test thoroughly
3. If still issues, use v1 temporarily
4. Follow Phase0 docs for proper long-term implementation

**Status:** Ready to implement
