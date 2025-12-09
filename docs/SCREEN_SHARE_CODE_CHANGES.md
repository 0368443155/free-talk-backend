# SCREEN SHARE FIX - CODE CHANGES SUMMARY

> **Status:** In Progress  
> **Files Modified:** 3 files  
> **Complexity:** Medium

---

## ✅ COMPLETED CHANGES

### 1. P2PMediaManager - Add Screen Stream Support ✅

**File:** `services/p2p/core/p2p-media-manager.ts`

**Changes:**
- ✅ Added `screenStream` property (line 20)
- ✅ Added `getScreenStream()` method (line 700)
- ✅ Added `setScreenStream()` method (line 709)
- ✅ Updated `cleanup()` to stop screen tracks (line 793)

---

## 🔧 REMAINING CHANGES

### 2. use-webrtc-v2.ts - Expose Screen Stream

**File:** `hooks/use-webrtc-v2.ts`

**Step 2.1:** Add useSyncExternalStore for screenStream (after line 370)

```typescript
// Add after isScreenSharing useSyncExternalStore

/**
 * Screen stream (separate from camera)
 * 🔥 NEW: For displaying screen share in separate tile
 */
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
```

**Step 2.2:** Update toggleScreenShare to ADD track instead of REPLACE (line 520-600)

**Current (WRONG):**
```typescript
// Line 560: Replaces camera track
const videoSender = senders.find(s => s.track?.kind === 'video');
if (videoSender) {
  videoSender.replaceTrack(screenTrack); // ❌ BAD
}
```

**New (CORRECT):**
```typescript
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
        // Find screen sender by label (screen tracks have 'screen' in label)
        const screenSender = senders.find(s => 
          s.track?.kind === 'video' && 
          s.track?.label.includes('screen')
        );
        if (screenSender) {
          pc.removeTrack(screenSender); // Remove only screen, keep camera
        }
      });

      // Clear screen stream
      mediaManagerRef.current.setScreenStream(null);
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

      allConnections.forEach((pc) => {
        // Add screen track as ADDITIONAL track (don't replace camera)
        pc.addTrack(screenTrack, displayStream);
      });

      // Store screen stream separately
      mediaManagerRef.current.setScreenStream(displayStream);
      mediaManagerRef.current.emit('screen-state-changed');

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

**Step 2.3:** Update return statement (line 665)

```typescript
return {
  localStream,
  screenStream, // 🔥 NEW
  peers,
  isMuted,
  isVideoOff,
  isScreenSharing,
  startLocalStream,
  stopLocalStream,
  toggleMute,
  toggleVideo,
  toggleScreenShare,
  getFirstPeerConnection,
};
```

---

### 3. meeting-room.tsx - Pass Screen Stream to VideoGrid

**File:** `section/meetings/meeting-room.tsx`

**Step 3.1:** Destructure screenStream from hook (line 335)

```typescript
const {
  localStream,
  screenStream, // 🔥 NEW
  peers,
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

**Step 3.2:** Pass to VideoGrid (find VideoGrid component usage)

```typescript
<VideoGrid
  localStream={localStream}
  screenStream={screenStream} // 🔥 NEW
  peers={peers}
  participants={participants}
  currentUserId={user.id}
  isMuted={isMuted}
  isVideoOff={isVideoOff}
  spotlightUserId={spotlightUserId}
  isScreenSharing={isScreenSharing}
/>
```

---

### 4. video-grid.tsx - Display Screen Share Separately

**File:** `section/meetings/video-grid.tsx`

**Step 4.1:** Update interface (line 10)

```typescript
interface VideoGridProps {
  localStream: MediaStream | null;
  screenStream: MediaStream | null; // 🔥 NEW
  peers: Map<string, { userId: string; connection: RTCPeerConnection; stream?: MediaStream }>;
  participants: IMeetingParticipant[];
  currentUserId: string;
  isMuted: boolean;
  isVideoOff: boolean;
  spotlightUserId?: string;
  isScreenSharing?: boolean;
}
```

**Step 4.2:** Update component signature (line 243)

```typescript
export function VideoGrid({
  localStream,
  screenStream, // 🔥 NEW
  peers,
  participants,
  currentUserId,
  isMuted,
  isVideoOff,
  spotlightUserId,
  isScreenSharing
}: VideoGridProps) {
```

**Step 4.3:** Add screen share section (after line 279, before grid)

```typescript
return (
  <div className="p-4 space-y-4">
    {/* 🔥 NEW: Screen share section (full width, above grid) */}
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

    {/* Spotlight section */}
    {/* ... existing code ... */}

    {/* Grid section - Camera tiles */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
      {/* Local camera (always show, even when sharing screen) */}
      {/* ... existing code ... */}
    </div>
  </div>
);
```

---

## 🎨 BONUS: Collapsible Sidebar

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
    <VideoGrid {...props} />
  </div>

  {/* Sidebar */}
  <div className={`fixed right-0 top-0 h-full bg-gray-800 border-l border-gray-700 transition-all duration-300 ${
    isSidebarCollapsed ? 'w-0' : 'w-80'
  } overflow-hidden`}>
    {/* Toggle button */}
    <button
      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      className="absolute -left-8 top-4 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-l"
    >
      {isSidebarCollapsed ? '◀' : '▶'}
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

## 📋 IMPLEMENTATION CHECKLIST

### Core Screen Share Fix:
- [x] P2PMediaManager: Add screenStream property
- [x] P2PMediaManager: Add get/set methods
- [x] P2PMediaManager: Update cleanup
- [ ] use-webrtc-v2: Add useSyncExternalStore for screenStream
- [ ] use-webrtc-v2: Fix toggleScreenShare (add track, don't replace)
- [ ] use-webrtc-v2: Update return statement
- [ ] meeting-room: Destructure screenStream
- [ ] meeting-room: Pass to VideoGrid
- [ ] video-grid: Update interface
- [ ] video-grid: Add screen share display section

### Bonus Features:
- [ ] Add collapsible sidebar
- [ ] Add smooth transitions
- [ ] Test with multiple users

---

## 🧪 TESTING

After implementation:

1. **Single User:**
   - [ ] Start screen share → Screen appears above grid
   - [ ] Camera tile still visible in grid
   - [ ] Stop screen share → Screen disappears, camera remains

2. **Multiple Users:**
   - [ ] User A shares screen → User B sees A's camera + A's screen
   - [ ] Both users share → Both see 2 screens + 2 cameras
   - [ ] Stop sharing → Tiles update correctly

3. **Sidebar:**
   - [ ] Click collapse → Sidebar hides smoothly
   - [ ] Video grid expands to full width
   - [ ] Click expand → Sidebar shows smoothly

---

**Next Step:** Apply Step 2 changes to `use-webrtc-v2.ts`
