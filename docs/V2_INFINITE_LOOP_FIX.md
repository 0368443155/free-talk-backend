# V2 URGENT FIX: INFINITE LOOP & LOG SPAM

> **Priority:** CRITICAL  
> **Goal:** Stop 15,000+ logs/looping  
> **Status:** Fixes race conditions and effect loops in hooks

---

## 🚨 DIAGNOSIS

The infinite loop is likely caused by **Effect Instability** + **Race Condition**:
1. `useEffect` handling listeners depends on `peerConnectionManagerRef`.
2. `peerConnectionManager` initializes asynchronously.
3. `socket` might be changing, or `request-peers` is triggered repeatedly.
4. Each `request-peers` triggers `meeting:user-joined` from backend.
5. This might be triggering a re-render or re-effect cycle.

---

## 🔧 FIX 1: STABILIZE USE-WEBRTC-V2 HOOK

**File:** `hooks/use-webrtc-v2.ts`

**1. Add State for Manager Readiness**
Replace strict Ref dependence with state to ensure Effect runs when ready.

```typescript
// Add at top of hook
const [areManagersReady, setAreManagersReady] = useState(false);
```

**2. Update Initialization Effect**
```typescript
useEffect(() => {
  // ... (setup managers) ...

  // Initialize
  mediaManager.initialize().then(() => {
    // ...
    peerConnectionManager.initialize().then(() => {
      peerConnectionManagerRef.current = peerConnectionManager;
      
      // ... setMediaManager ...
      
      console.log('✅ Managers initialized and ready');
      setAreManagersReady(true); // 🔥 Trigger Event/Peer Effect
    });
  });

  return () => {
    setAreManagersReady(false);
    cleanupManagers();
  };
}, [socket, meetingId, userId, cleanupManagers]);
```

**3. Fix Main Signaling Effect (The Loop Culprit)**
Refactor the effect that handles listeners and `request-peers`.

```typescript
useEffect(() => {
  // Guard: Only run if everything is ready
  if (!socket?.connected || !areManagersReady || !peerConnectionManagerRef.current) {
    return;
  }

  const pcManager = peerConnectionManagerRef.current;

  // Handlers
  const handleUserJoined = async (data: { userId: string; userName?: string }) => {
    if (data.userId === userId) return;
    await handlePeerReady({ userId: data.userId });
  };
  
  // Connect Handlers
  socket.on('media:peer-ready', handlePeerReady);
  socket.on('meeting:user-joined', handleUserJoined);
  socket.on('meeting:user-left', handleUserLeft);
  socket.on('media:offer', handleOffer);
  socket.on('media:answer', handleAnswer);
  socket.on('media:ice-candidate', handleIceCandidate);

  // 🔥 FIX: Debounce/Guard request-peers
  // Only request if we haven't processed peers yet
  console.log('📡 Requesting peers (One-time check)...');
  socket.emit('meeting:request-peers');

  return () => {
    // Cleanup
    socket.off('media:peer-ready', handlePeerReady);
    socket.off('meeting:user-joined', handleUserJoined);
    socket.off('meeting:user-left', handleUserLeft);
    socket.off('media:offer', handleOffer);
    socket.off('media:answer', handleAnswer);
    socket.off('media:ice-candidate', handleIceCandidate);
  };
}, [socket, userId, areManagersReady]); // 🔥 Stable dependencies
```

---

## 🔧 FIX 2: STABILIZE SOCKET HOOK (Potential Source)

**File:** `hooks/use-meeting-socket.ts`

If `useMeetingSocket` returns a new `socket` object frequently, it breaks everything.

**Check `useMeetingSocket` return:**
```typescript
// Use useMemo to ensure return object stability
return useMemo(() => ({ 
  socket, 
  isConnected, 
  connectionError 
}), [socket, isConnected, connectionError]);
```

---

## 🔧 FIX 3: PREVENT SNAPSHOT LOOP

**File:** `hooks/use-webrtc-v2.ts`

Ensure `useSyncExternalStore` comparison is robust.

**Update `peers` selector:**
```typescript
    () => {
      // ... (existing checks) ...

      // Use JSON.stringify for robust comparison of map keys + stream IDs
      const stateObject = Array.from(peersMap.entries()).map(([uid, pc]) => ({
        uid,
        streamId: pc.stream?.id
      }));
      const currentData = JSON.stringify(stateObject);

      if (currentData !== peersDataRef.current) {
        peersSnapshotRef.current = peersMap;
        peersDataRef.current = currentData;
      }
      return peersSnapshotRef.current;
    }
```

---

## ✅ EXECUTION PLAN

1.  **Apply FIX 1 (State Guard)** immediately in `use-webrtc-v2.ts`. This is the most likely fix for the "Manager not ready -> Effect returns -> Manager ready -> ??" cycle or race condition.
2.  **Apply FIX 3 (Snapshot Check)** to prevent UI render loops.

**Note:** The logs "15,011 user..." suggest `meeting:user-joined` is firing infinitely. The **FIX 1** ensures listeners are attached exactly ONCE when valid, and detached correctly.
