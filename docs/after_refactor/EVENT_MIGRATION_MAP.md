# Event Migration Mapping

**Ngày tạo:** 2025-12-01  
**Mục đích:** Mapping các events từ old gateway sang new modular gateways

---

## 📋 Tổng Quan

| Old Event | New Gateway | New Event | Status | Priority |
|-----------|-------------|-----------|--------|----------|
| `meeting:join` | UnifiedRoomGateway | `room:join` | ✅ DONE | - |
| `meeting:leave` | UnifiedRoomGateway | `room:leave` | ✅ DONE | - |
| `meeting:request-peers` | UnifiedRoomGateway | `room:request-peers` | ⏳ TODO | Medium |
| `webrtc:offer` | MediaGateway | `media:offer` | ⏳ TODO | High |
| `webrtc:answer` | MediaGateway | `media:answer` | ⏳ TODO | High |
| `webrtc:ice-candidate` | MediaGateway | `media:ice-candidate` | ⏳ TODO | High |
| `webrtc:ready` | MediaGateway | `media:ready` | ⏳ TODO | Medium |
| `media:toggle-mic` | MediaGateway | `media:toggle-mic` | ✅ DONE | - |
| `media:toggle-video` | MediaGateway | `media:toggle-video` | ✅ DONE | - |
| `media:screen-share` | MediaGateway | `media:screen-share` | ✅ DONE | - |
| `admin:mute-user` | MediaGateway | `admin:mute-user` | ✅ DONE | - |
| `admin:video-off-user` | MediaGateway | `admin:video-off-user` | ✅ DONE | - |
| `admin:stop-share-user` | MediaGateway | `admin:stop-share-user` | ✅ DONE | - |
| `admin:kick-user` | ModerationGateway | `moderation:kick` | ⏳ TODO | High |
| `admin:block-user` | ModerationGateway | `moderation:block` | ⏳ TODO | High |
| `chat:message` | ChatGateway | `chat:send` | ✅ DONE | - |
| `youtube:play` | YoutubeSyncGateway | `youtube:play` | ⏳ TODO | Medium |
| `youtube:pause` | YoutubeSyncGateway | `youtube:pause` | ⏳ TODO | Medium |
| `youtube:seek` | YoutubeSyncGateway | `youtube:seek` | ⏳ TODO | Medium |
| `youtube:clear` | YoutubeSyncGateway | `youtube:clear` | ⏳ TODO | Low |
| `hand:raise` | HandRaiseGateway | `hand:raise` | ✅ DONE | - |
| `hand:lower` | HandRaiseGateway | `hand:lower` | ✅ DONE | - |

---

## 🔴 High Priority - WebRTC Signaling Events

### 1. `webrtc:offer` → `media:offer`

**Old Implementation:**
```typescript
@SubscribeMessage('webrtc:offer')
handleWebRTCOffer(
  @ConnectedSocket() client: SocketWithUser,
  @MessageBody() data: { targetUserId: string; offer: any },
)
```

**New Implementation:**
- Gateway: `MediaGateway`
- Event: `media:offer`
- Payload: `{ roomId: string; targetUserId: string; offer: RTCSessionDescriptionInit }`

**Migration Notes:**
- Need to add `roomId` to payload
- Use `BaseRoomGateway` methods for user socket mapping
- Validate room access before forwarding

---

### 2. `webrtc:answer` → `media:answer`

**Old Implementation:**
```typescript
@SubscribeMessage('webrtc:answer')
handleWebRTCAnswer(
  @ConnectedSocket() client: SocketWithUser,
  @MessageBody() data: { targetUserId: string; answer: any },
)
```

**New Implementation:**
- Gateway: `MediaGateway`
- Event: `media:answer`
- Payload: `{ roomId: string; targetUserId: string; answer: RTCSessionDescriptionInit }`

---

### 3. `webrtc:ice-candidate` → `media:ice-candidate`

**Old Implementation:**
```typescript
@SubscribeMessage('webrtc:ice-candidate')
handleWebRTCIceCandidate(
  @ConnectedSocket() client: SocketWithUser,
  @MessageBody() data: { targetUserId: string; candidate: any },
)
```

**New Implementation:**
- Gateway: `MediaGateway`
- Event: `media:ice-candidate`
- Payload: `{ roomId: string; targetUserId: string; candidate: RTCIceCandidateInit }`

---

## 🟡 Medium Priority - YouTube Sync Events

### 4. `youtube:play` → `youtube:play`

**Old Implementation:**
```typescript
@SubscribeMessage('youtube:play')
handleYoutubePlay(
  @ConnectedSocket() client: SocketWithUser,
  @MessageBody() data: { videoId: string; currentTime?: number },
)
```

**New Implementation:**
- Gateway: `YoutubeSyncGateway`
- Event: `youtube:play`
- Payload: `{ roomId: string; videoId: string; currentTime?: number }`

---

### 5. `youtube:pause` → `youtube:pause`

**Old Implementation:**
```typescript
@SubscribeMessage('youtube:pause')
handleYoutubePause(
  @ConnectedSocket() client: SocketWithUser,
  @MessageBody() data: { currentTime: number },
)
```

**New Implementation:**
- Gateway: `YoutubeSyncGateway`
- Event: `youtube:pause`
- Payload: `{ roomId: string; currentTime: number }`

---

### 6. `youtube:seek` → `youtube:seek`

**Old Implementation:**
```typescript
@SubscribeMessage('youtube:seek')
handleYoutubeSeek(
  @ConnectedSocket() client: SocketWithUser,
  @MessageBody() data: { currentTime: number },
)
```

**New Implementation:**
- Gateway: `YoutubeSyncGateway`
- Event: `youtube:seek`
- Payload: `{ roomId: string; currentTime: number }`

---

## 🟢 Low Priority - Other Events

### 7. `youtube:clear` → `youtube:clear`

**Old Implementation:**
```typescript
@SubscribeMessage('youtube:clear')
handleYoutubeClear(@ConnectedSocket() client: SocketWithUser)
```

**New Implementation:**
- Gateway: `YoutubeSyncGateway`
- Event: `youtube:clear`
- Payload: `{ roomId: string }`

---

### 8. `meeting:request-peers` → `room:request-peers`

**Old Implementation:**
```typescript
@SubscribeMessage('meeting:request-peers')
handleRequestPeers(@ConnectedSocket() client: SocketWithUser)
```

**New Implementation:**
- Gateway: `UnifiedRoomGateway`
- Event: `room:request-peers`
- Payload: `{ roomId: string }`

---

## ✅ Completed Events

Các events sau đã được migrate và hoạt động trong new gateway:

1. ✅ `media:toggle-mic` - MediaGateway
2. ✅ `media:toggle-video` - MediaGateway
3. ✅ `media:screen-share` - MediaGateway
4. ✅ `admin:mute-user` - MediaGateway
5. ✅ `admin:video-off-user` - MediaGateway
6. ✅ `admin:stop-share-user` - MediaGateway
7. ✅ `chat:message` - ChatGateway
8. ✅ `hand:raise` - HandRaiseGateway
9. ✅ `hand:lower` - HandRaiseGateway
10. ✅ `room:join` - UnifiedRoomGateway
11. ✅ `room:leave` - UnifiedRoomGateway

---

## 📝 Migration Checklist

### Phase 1: WebRTC Signaling (Week 1, Days 1-3)
- [ ] Implement `media:offer` in MediaGateway
- [ ] Implement `media:answer` in MediaGateway
- [ ] Implement `media:ice-candidate` in MediaGateway
- [ ] Implement `media:ready` in MediaGateway
- [ ] Write unit tests
- [ ] Write integration tests

### Phase 2: Moderation Events (Week 1, Days 4-5)
- [ ] Verify `moderation:kick` in ModerationGateway
- [ ] Verify `moderation:block` in ModerationGateway
- [ ] Add missing functionality if needed

### Phase 3: YouTube Sync (Week 1, Days 6-7)
- [ ] Verify `youtube:play` in YoutubeSyncGateway
- [ ] Verify `youtube:pause` in YoutubeSyncGateway
- [ ] Verify `youtube:seek` in YoutubeSyncGateway
- [ ] Implement `youtube:clear` if missing

### Phase 4: Testing & Deployment (Week 2)
- [ ] End-to-end testing
- [ ] Frontend update
- [ ] Gradual rollout
- [ ] Deprecate old gateway

---

## 🔄 Backward Compatibility

Để đảm bảo zero downtime, old gateway sẽ hỗ trợ cả old và new events trong thời gian transition:

```typescript
// Old gateway - backward compatible
@SubscribeMessage('webrtc:offer')
async handleWebRTCOffer(...) {
  // Forward to new gateway if enabled
  if (await this.featureFlagService.isEnabled('use_new_gateway')) {
    return this.mediaGateway.handleOffer(...);
  }
  // Old implementation
}
```

---

**Last Updated:** 2025-12-01


