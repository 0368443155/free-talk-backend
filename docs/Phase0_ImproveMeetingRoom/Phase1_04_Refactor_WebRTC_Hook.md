# PHASE 1.4: REFACTOR use-webrtc.ts HOOK

> **Timeline:** 2-3 ngày  
> **Priority:** 🔴 CRITICAL  
> **Status:** ⏳ TODO  
> **Prerequisites:** Phase 0 ✅, Phase 1.1 ✅, Phase 1.2 ✅, Phase 1.3 ✅  
> **Score:** 9.5/10 ✅ Ready (Fixed async useEffect anti-pattern + Optimistic UI + Config change detection)

---

## 📋 MỤC TIÊU

Refactor `use-webrtc.ts` để sử dụng P2P managers thay vì monolithic logic:
- Replace inline logic với manager calls
- Simplify hook structure
- Maintain backward compatibility
- Improve maintainability

---

## 🔍 HIỆN TRẠNG

**Current file:** `talkplatform-frontend/hooks/use-webrtc.ts`
- 792 lines - quá lớn
- Logic lẫn lộn với state management
- Khó test và maintain

---

## ⚠️ CRITICAL CONSIDERATIONS & ANTI-PATTERNS TO AVOID

### A. React 18/19 StrictMode & State Synchronization

**Problem:** Using `useEffect` + `useState` to subscribe to class manager events can cause:
- **Tearing**: State updates from socket events happen faster than React renders
- **Double renders**: StrictMode runs effects twice, causing duplicate listeners
- **Race conditions**: Multiple state updates from manager events can conflict

**Solution:** Use `useSyncExternalStore` (React 18+ hook) to safely bind external stores (our class managers) to React.

**Benefits:**
- ✅ Prevents tearing by ensuring atomic state updates
- ✅ Handles StrictMode correctly
- ✅ Reduces unnecessary re-renders
- ✅ Type-safe state synchronization

**⚠️ CRITICAL: getSnapshot Reference Equality**

**Problem:** The `getSnapshot` function (2nd parameter of `useSyncExternalStore`) must return the same reference if data hasn't changed. If `getState()` returns a new object `{ ...state }` each time, React will re-render infinitely.

**Solution:**
- Use primitive values in `getSnapshot`: `getMicState().isMuted` (boolean) instead of `getState().mic.isMuted` (from new object)
- Or memoize state in manager: Cache state object and only create new one when actual values change
- **Best practice:** Create separate getters for each primitive value needed by React (`getMicState()`, `getCameraState()`)

### B. Manager Lifecycle Management

**Problem:** If socket or meetingId changes, old manager may not be cleaned up, causing:
- Duplicate socket listeners (bấm 1 lần, server nhận 2 lần)
- Memory leaks
- Conflicting state
- Multiple managers running simultaneously

**Solution:** 
- Store managers in `useRef` (persists across renders)
- Track config changes (socket ID, meetingId, userId) in `configRef`
- When config changes: cleanup old managers first, then create new ones
- Use `cleanupTrackedListeners()` in BaseP2PManager to ensure all listeners removed
- **Important:** Check if config actually changed before recreating managers (avoid unnecessary cleanup/reinit)

**⚠️ CRITICAL: No async/await in useEffect**

**Anti-Pattern to Avoid:**
```typescript
// ❌ DON'T DO THIS - ANTI-PATTERN:
useEffect(() => {
  (async () => {
    if (configChanged) {
      cleanupManagers();
      await new Promise(resolve => setTimeout(resolve, 100)); // ⚠️ DANGEROUS!
      // Initialize new managers...
    }
  })();
}, [deps]);
```

**Why Dangerous:**
- Component can unmount during the 100ms delay
- Code after `await` still runs → "Can't perform React state update on unmounted component"
- Memory leak: New manager created but component already unmounted
- Race condition: Old manager cleanup and new manager init can overlap

**Correct Pattern:**
```typescript
// ✅ DO THIS - CORRECT:
useEffect(() => {
  if (configChanged) {
    cleanupManagers(); // Synchronous - completes immediately
    // No delay needed - cleanup is synchronous
    // socket.off() and track.stop() are all synchronous operations
    // Initialize new managers immediately after cleanup
  }
}, [deps]);
```

**Why Safe:**
- Cleanup is synchronous (socket.off(), track.stop() are all sync)
- No delay = no window for component unmount
- If cleanup wasn't complete, initialization would fail anyway
- All operations complete before component can unmount

### C. Error Handling & UX (Optimistic UI Pattern)

**Problem:** Sync failures to database should not show error to user if UI operation already succeeded.

**Solution:** 
- Use Optimistic UI: UI updates immediately, sync happens in background
- If sync timeout: Don't reject, just log warning and fetch latest state from server
- Only show Toast for unexpected errors (not timeouts)
- State reconciliation: `fetchLatestMicState()` / `fetchLatestCameraState()` automatically sync state

**Why This Matters:**
- User toggles mic → UI updates immediately (good UX)
- Network slow → Sync timeout after 5s
- Old approach: Show error "Failed to toggle mic" → User confused (mic is actually toggled)
- New approach: Silently fetch latest state from server → State reconciles automatically → No error shown

---

## 🏗️ REFACTORING STRATEGY

### Step 1: Create New Hook Structure (With useSyncExternalStore)

**File:** `talkplatform-frontend/hooks/use-webrtc-v2.ts` (NEW - temporary)

```typescript
import { useRef, useCallback, useEffect } from 'react';
import { useSyncExternalStore } from 'react'; // React 18+ hook for external stores
import { Socket } from 'socket.io-client';
import { P2PMediaManager } from '@/services/p2p/core/p2p-media-manager';
import { P2PStreamManager } from '@/services/p2p/core/p2p-stream-manager';
import { P2PTrackStateSync } from '@/services/p2p/core/p2p-track-state-sync';
import { MediaManagerConfig } from '@/services/p2p/types';
import { toast } from 'sonner'; // Assuming using sonner for Toast

interface UseWebRTCV2Props {
  socket: Socket | null;
  meetingId: string;
  userId: string;
  isOnline: boolean;
}

/**
 * CRITICAL: Use useSyncExternalStore to safely bind class manager state to React
 * This prevents "tearing" issues in React 18/19 StrictMode and ensures state consistency
 */
export function useWebRTCV2({ socket, meetingId, userId, isOnline }: UseWebRTCV2Props) {
  // Managers - stored in ref to persist across renders
  const mediaManagerRef = useRef<P2PMediaManager | null>(null);
  const streamManagerRef = useRef<P2PStreamManager | null>(null);
  const stateSyncRef = useRef<P2PTrackStateSync | null>(null);
  
  // Track if cleanup has been called to prevent duplicate cleanup
  const cleanupCalledRef = useRef(false);

  // Track current config to detect changes
  const configRef = useRef<{ socket: Socket; meetingId: string; userId: string } | null>(null);

  // Initialize or recreate managers when config changes
  useEffect(() => {
    if (!socket || !isOnline) {
      // Cleanup if socket disconnects
      if (mediaManagerRef.current) {
        cleanupManagers();
      }
      return;
    }

    // Check if config changed (socket ID or meetingId/userId)
    const currentConfig = { socket, meetingId, userId };
    const configChanged = 
      !configRef.current ||
      configRef.current.socket.id !== socket.id ||
      configRef.current.meetingId !== meetingId ||
      configRef.current.userId !== userId;

    // If config changed, cleanup old managers first (CRITICAL to prevent duplicate listeners)
    // ⚠️ CRITICAL: Cleanup is synchronous - no need for await/delay
    // cleanup() calls socket.off() and track.stop() which are all synchronous operations
    // Adding await setTimeout here is an anti-pattern that can cause:
    // - Component unmount during delay -> "Can't perform React state update on unmounted component"
    // - Memory leaks if component unmounts before initialization completes
    if (configChanged && mediaManagerRef.current) {
      cleanupManagers();
      // No delay needed - cleanup is synchronous
      // If cleanup wasn't complete, we wouldn't be able to proceed anyway
    }

    // Initialize managers if not exists or config changed
    if (!mediaManagerRef.current || configChanged) {
      const mediaConfig: MediaManagerConfig = {
        socket,
        meetingId,
        userId,
      };

      const mediaManager = new P2PMediaManager(mediaConfig);
      const streamManager = new P2PStreamManager();
      const stateSync = new P2PTrackStateSync();

      // Initialize
      mediaManager.initialize().then(() => {
        mediaManagerRef.current = mediaManager;
        streamManagerRef.current = streamManager;
        
        // Setup state sync
        stateSync.startSync(mediaManager, socket, null as any); // TODO: Get participant
        stateSyncRef.current = stateSync;

        // Listen to sync errors for Toast notifications
        mediaManager.on('sync-error', (error: { type: string; error: string; action: string }) => {
          toast.error(`Failed to ${error.action}: ${error.error}`, {
            duration: 3000,
          });
        });

        // Emit initial state change to trigger useSyncExternalStore subscriptions
        mediaManager.emit('stream-changed');
        mediaManager.emit('mic-state-changed', mediaManager.getMicState());
        mediaManager.emit('camera-state-changed', mediaManager.getCameraState());
      });

      // Store current config
      configRef.current = currentConfig;
    }

    // Setup cleanup on unmount
    const beforeUnloadHandler = () => {
      if (!cleanupCalledRef.current) {
        cleanupManagers();
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', beforeUnloadHandler);
    }
    
    // Cleanup on unmount or when dependencies change
    // ⚠️ CRITICAL: This cleanup runs synchronously when effect re-runs or component unmounts
    // No async operations here - all cleanup is synchronous
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
      cleanupManagers(); // Synchronous cleanup
    };
  }, [socket, meetingId, userId, isOnline, cleanupManagers]);

  // Cleanup function
  const cleanupManagers = useCallback(() => {
    // ⚠️ STRICT MODE DOUBLE INVOKE PROTECTION:
    // React 18 Strict Mode (Dev) runs effects twice to detect side effects.
    // cleanupCalledRef ensures cleanup only runs once per actual cleanup cycle.
    // However, if you see "P2PMediaManager initialized" log twice WITHOUT cleanup in between,
    // it means cleanupCalledRef is not being reset properly.
    // 
    // Debug: Watch console for:
    // - Expected: "initialized" → "cleaned up" → "initialized" (Strict Mode cycle)
    // - Problem: "initialized" → "initialized" (no cleanup between, check cleanupCalledRef reset)
    
    if (cleanupCalledRef.current) {
      this.log?.('debug', 'Cleanup already called, skipping (Strict Mode protection)');
      return;
    }
    cleanupCalledRef.current = true;
    
    // Log cleanup for debugging Strict Mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[useWebRTCV2] Cleaning up managers (Strict Mode check)');
    }

    if (mediaManagerRef.current) {
      mediaManagerRef.current.cleanup();
      mediaManagerRef.current = null;
    }
    if (streamManagerRef.current) {
      streamManagerRef.current.cleanup();
      streamManagerRef.current = null;
    }
    if (stateSyncRef.current) {
      stateSyncRef.current.stopSync();
      stateSyncRef.current = null;
    }
    
    // Reset config ref
    configRef.current = null;
    
    // Reset cleanup flag (allows re-initialization if needed)
    cleanupCalledRef.current = false;
  }, []);

  // Use useSyncExternalStore to subscribe to manager state changes
  // This is the React 18+ recommended way to bind external stores (like our class managers)
  const localStream = useSyncExternalStore(
    (callback) => {
      // Subscribe function
      if (!mediaManagerRef.current) return () => {};
      
      const handleStreamChange = () => {
        callback(); // Trigger re-render
      };
      
      mediaManagerRef.current.on('stream-changed', handleStreamChange);
      
      return () => {
        mediaManagerRef.current?.off('stream-changed', handleStreamChange);
      };
    },
    () => {
      // Get snapshot
      return mediaManagerRef.current?.getLocalStream() || null;
    },
    () => null // Server snapshot (not used in client-only)
  );

  /**
   * CRITICAL: Use primitive values for getSnapshot to ensure reference equality
   * If getState() returns a new object each time, React will re-render infinitely.
   * Using getMicState().isMuted (primitive boolean) ensures same value = same reference.
   */
  const isMuted = useSyncExternalStore(
    (callback) => {
      if (!mediaManagerRef.current) return () => {};
      
      const handleStateChange = () => callback();
      mediaManagerRef.current.on('mic-state-changed', handleStateChange);
      
      return () => {
        mediaManagerRef.current?.off('mic-state-changed', handleStateChange);
      };
    },
    () => {
      // Use primitive value from getMicState() instead of full state object
      // This ensures reference equality: same value = no re-render
      const micState = mediaManagerRef.current?.getMicState();
      return micState?.isMuted ?? false; // Primitive boolean
    },
    () => false // Server snapshot (SSR not used)
  );

  /**
   * CRITICAL: Same approach - use primitive value for camera state
   */
  const isVideoOff = useSyncExternalStore(
    (callback) => {
      if (!mediaManagerRef.current) return () => {};
      
      const handleStateChange = () => callback();
      mediaManagerRef.current.on('camera-state-changed', handleStateChange);
      
      return () => {
        mediaManagerRef.current?.off('camera-state-changed', handleStateChange);
      };
    },
    () => {
      // Use primitive value from getCameraState() instead of full state object
      const cameraState = mediaManagerRef.current?.getCameraState();
      return cameraState?.isVideoOff ?? false; // Primitive boolean
    },
    () => false // Server snapshot (SSR not used)
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupManagers();
    };
  }, [cleanupManagers]);

  // Start local stream
  const startLocalStream = useCallback(async () => {
    if (!mediaManagerRef.current) return;

    try {
      await mediaManagerRef.current.initializeLocalStream(true, true);
      // State will update automatically via useSyncExternalStore subscription
    } catch (error: any) {
      toast.error(`Failed to start local stream: ${error.message}`);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!mediaManagerRef.current) return;
    
    try {
      // Use getMicState() for primitive value instead of full state
      const micState = mediaManagerRef.current.getMicState();
      await mediaManagerRef.current.enableMicrophone(!micState.enabled);
      // State will update automatically via useSyncExternalStore subscription
      // Manager emits 'mic-state-changed' event which triggers callback()
    } catch (error: any) {
      toast.error(`Failed to toggle microphone: ${error.message}`);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!mediaManagerRef.current) return;
    
    try {
      // Use getCameraState() for primitive value instead of full state
      const cameraState = mediaManagerRef.current.getCameraState();
      await mediaManagerRef.current.enableCamera(!cameraState.enabled);
      // State will update automatically via useSyncExternalStore subscription
      // Manager emits 'camera-state-changed' event which triggers callback()
    } catch (error: any) {
      toast.error(`Failed to toggle camera: ${error.message}`);
    }
  }, []);

  return {
    localStream,
    isMuted,
    isVideoOff,
    startLocalStream,
    toggleMute,
    toggleVideo,
    // TODO: Add other methods
  };
}
```

### Step 2: Gradual Migration & Testing Strategy

**⚠️ CRITICAL: Test in isolation before replacing existing hook**

1. **Week 1:** Create new hook, test in isolation
   - Create hidden test page: `/test-room` (only accessible in dev)
   - Use `use-webrtc-v2` in test page
   - Manual testing with real browser
   - Verify all features work: mic, cam, screen share, peer connections

2. **Week 2:** Migrate one feature at a time
   - Start with mic toggle only
   - Keep old hook for other features
   - A/B test or feature flag to switch between old/new

3. **Week 3:** Full migration
   - Replace old hook with new one
   - Monitor error logs closely
   - Have rollback plan ready

4. **Week 4:** Remove old hook
   - Delete `use-webrtc.ts` (after confirming no issues)
   - Clean up imports

**Test Page Example:**

**File:** `talkplatform-frontend/app/test-room/page.tsx` (NEW - dev only)

```typescript
'use client';

import { useWebRTCV2 } from '@/hooks/use-webrtc-v2';
import { useMeetingSocket } from '@/hooks/use-meeting-socket';

export default function TestRoomPage() {
  // Only accessible in development
  if (process.env.NODE_ENV === 'production') {
    return <div>Not available in production</div>;
  }

  const { socket } = useMeetingSocket('test-meeting-id');
  const {
    localStream,
    isMuted,
    isVideoOff,
    startLocalStream,
    toggleMute,
    toggleVideo,
  } = useWebRTCV2({
    socket,
    meetingId: 'test-meeting-id',
    userId: 'test-user',
    isOnline: true,
  });

  return (
    <div className="p-8">
      <h1>Test Room - WebRTC V2 Hook</h1>
      <div className="space-y-4">
        <button onClick={startLocalStream}>Start Stream</button>
        <button onClick={toggleMute}>
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={toggleVideo}>
          {isVideoOff ? 'Enable Video' : 'Disable Video'}
        </button>
        {localStream && (
          <video
            ref={(video) => {
              if (video && localStream) {
                video.srcObject = localStream;
              }
            }}
            autoPlay
            muted
            className="w-96 h-72 bg-black"
          />
        )}
      </div>
    </div>
  );
}
```

---

## ✅ ACCEPTANCE CRITERIA

- [ ] New hook created with useSyncExternalStore
- [ ] getSnapshot uses primitive values (not objects) for reference equality
- [ ] Manager lifecycle handles config changes (socket/meetingId/userId)
- [ ] Cleanup is called correctly when config changes or unmount
- [ ] All managers integrated and working
- [ ] Test page `/test-room` created and tested manually
- [ ] No duplicate listeners (verify with DevTools)
- [ ] Tests passing (unit + integration)
- [ ] Old hook removed (after full migration)

## ⚠️ VERIFICATION CHECKLIST

Before removing old hook, verify:

- [ ] No console errors in browser DevTools
- [ ] Socket listeners count is correct (check `socket._callbacks` in console)
- [ ] Mic toggle works without duplicate events
- [ ] Camera toggle works without duplicate events
- [ ] Screen share works
- [ ] Peer connections establish correctly
- [ ] No memory leaks (check Memory tab in DevTools)
- [ ] State sync works correctly (mic/cam state matches UI)
- [ ] Error handling works (simulate network failure)

---

**Last Updated:** 2025-12-08  
**Status:** ⏳ TODO

