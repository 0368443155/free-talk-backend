# Frontend Update Guide - Gateway Migration

**Ngày tạo:** 2025-12-01  
**Mục đích:** Hướng dẫn update frontend để sử dụng new gateway events

---

## 📋 Tổng Quan

Frontend cần được update để sử dụng các event names mới từ modular gateways thay vì old gateway events.

---

## 🔄 Event Name Changes

### WebRTC Signaling Events

| Old Event | New Event | Gateway | Payload Changes |
|-----------|-----------|---------|-----------------|
| `webrtc:offer` | `media:offer` | MediaGateway | Added `roomId` field |
| `webrtc:answer` | `media:answer` | MediaGateway | Added `roomId` field |
| `webrtc:ice-candidate` | `media:ice-candidate` | MediaGateway | Added `roomId` field |
| `webrtc:ready` | `media:ready` | MediaGateway | Added `roomId` field |

### Media Control Events

| Old Event | New Event | Gateway | Payload Changes |
|-----------|-----------|---------|-----------------|
| `toggle-audio` | `media:toggle-mic` | MediaGateway | Changed `enabled` → `isMuted` |
| `toggle-video` | `media:toggle-video` | MediaGateway | Changed `enabled` → `isVideoOff` |
| `screen-share` | `media:screen-share` | MediaGateway | Changed `enabled` → `isSharing` |

### Room Events

| Old Event | New Event | Gateway | Payload Changes |
|-----------|-----------|---------|-----------------|
| `meeting:join` | `room:join` | UnifiedRoomGateway | Added `roomId` field |
| `meeting:leave` | `room:leave` | UnifiedRoomGateway | Added `roomId` field |

---

## 📝 Implementation Guide

### Step 1: Update Socket Connection

**Before:**
```typescript
// Old: Connect to default namespace
const socket = io('http://localhost:3000', {
  auth: { token: userToken }
});
```

**After:**
```typescript
// New: Connect to specific namespaces
const mediaSocket = io('http://localhost:3000/media', {
  auth: { token: userToken }
});

const roomSocket = io('http://localhost:3000/room', {
  auth: { token: userToken }
});
```

### Step 2: Update WebRTC Signaling

**Before:**
```typescript
// Old event names
socket.emit('webrtc:offer', {
  targetUserId: 'user-123',
  offer: offerData
});

socket.on('webrtc:offer', (data) => {
  // Handle offer
});
```

**After:**
```typescript
// New event names with roomId
mediaSocket.emit('media:offer', {
  roomId: 'room-456',
  targetUserId: 'user-123',
  offer: offerData
});

mediaSocket.on('media:offer', (data) => {
  // data.fromUserId - sender ID
  // data.roomId - room ID
  // data.offer - offer data
});
```

### Step 3: Update Media Control

**Before:**
```typescript
socket.emit('toggle-audio', { enabled: true });
socket.emit('toggle-video', { enabled: false });
socket.emit('screen-share', { enabled: true });
```

**After:**
```typescript
mediaSocket.emit('media:toggle-mic', { isMuted: false });
mediaSocket.emit('media:toggle-video', { isVideoOff: true });
mediaSocket.emit('media:screen-share', { isSharing: true });
```

### Step 4: Update Room Events

**Before:**
```typescript
socket.emit('meeting:join', { meetingId: 'meeting-123' });
socket.emit('meeting:leave', { meetingId: 'meeting-123' });
```

**After:**
```typescript
roomSocket.emit('room:join', { roomId: 'room-123' });
roomSocket.emit('room:leave', { roomId: 'room-123' });
```

---

## 🔄 Backward Compatibility

Để đảm bảo zero downtime, frontend có thể hỗ trợ cả old và new events trong thời gian transition:

```typescript
// Feature flag check
const useNewGateway = await checkFeatureFlag('use_new_gateway');

if (useNewGateway) {
  // Use new events
  mediaSocket.emit('media:offer', { roomId, targetUserId, offer });
} else {
  // Fallback to old events
  socket.emit('webrtc:offer', { targetUserId, offer });
}
```

---

## 📦 Example: React Hook

```typescript
// hooks/useMediaSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useFeatureFlag } from './useFeatureFlag';

interface UseMediaSocketOptions {
  roomId: string;
  userId: string;
  token: string;
}

export function useMediaSocket({ roomId, userId, token }: UseMediaSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const useNewGateway = useFeatureFlag('use_new_gateway');

  useEffect(() => {
    if (useNewGateway) {
      // Connect to new media gateway
      socketRef.current = io('http://localhost:3000/media', {
        auth: { token },
      });
    } else {
      // Fallback to old gateway
      socketRef.current = io('http://localhost:3000', {
        auth: { token },
      });
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [useNewGateway, token]);

  const sendOffer = (targetUserId: string, offer: RTCSessionDescriptionInit) => {
    if (!socketRef.current) return;

    if (useNewGateway) {
      socketRef.current.emit('media:offer', {
        roomId,
        targetUserId,
        offer,
      });
    } else {
      socketRef.current.emit('webrtc:offer', {
        targetUserId,
        offer,
      });
    }
  };

  const toggleMic = (isMuted: boolean) => {
    if (!socketRef.current) return;

    if (useNewGateway) {
      socketRef.current.emit('media:toggle-mic', { isMuted });
    } else {
      socketRef.current.emit('toggle-audio', { enabled: !isMuted });
    }
  };

  return {
    socket: socketRef.current,
    sendOffer,
    toggleMic,
    // ... other methods
  };
}
```

---

## 🧪 Testing Checklist

- [ ] WebRTC offer/answer flow works
- [ ] ICE candidates are forwarded correctly
- [ ] Media controls (mic, video, screen share) work
- [ ] Room join/leave events work
- [ ] Backward compatibility with old events
- [ ] Error handling for disconnected sockets
- [ ] Reconnection logic

---

## 🚀 Deployment Strategy

### Phase 1: Preparation (Week 1)
- [ ] Update frontend code with new events
- [ ] Add feature flag support
- [ ] Test in development environment
- [ ] Deploy to staging

### Phase 2: Gradual Rollout (Week 2)
- [ ] Enable feature flag for 10% users
- [ ] Monitor errors and performance
- [ ] Fix any issues
- [ ] Increase to 50%
- [ ] Monitor again
- [ ] Increase to 100%

### Phase 3: Cleanup (Week 3)
- [ ] Remove old event handlers
- [ ] Remove backward compatibility code
- [ ] Update documentation

---

## 📚 Reference

- Event Migration Map: `docs/after_refactor/EVENT_MIGRATION_MAP.md`
- Media Gateway Tests: `src/features/room-features/media/gateways/media.gateway.spec.ts`

---

**Last Updated:** 2025-12-01

