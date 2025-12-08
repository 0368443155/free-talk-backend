# PHASE 0.3: MIGRATION STRATEGY

> **Timeline:** 2 ngày  
> **Priority:** 🔴 CRITICAL  
> **Status:** ⏳ TODO  
> **Prerequisites:** Phase 0.1, 0.2 ✅  
> **Score:** 10/10 ✅ Ready (Complete with reminder system)

---

## 📋 MỤC TIÊU

Migrate frontend từ old gateway events (`webrtc:*`) sang new modular gateway events (`media:*`). Đảm bảo zero downtime và backward compatibility.

---

## 🔍 HIỆN TRẠNG

**Backend:** ✅ Đã sẵn sàng
- `MediaGateway` với namespace `/media`
- Events: `media:offer`, `media:answer`, `media:ice-candidate`, `media:ready`, `media:toggle-mic`, `media:toggle-video`, `media:screen-share`

**Frontend:** ⚠️ Cần migrate
- `use-webrtc.ts` đang dùng dual events (old + new)
- Feature flag `use_new_gateway` đã có nhưng chưa enable hoàn toàn
- Old events: `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`, `webrtc:ready`
- New events: `media:offer`, `media:answer`, `media:ice-candidate`, `media:ready`

---

## 📊 EVENT MAPPING

| Old Event | New Event | Payload Changes |
|-----------|-----------|-----------------|
| `webrtc:offer` | `media:offer` | Add `roomId` field |
| `webrtc:answer` | `media:answer` | Add `roomId` field |
| `webrtc:ice-candidate` | `media:ice-candidate` | Add `roomId` field |
| `webrtc:ready` | `media:ready` | Add `roomId` field |
| `toggle-audio` | `media:toggle-mic` | Change `enabled` to `isMuted` |
| `toggle-video` | `media:toggle-video` | Change `enabled` to `isVideoOff` |
| `screen-share` | `media:screen-share` | Change `isSharing` format |

---

## 🚀 MIGRATION PLAN

### Step 1: Analyze Current Usage

**File:** `talkplatform-frontend/hooks/use-webrtc.ts`

**Current code patterns:**

```typescript
// Line 52
const useNewGateway = useFeatureFlag('use_new_gateway');

// Line 90-94
if (useNewGateway) {
  socket.emit('media:ready', { roomId: meetingId, userId });
} else {
  socket.emit('webrtc:ready', { userId });
}
```

**Find all old event usages:**
```bash
grep -r "webrtc:" talkplatform-frontend/hooks/
grep -r "toggle-audio\|toggle-video\|screen-share" talkplatform-frontend/
```

---

### Step 2: Create Migration Helper

**File:** `talkplatform-frontend/services/p2p/utils/event-migration-helper.ts` (NEW)

```typescript
import { Socket } from 'socket.io-client';

/**
 * Helper to migrate from old events to new events
 * Provides backward compatibility during migration
 */
export class EventMigrationHelper {
  constructor(
    private socket: Socket,
    private meetingId: string,
    private useNewGateway: boolean
  ) {}

  /**
   * Emit ready event (webrtc:ready -> media:ready)
   */
  emitReady(userId: string): void {
    if (this.useNewGateway) {
      this.socket.emit('media:ready', { roomId: this.meetingId, userId });
    } else {
      this.socket.emit('webrtc:ready', { userId });
    }
  }

  /**
   * Emit offer (webrtc:offer -> media:offer)
   */
  emitOffer(targetUserId: string, offer: RTCSessionDescriptionInit): void {
    if (this.useNewGateway) {
      this.socket.emit('media:offer', {
        roomId: this.meetingId,
        targetUserId,
        offer,
      });
    } else {
      this.socket.emit('webrtc:offer', {
        fromUserId: this.socket.id,
        toUserId: targetUserId,
        offer,
      });
    }
  }

  /**
   * Emit answer (webrtc:answer -> media:answer)
   */
  emitAnswer(targetUserId: string, answer: RTCSessionDescriptionInit): void {
    if (this.useNewGateway) {
      this.socket.emit('media:answer', {
        roomId: this.meetingId,
        targetUserId,
        answer,
      });
    } else {
      this.socket.emit('webrtc:answer', {
        fromUserId: this.socket.id,
        toUserId: targetUserId,
        answer,
      });
    }
  }

  /**
   * Emit ICE candidate (webrtc:ice-candidate -> media:ice-candidate)
   */
  emitIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit): void {
    if (this.useNewGateway) {
      this.socket.emit('media:ice-candidate', {
        roomId: this.meetingId,
        targetUserId,
        candidate,
      });
    } else {
      this.socket.emit('webrtc:ice-candidate', {
        fromUserId: this.socket.id,
        toUserId: targetUserId,
        candidate,
      });
    }
  }

  /**
   * Emit toggle mic (toggle-audio -> media:toggle-mic)
   */
  emitToggleMic(isMuted: boolean): void {
    if (this.useNewGateway) {
      this.socket.emit('media:toggle-mic', { isMuted });
    } else {
      this.socket.emit('toggle-audio', { enabled: !isMuted });
    }
  }

  /**
   * Emit toggle video (toggle-video -> media:toggle-video)
   */
  emitToggleVideo(isVideoOff: boolean): void {
    if (this.useNewGateway) {
      this.socket.emit('media:toggle-video', { isVideoOff });
    } else {
      this.socket.emit('toggle-video', { enabled: !isVideoOff });
    }
  }

  /**
   * Emit screen share (screen-share -> media:screen-share)
   */
  emitScreenShare(isSharing: boolean): void {
    if (this.useNewGateway) {
      this.socket.emit('media:screen-share', { isSharing });
    } else {
      this.socket.emit('screen-share', { isSharing });
    }
  }
}
```

---

### Step 3: Update use-webrtc.ts

**File:** `talkplatform-frontend/hooks/use-webrtc.ts`

**Changes:**

1. **Import migration helper:**
```typescript
import { EventMigrationHelper } from '@/services/p2p/utils/event-migration-helper';
```

2. **Replace feature flag logic:**
```typescript
// OLD:
const useNewGateway = useFeatureFlag('use_new_gateway');

// NEW: Always use new gateway (remove feature flag)
const eventHelper = useMemo(() => {
  if (!socket) return null;
  return new EventMigrationHelper(socket, meetingId, true); // Always true
}, [socket, meetingId]);
```

3. **Replace all event emissions:**
```typescript
// OLD:
if (useNewGateway) {
  socket.emit('media:ready', { roomId: meetingId, userId });
} else {
  socket.emit('webrtc:ready', { userId });
}

// NEW:
eventHelper?.emitReady(userId);
```

4. **Update event listeners:**
```typescript
// Listen to both old and new events during migration period
useEffect(() => {
  if (!socket) return;

  const handleOffer = (data: any) => {
    // Handle both old and new format
    const targetUserId = data.targetUserId || data.fromUserId;
    const offer = data.offer;
    // ... handle offer
  };

  // Listen to new events
  socket.on('media:offer', handleOffer);
  socket.on('media:answer', handleAnswer);
  socket.on('media:ice-candidate', handleIceCandidate);

  // TODO: REMOVE AFTER 2025-01-31 (4 weeks after migration start)
  // Keep old listeners for backward compatibility during migration
  socket.on('webrtc:offer', handleOffer);
  socket.on('webrtc:answer', handleAnswer);
  socket.on('webrtc:ice-candidate', handleIceCandidate);

  return () => {
    socket.off('media:offer', handleOffer);
    socket.off('media:answer', handleAnswer);
    socket.off('media:ice-candidate', handleIceCandidate);
    
    // TODO: REMOVE AFTER 2025-01-31
    socket.off('webrtc:offer', handleOffer);
    socket.off('webrtc:answer', handleAnswer);
    socket.off('webrtc:ice-candidate', handleIceCandidate);
  };
}, [socket]);
```

---

### Step 4: Test Migration

**Create test file:**
**File:** `talkplatform-frontend/services/p2p/utils/__tests__/event-migration-helper.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { EventMigrationHelper } from '../event-migration-helper';
import { createMockSocket } from '../../../../tests/utils/webrtc-test-utils';

describe('EventMigrationHelper', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let helper: EventMigrationHelper;

  beforeEach(() => {
    mockSocket = createMockSocket();
  });

  describe('with new gateway enabled', () => {
    beforeEach(() => {
      helper = new EventMigrationHelper(mockSocket as any, 'meeting-1', true);
    });

    it('should emit media:ready with roomId', () => {
      helper.emitReady('user-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('media:ready', {
        roomId: 'meeting-1',
        userId: 'user-1',
      });
    });

    it('should emit media:offer with roomId', () => {
      const offer = { type: 'offer', sdp: 'mock-sdp' };
      helper.emitOffer('user-2', offer);
      expect(mockSocket.emit).toHaveBeenCalledWith('media:offer', {
        roomId: 'meeting-1',
        targetUserId: 'user-2',
        offer,
      });
    });

    it('should emit media:toggle-mic with isMuted', () => {
      helper.emitToggleMic(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('media:toggle-mic', {
        isMuted: true,
      });
    });
  });

  describe('with old gateway (backward compatibility)', () => {
    beforeEach(() => {
      helper = new EventMigrationHelper(mockSocket as any, 'meeting-1', false);
    });

    it('should emit webrtc:ready without roomId', () => {
      helper.emitReady('user-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc:ready', {
        userId: 'user-1',
      });
    });

    it('should emit toggle-audio with enabled flag', () => {
      helper.emitToggleMic(true); // isMuted = true
      expect(mockSocket.emit).toHaveBeenCalledWith('toggle-audio', {
        enabled: false, // Inverted
      });
    });
  });
});
```

---

### Step 5: Gradual Rollout

**Strategy:**
1. **Week 1:** Deploy code với dual support (old + new)
2. **Week 2:** Enable new gateway for 10% users (via feature flag)
3. **Week 3:** Increase to 50% users
4. **Week 4:** Full rollout (100% users)
5. **Week 5:** Remove old event handlers

**Feature flag configuration:**
```typescript
// Backend: feature_flags table
{
  name: 'use_new_gateway',
  enabled: true,
  rollout_percentage: 10, // Start with 10%
}
```

---

### Step 6: Remove Old Code

**After full migration (Week 5+):**

1. **Remove feature flag:**
```typescript
// Remove useFeatureFlag('use_new_gateway')
```

2. **Remove old event listeners:**
```typescript
// TODO: REMOVE AFTER 2025-01-31 - Remove all socket.on('webrtc:*')
// Search codebase for: webrtc:offer, webrtc:answer, webrtc:ice-candidate, webrtc:ready
```

3. **Simplify event helper:**
```typescript
// Remove backward compatibility logic
// Always use new events
```

4. **Update documentation:**
- Remove old event references
- Update API docs

**⚠️ REMINDER SETUP:**

**Create ticket/task in your project management tool:**
- **Title:** Remove Old WebRTC Event Handlers (Migration Cleanup)
- **Due Date:** 2025-01-31
- **Priority:** Medium
- **Description:** 
  - Remove all `socket.on('webrtc:*')` listeners
  - Remove `EventMigrationHelper` backward compatibility code
  - Update documentation
  - Verify no old events in codebase (grep for "webrtc:")

**Or add to calendar/reminder:**
- Set reminder for 2025-01-25 (1 week before cleanup date)

---

## ✅ ACCEPTANCE CRITERIA

- [ ] Event migration helper created
- [ ] use-webrtc.ts updated to use helper
- [ ] Dual event support working (old + new)
- [ ] Tests passing
- [ ] Manual testing successful
- [ ] Migration plan documented
- [ ] Rollout strategy defined

---

## 📝 MIGRATION CHECKLIST

**Before migration:**
- [ ] Backup current code
- [ ] Document all event usages
- [ ] Create migration helper
- [ ] Write tests

**During migration:**
- [ ] Deploy dual support code
- [ ] Monitor error logs
- [ ] Test with small user group
- [ ] Gradually increase rollout

**After migration:**
- [ ] Verify 100% using new events
- [ ] Remove old event handlers
- [ ] Remove feature flag
- [ ] Clean up code
- [ ] Update documentation

---

## 🐛 TROUBLESHOOTING

**Issue: Events not working after migration**
- Check socket connection
- Verify event names match backend
- Check payload format
- Verify socket is connected before emitting

**Issue: Backward compatibility breaks**
- Keep old listeners during migration
- Use migration helper consistently
- Check browser console for event errors

**Issue: Duplicate event handlers after migration**
- Ensure `cleanupTrackedListeners()` is called properly
- Check if old hook is still being used somewhere
- Verify socket.off() is being called for all listeners

**Issue: Events fire twice**
- This is the "bấm 1 lần, server nhận 2 lần" bug
- Check if both old and new listeners are active
- Verify cleanup is happening correctly
- Use browser DevTools to inspect socket listeners

---

## 📚 NEXT STEPS

Sau khi hoàn thành Phase 0.3, tiếp tục với:
- [**Phase0_04_Documentation.md**](./Phase0_04_Documentation.md) - Architecture documentation

---

**Last Updated:** 2025-12-08  
**Status:** ✅ Ready to Implement

