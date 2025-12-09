# SCREEN SHARE & COLLAPSIBLE SIDEBAR - P2P WebRTC IMPLEMENTATION

> **Goal:** Fix screen share to not replace camera + Add collapsible sidebar  
> **Stack:** Pure P2P WebRTC (no external libraries)

---

## 🎯 PROBLEM ANALYSIS

### Current Issue:
- ❌ Screen share **replaces** camera track via `replaceTrack()`
- ❌ User's camera disappears when sharing screen
- ❌ Only screen visible, no camera tile
- ❌ Peers only see screen OR camera, not both

### Expected Behavior:
- ✅ Screen share is **separate** video track
- ✅ Camera tile still visible
- ✅ Both screen + camera shown simultaneously
- ✅ Peers see 2 tiles: user's camera + user's screen

---

## 💡 SOLUTION: Add Screen Track (Don't Replace)

### Current Wrong Approach:
```typescript
// ❌ BAD: Replaces camera with screen
const videoSender = senders.find(s => s.track?.kind === 'video');
videoSender.replaceTrack(screenTrack); // Camera disappears!
```

### Correct P2P WebRTC Approach:
```typescript
// ✅ GOOD: Add screen as ADDITIONAL track
// 1. Keep camera track in peer connection
// 2. Add screen track as new sender
// 3. Each peer connection has 2 video tracks:
//    - Track 1: Camera (from getUserMedia)
//    - Track 2: Screen (from getDisplayMedia)
// 4. Frontend shows 2 separate video tiles

pc.addTrack(screenTrack, screenStream); // Add, don't replace!
```

---

## 🔧 IMPLEMENTATION

### Step 1: Update Hook to Support Separate Screen Track

**File:** `hooks/use-webrtc-v2.ts`

**Current (WRONG):**
```typescript
// Line 520-540: toggleScreenShare replaces video track
const videoSender = senders.find(s => s.track?.kind === 'video');
if (videoSender) {
  videoSender.replaceTrack(screenTrack); // ❌ BAD: Replaces camera
}
```

**New (CORRECT):**
```typescript
// Add screen track WITHOUT replacing camera
const toggleScreenShare = useCallback(async () => {
  if (!mediaManagerRef.current || !peerConnectionManagerRef.current) return;

  const state = mediaManagerRef.current.getState();
  const isCurrentlySharing = state.screen.isSharing;

  try {
    if (isCurrentlySharing) {
      // Stop screen sharing
      const screenTrack = state.screen.track;
      if (screenTrack) {
        screenTrack.stop();
      }

      // 🔥 FIX: Remove ONLY screen track, keep camera
      const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();
      allConnections.forEach((pc) => {
        const senders = pc.getSenders();
        // Find screen sender by label
        const screenSender = senders.find(s => 
          s.track?.kind === 'video' && 
          s.track?.label.includes('screen')
        );
        if (screenSender) {
          pc.removeTrack(screenSender); // Remove only screen
        }
      });

      // Update state
      mediaManagerRef.current.emit('screen-state-changed');
      if (socket) {
        socket.emit('media:screen-share', { 
          roomId: meetingId, 
          userId,
          isSharing: false 
        });
      }
    } else {
      // Start screen sharing
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          frameRate: 30,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } as MediaTrackConstraints,
        audio: false,
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) {
        throw new Error('No screen track available');
      }

      // 🔥 FIX: Add screen track WITHOUT replacing camera
      const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();
      const localStream = mediaManagerRef.current.getLocalStream();

      allConnections.forEach((pc) => {
        // Add screen track as ADDITIONAL track
        pc.addTrack(screenTrack, displayStream);
      });

      // Create separate screen stream for local display
      const screenStream = new MediaStream([screenTrack]);
      
      // Store screen stream separately
      mediaManagerRef.current.setScreenStream(screenStream);
      mediaManagerRef.current.emit('screen-state-changed');
      mediaManagerRef.current.emit('stream-changed');

      // Auto-stop when user clicks "Stop sharing"
      screenTrack.onended = () => {
        if (state.screen.isSharing) {
          toggleScreenShare().catch(() => {});
        }
      };

      if (socket) {
        socket.emit('media:screen-share', { 
          roomId: meetingId,
          userId,
          isSharing: true 
        });
      }
    }
  } catch (error: any) {
    console.error('❌ [Screen Share] Failed:', error);
    toast.error(`Failed to toggle screen share: ${error.message}`);
  }
}, [socket, meetingId, userId]);
```

---

### Step 2: Update P2PMediaManager to Track Screen Stream

**File:** `services/p2p/core/p2p-media-manager.ts`

**Add:**
```typescript
export class P2PMediaManager extends BaseP2PManager {
  private screenStream: MediaStream | null = null;

  // ... existing code ...

  public setScreenStream(stream: MediaStream | null): void {
    this.screenStream = stream;
    this.emit('screen-stream-changed', stream);
  }

  public getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  // Update cleanup to stop screen stream
  public cleanup(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    // ... existing cleanup ...
  }
}
```

---

### Step 3: Update Hook to Expose Screen Stream

**File:** `hooks/use-webrtc-v2.ts`

**Add:**
```typescript
// Add screen stream to useSyncExternalStore
const screenStream = useSyncExternalStore(
  (callback) => {
    if (!mediaManagerRef.current) return () => {};
    
    const handleChange = () => callback();
    mediaManagerRef.current.on('screen-stream-changed', handleChange);
    
    return () => {
      mediaManagerRef.current?.off('screen-stream-changed', handleChange);
    };
  },
  () => {
    return mediaManagerRef.current?.getScreenStream() || null;
  },
  () => null
);

// Update return type
interface UseWebRTCV2Return {
  localStream: MediaStream | null;
  screenStream: MediaStream | null; // ✅ NEW
  peers: Map<string, PeerConnection>;
  // ... rest
}

return {
  localStream,
  screenStream, // ✅ NEW
  peers,
  // ... rest
};
```

---

### Step 4: Update Video Grid to Show Screen + Camera

**File:** `section/meetings/video-grid.tsx`

**Update interface:**
```typescript
interface VideoGridProps {
  localStream: MediaStream | null;
  screenStream: MediaStream | null; // ✅ NEW
  peers: Map<string, { 
    userId: string; 
    connection: RTCPeerConnection; 
    stream?: MediaStream;
    screenStream?: MediaStream; // ✅ NEW
  }>;
  // ... rest
}
```

**Update render logic:**
```typescript
export function VideoGrid({
  localStream,
  screenStream, // ✅ NEW
  peers,
  participants,
  currentUserId,
  isMuted,
  isVideoOff,
  spotlightUserId,
  isScreenSharing
}: VideoGridProps) {
  
  // ... existing code ...

  return (
    <div className="p-4 space-y-4">
      {/* 🔥 NEW: Screen share section (if sharing) */}
      {screenStream && (
        <div className="w-full mb-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0 aspect-video relative">
              <video
                ref={(el) => {
                  if (el && screenStream) {
                    el.srcObject = screenStream;
                    el.play().catch(console.error);
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-contain rounded bg-black"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded">
                <span className="text-white text-sm font-medium">
                  🖥️ Your Screen
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grid section - Camera tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Local camera (always show, even when sharing screen) */}
        {currentParticipant && (
          <LocalVideo
            key="local-camera"
            localStream={localStream}
            currentParticipant={currentParticipant}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={false} // ✅ Don't flip when sharing
          />
        )}

        {/* Remote cameras + screens */}
        {Array.from(peers.entries()).map(([userId, peer]) => {
          const participant = getParticipantInfo(userId);
          if (!participant) return null;

          return (
            <React.Fragment key={`peer-${userId}`}>
              {/* Camera tile */}
              <RemoteVideo
                stream={peer.stream}
                participant={participant}
              />
              
              {/* Screen tile (if peer is sharing) */}
              {peer.screenStream && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-0 aspect-video relative">
                    <video
                      ref={(el) => {
                        if (el && peer.screenStream) {
                          el.srcObject = peer.screenStream;
                          el.play().catch(console.error);
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain rounded bg-black"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded">
                      <span className="text-white text-sm">
                        🖥️ {participant.user.name}'s Screen
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Step 5: Update P2PStreamManager to Track Screen Streams

**File:** `services/p2p/core/p2p-stream-manager.ts`

**Add:**
```typescript
export class P2PStreamManager extends BaseP2PManager {
  private remoteScreenStreams = new Map<string, MediaStream>();

  // ... existing code ...

  public addRemoteScreenStream(userId: string, stream: MediaStream): void {
    this.remoteScreenStreams.set(userId, stream);
    this.emit('screen-stream-added', { userId, stream });
  }

  public removeRemoteScreenStream(userId: string): void {
    const stream = this.remoteScreenStreams.get(userId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.remoteScreenStreams.delete(userId);
      this.emit('screen-stream-removed', { userId });
    }
  }

  public getRemoteScreenStream(userId: string): MediaStream | undefined {
    return this.remoteScreenStreams.get(userId);
  }
}
```

---

### Step 6: Update P2PPeerConnectionManager to Handle Screen Tracks

**File:** `services/p2p/core/p2p-peer-connection-manager.ts`

**Update track-received handler:**
```typescript
// In initialize() method
pc.ontrack = (event: RTCTrackEvent) => {
  const track = event.track;
  const stream = event.streams[0];
  
  console.log(`📥 [P2PPeerConnectionManager] Received ${track.kind} track from ${targetUserId}`, {
    label: track.label,
    isScreen: track.label.includes('screen')
  });

  // 🔥 FIX: Distinguish between camera and screen tracks
  if (track.kind === 'video' && track.label.includes('screen')) {
    // Screen share track
    this.emit('screen-track-received', {
      userId: targetUserId,
      stream,
      track
    });
  } else {
    // Regular camera/audio track
    this.emit('track-received', {
      userId: targetUserId,
      stream,
      track
    });
  }
};
```

**Update hook to listen for screen tracks:**
```typescript
// In use-webrtc-v2.ts, add listener
peerConnectionManager.on('screen-track-received', (data: { userId: string; stream: MediaStream; track: MediaStreamTrack }) => {
  if (streamManagerRef.current) {
    streamManagerRef.current.addRemoteScreenStream(data.userId, data.stream);
  }
});
```

---

## 🎨 COLLAPSIBLE SIDEBAR

### Update Meeting Room Layout

**File:** `section/meetings/meeting-room.tsx`

**Add state:**
```typescript
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
```

**Update layout:**
```tsx
<div className="flex h-screen bg-gray-900">
  {/* Main content */}
  <div className={`flex-1 transition-all duration-300 ${
    isSidebarCollapsed ? 'mr-0' : 'mr-80'
  }`}>
    <VideoGrid
      localStream={localStream}
      screenStream={screenStream} // ✅ NEW
      peers={peers}
      // ... rest
    />
  </div>

  {/* Sidebar */}
  <div className={`fixed right-0 top-0 h-full bg-gray-800 border-l border-gray-700 transition-all duration-300 ${
    isSidebarCollapsed ? 'w-0' : 'w-80'
  } overflow-hidden`}>
    {/* Collapse button */}
    <button
      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      className="absolute -left-8 top-4 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-l"
    >
      {isSidebarCollapsed ? (
        <ChevronLeft className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
    </button>

    {/* Sidebar content */}
    {!isSidebarCollapsed && (
      <div className="p-4">
        {/* Participants, Chat, etc. */}
      </div>
    )}
  </div>
</div>
```

---

## 📊 SUMMARY

### Changes Required:

1. **`use-webrtc-v2.ts`:**
   - ✅ Update `toggleScreenShare` to ADD track instead of REPLACE
   - ✅ Add `screenStream` to return value
   - ✅ Add useSyncExternalStore for screen stream

2. **`p2p-media-manager.ts`:**
   - ✅ Add `screenStream` property
   - ✅ Add `setScreenStream()` method
   - ✅ Add `getScreenStream()` method

3. **`p2p-stream-manager.ts`:**
   - ✅ Add `remoteScreenStreams` Map
   - ✅ Add methods to manage screen streams

4. **`p2p-peer-connection-manager.ts`:**
   - ✅ Detect screen tracks by label
   - ✅ Emit separate event for screen tracks

5. **`video-grid.tsx`:**
   - ✅ Accept `screenStream` prop
   - ✅ Render screen share separately
   - ✅ Show both camera + screen tiles

6. **`meeting-room.tsx`:**
   - ✅ Add collapsible sidebar state
   - ✅ Update layout with transitions

---

## 🧪 TESTING

### Test Cases:

1. **Screen Share:**
   - [ ] Start screen share → Screen appears in separate tile
   - [ ] Camera tile still visible
   - [ ] Remote users see both camera + screen
   - [ ] Stop screen share → Screen tile disappears
   - [ ] Camera tile remains

2. **Sidebar:**
   - [ ] Click collapse button → Sidebar hides
   - [ ] Video grid expands to full width
   - [ ] Click expand button → Sidebar shows
   - [ ] Smooth transition animation

---

**Status:** Ready to implement  
**Priority:** High (UX improvement)  
**Estimated Time:** 2-3 hours
