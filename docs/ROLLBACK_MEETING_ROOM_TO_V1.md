# 🔄 ROLLBACK MEETING ROOM TO V1 (LiveKit)

> **Objective:** Revert meeting room to use stable LiveKit implementation  
> **Reason:** V2 P2P will be used exclusively for 1-on-1 bookings  
> **Estimated Time:** 30 minutes

---

## 📋 ROLLBACK CHECKLIST

### Step 1: Revert Meeting Room Import

**File:** `talkplatform-frontend/section/meetings/meeting-room.tsx`

**Change line 24 from:**
```typescript
import { useWebRTCV2 as useWebRTC } from "@/hooks/use-webrtc-v2";
```

**To:**
```typescript
import { useWebRTC } from "@/hooks/use-webrtc";
```

**Status:** ✅ Simple import change

---

### Step 2: Verify Hook Call (No Changes Needed)

**File:** `talkplatform-frontend/section/meetings/meeting-room.tsx` (line 353)

**Current code is compatible:**
```typescript
const {
  localStream,
  screenStream,
  peers,
  connectionStates,
  connectedPeersCount,
  reconnectingPeers,
  remoteScreenShares,
  isMuted,
  isVideoOff,
  isScreenSharing,
  startLocalStream,
  stopLocalStream,
  toggleMute,
  toggleVideo,
  toggleScreenShare,
  getFirstPeerConnection,
} = useWebRTC({
  socket,
  meetingId: meeting.id,
  userId: user.id,
  isOnline,
});
```

**Status:** ✅ No changes needed - V1 hook has same interface

---

### Step 3: Verify VideoGrid Props (No Changes Needed)

**File:** `talkplatform-frontend/section/meetings/meeting-room.tsx`

**VideoGrid usage:**
```typescript
<VideoGrid
  localStream={localStream}
  screenStream={screenStream}
  peers={peers}
  connectionStates={connectionStates}
  remoteScreenShares={remoteScreenShares}
  participants={participants}
  currentUserId={user.id}
  isMuted={isMuted}
  isVideoOff={isVideoOff}
  spotlightUserId={spotlightUserId}
  isScreenSharing={isScreenSharing}
/>
```

**Status:** ✅ Compatible with V1

---

### Step 4: Test Meeting Room

**Test Checklist:**
- [ ] Join meeting with 2+ users
- [ ] Video/audio works
- [ ] Screen share works
- [ ] Mute/unmute works
- [ ] Camera on/off works
- [ ] Chat works
- [ ] YouTube sync works
- [ ] No console errors

---

## 🎯 EXPECTED RESULTS

### Console Logs (V1):
```
🎥 Starting local stream...
✅ Local stream started
📡 Joining LiveKit room...
✅ Connected to LiveKit room
🔊 Audio track published
📹 Video track published
```

### Should NOT See:
```
❌ "Managers initialized and ready"
❌ "P2PMediaManager"
❌ "P2PPeerConnectionManager"
❌ "webrtc:ready"
```

---

## 🔧 ROLLBACK COMMANDS

```bash
# 1. Edit meeting-room.tsx
# Change import from use-webrtc-v2 to use-webrtc

# 2. Restart dev server
cd talkplatform-frontend
npm run dev

# 3. Clear browser cache
# Ctrl+Shift+R

# 4. Test meeting room
```

---

## ✅ VERIFICATION

After rollback:

1. **Open meeting room**
2. **Check console** - Should see LiveKit logs
3. **Join with 2 users** - Should connect immediately
4. **Test all features** - Video, audio, screen share, chat
5. **No "Connecting..." stuck state**

---

## 📊 COMPARISON

| Feature | V1 (LiveKit) | V2 (P2P) |
|---------|--------------|----------|
| Group calls (3+ people) | ✅ Excellent | ❌ Poor |
| 1-on-1 calls | ✅ Good | ✅ Excellent |
| Stability | ✅ Very stable | ⚠️ Needs work |
| Latency | ✅ Low | ✅ Very low |
| Setup complexity | ✅ Simple | ❌ Complex |
| Maintenance | ✅ Easy | ❌ Hard |

---

## 🎯 FINAL STATE

After rollback:

```
Meeting Room → useWebRTC (V1 - LiveKit) ✅
Bookings → useWebRTCV2 (V2 - P2P) 🚧 (Next phase)
```

---

**Estimated Time:** 5 minutes to change import + 10 minutes testing = **15 minutes total**

**Risk:** Very low - just reverting to known working state

**Rollback if issues:** Change import back to V2 (but we won't need to)
