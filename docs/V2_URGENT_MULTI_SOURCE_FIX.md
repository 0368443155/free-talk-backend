# V2 URGENT FIX: MULTI-SOURCE & REMOTE SCREEN SHARE

> **Priority:** CRITICAL  
> **Goal:** Support remote screen sharing (separating Camera vs Screen)  
> **Status:** Fixes missing logic in finding/displaying remote screen shares

---

## 🚨 THE PROBLEM

Current V2 handles **Local** screen share correctly (separate stream), but fails for **Remote** screen share:
1. `P2PStreamManager` overwrites `stream` when a new one arrives.
2. `use-webrtc-v2` only exposes one `stream` per peer.
3. `media:user-screen-share` event is ignored.
4. Result: Remote screen share replaces camera, or doesn't show up correctly.

---

## 🔧 FIX 1: UPDATE P2P STREAM MANAGER

**File:** `services/p2p/core/p2p-stream-manager.ts`

**Update Interface:**
```typescript
export interface RemoteStreamInfo {
  userId: string;
  // 🔥 UPDATED: Separate streams
  mainStream: MediaStream | null;   // Camera + Mic
  screenStream: MediaStream | null; // Screen Share
  createdAt: Date;
  lastUpdated: Date;
}
```

**Update `addRemoteStream`:**
```typescript
addRemoteStream(userId: string, stream: MediaStream): void {
  let info = this.remoteStreams.get(userId);
  
  // Create if not exists
  if (!info) {
    info = {
      userId,
      mainStream: null,
      screenStream: null,
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    this.remoteStreams.set(userId, info);
  }

  // Analyze stream to determine type
  const videoTracks = stream.getVideoTracks();
  const audioTracks = stream.getAudioTracks();
  
  // Heuristic 1: Check track label
  const isScreenLabel = videoTracks.some(t => 
    t.label.toLowerCase().includes('screen') || 
    t.label.toLowerCase().includes('capture') ||
    t.label.toLowerCase().includes('display')
  );

  // Heuristic 2: If we already have main (camera) stream, this must be screen
  const hasMain = !!info.mainStream;
  const isScreen = isScreenLabel || (hasMain && videoTracks.length > 0 && !audioTracks.length);

  if (isScreen) {
    this.log('info', `Set SCREEN stream for ${userId}`);
    info.screenStream = stream;
  } else {
    this.log('info', `Set MAIN stream for ${userId}`);
    info.mainStream = stream;
  }
  
  info.lastUpdated = new Date();
  this.emit('stream-updated', { userId });
}
```

**Update `getRemoteStream` (backward compatibility):**
```typescript
getRemoteStream(userId: string): MediaStream | null {
  const info = this.remoteStreams.get(userId);
  // Default to main, fallback to screen
  return info?.mainStream || info?.screenStream || null;
}
```

**Add `getRemoteScreenStream`:**
```typescript
getRemoteScreenStream(userId: string): MediaStream | null {
  return this.remoteStreams.get(userId)?.screenStream || null;
}
```

---

## 🔧 FIX 2: UPDATE HOOK TO EXPOSE SCREEN SHARES

**File:** `hooks/use-webrtc-v2.ts`

**Update `peers` logic (inside useSyncExternalStore):**
```typescript
// ... inside map loop ...
allStreams.forEach((streamInfo, userId) => {
  const connection = allConnections.get(userId);
  if (connection) {
    peersMap.set(userId, {
      userId,
      connection,
      stream: streamInfo.mainStream || undefined, // Only main stream here
      // 🔥 Note: We don't put screenStream here to keep PeerConnection interface simple
      // or we update PeerConnection interface
    });
  }
});
```

**Expose `remoteScreenShares`:**
```typescript
const remoteScreenShares = useSyncExternalStore(
  (callback) => {
    if (!streamManagerRef.current) return () => {};
    const handleCheck = () => callback();
    streamManagerRef.current.on('stream-updated', handleCheck);
    return () => streamManagerRef.current?.off('stream-updated', handleCheck);
  },
  () => {
    if (!streamManagerRef.current) return new Map();
    const map = new Map<string, MediaStream>();
    streamManagerRef.current.getAllRemoteStreamInfos().forEach((info, userId) => {
      if (info.screenStream) {
        map.set(userId, info.screenStream);
      }
    });
    return map;
  },
  () => new Map()
);

return {
  // ... existing
  remoteScreenShares, // 🔥 NEW
};
```

---

## 🔧 FIX 3: UPDATE VIDEO GRID TO SHOW REMOTE SCREENS

**File:** `section/meetings/video-grid.tsx`

**Update Interface:**
```typescript
interface VideoGridProps {
  // ... existing
  remoteScreenShares?: Map<string, MediaStream>; // 🔥 NEW
}
```

**Update Component:**
```typescript
export function VideoGrid({
  // ...
  remoteScreenShares,
}: VideoGridProps) {
  
  // ... existing logic
  
  return (
    <div className="p-4 space-y-4">
      {/* 1. LOCAL SCREEN */}
      {screenStream && (
        <div className="w-full mb-4">
           {/* ... existing local screen code ... */}
        </div>
      )}

      {/* 2. 🔥 NEW: REMOTE SCREENS */}
      {remoteScreenShares && Array.from(remoteScreenShares.entries()).map(([userId, stream]) => {
         const participant = getParticipantInfo(userId);
         if (!participant) return null;
         
         return (
           <div key={`screen-${userId}`} className="w-full mb-4">
             <Card className="bg-gray-800 border-gray-700">
               <CardContent className="p-0 aspect-video relative">
                  <video
                    ref={(el) => {
                      if (el && stream) {
                        el.srcObject = stream;
                        el.play().catch(console.error);
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded flex items-center gap-2">
                    <span className="text-white text-sm">
                      🖥️ {participant.user.name}'s Screen
                    </span>
                  </div>
               </CardContent>
             </Card>
           </div>
         );
      })}

      {/* 3. PEER GRID (CAMERA) */}
      <div className={`grid gap-4 ...`}>
        {/* ... existing peer grid code (showing camera streams) ... */}
      </div>
    </div>
  );
}
```

---

## 🔧 FIX 4: TRACKING SCREEN SHARE STATE

**File:** `hooks/use-webrtc-v2.ts`

**Add listener:**
```typescript
useEffect(() => {
  if (!socket) return;
  
  const handleRemoteScreenShare = (data: { userId: string, isSharing: boolean }) => {
    if (data.isSharing) {
      toast.info(`User ${data.userId} started screen sharing`);
    } else {
      // Clean up if needed
    }
  };
  
  socket.on('media:user-screen-share', handleRemoteScreenShare);
  
  return () => {
    socket.off('media:user-screen-share', handleRemoteScreenShare);
  };
}, [socket]);
```

---

## ✅ SUMMARY

These fixes ensure:
1.  **Separation:** Camera and Screen streams are stored separately in `P2PStreamManager`.
2.  **Display:** `VideoGrid` renders remote screen shares in large dedicated tiles (just like local screen share).
3.  **Stability:** Main camera grid remains stable even when users start/stop sharing.

**Execute these changes ALONG WITH the V2_COMPLETE_FIX_GUIDE.**
