# USE-WEBRTC-V2 FIX SUMMARY

> **Date:** 2025-12-08  
> **Status:** 🔴 CRITICAL - File corrupted, needs manual fix

---

## ❌ VẤN ĐỀ PHÁT HIỆN

### 1. Missing Auto-Start Logic
- `use-webrtc-v2.ts` không tự động start local stream khi `isOnline = true`
- Hook cũ có logic này → Đã thêm vào (✅ FIXED)

### 2. Missing WebRTC Signaling Handlers (CRITICAL!)
- ❌ Không có `media:offer` handler
- ❌ Không có `media:answer` handler
- ❌ Không có `media:ice-candidate` handler
- **Kết quả:** Peers không thể kết nối với nhau!

### 3. File Corruption
- Khi thêm handlers, file bị corrupt
- Syntax errors tại lines 679-686
- `handleIceCandidate` function bị thiếu

---

## ✅ GIẢI PHÁP

### Option 1: QUICK FIX - Revert về use-webrtc.ts (RECOMMENDED)

**File:** `meeting-room.tsx` line 24

```typescript
// BEFORE (broken):
import { useWebRTCV2 as useWebRTC } from "@/hooks/use-webrtc-v2";

// AFTER (working):
import { useWebRTC } from "@/hooks/use-webrtc";
```

**Lý do:**
- Hook cũ đã hoạt động tốt
- use-webrtc-v2 bị corrupt
- Quick fix để meeting room hoạt động ngay

---

### Option 2: FIX use-webrtc-v2.ts (PROPER)

**Cần thêm vào `use-webrtc-v2.ts` (sau line 650):**

```typescript
// Handle incoming ICE candidate from remote peer
const handleIceCandidate = async (data: { fromUserId: string; roomId: string; candidate: RTCIceCandidateInit }) => {
  if (!peerConnectionManagerRef.current) return;
  
  try {
    await peerConnectionManagerRef.current.handleRemoteIceCandidate(data.fromUserId, data.candidate);
  } catch (error: any) {
    console.error(`❌ [useWebRTCV2] Failed to add ICE candidate from ${data.fromUserId}:`, error);
  }
};

// Register socket event listeners
socket.on('media:peer-ready', handlePeerReady);
socket.on('meeting:user-joined', handleUserJoined);
socket.on('meeting:user-left', handleUserLeft);

// 🔥 CRITICAL: Register WebRTC signaling handlers
socket.on('media:offer', handleOffer);
socket.on('media:answer', handleAnswer);
socket.on('media:ice-candidate', handleIceCandidate);

// Request existing peers when we join
socket.emit('meeting:request-peers');

return () => {
  socket.off('media:peer-ready', handlePeerReady);
  socket.off('meeting:user-joined', handleUserJoined);
  socket.off('meeting:user-left', handleUserLeft);
  socket.off('media:offer', handleOffer);
  socket.off('media:answer', handleAnswer);
  socket.off('media:ice-candidate', handleIceCandidate);
};
```

**Vị trí:** Thay thế lines 679-698 (phần bị corrupt)

---

## 🚨 IMMEDIATE ACTION

### Bước 1: Revert use-webrtc-v2.ts về version sạch

```bash
cd talkplatform-frontend
git checkout hooks/use-webrtc-v2.ts
```

### Bước 2: Chọn 1 trong 2 options

**Option A (Quick - 1 phút):**
- Sửa `meeting-room.tsx` line 24
- Import `useWebRTC` từ `use-webrtc.ts`
- Test ngay

**Option B (Proper - 10 phút):**
- Sửa `use-webrtc-v2.ts` theo hướng dẫn trên
- Thêm đúng 3 handlers
- Test kỹ

---

## 📋 CHECKLIST

### Quick Fix (Option A)
- [ ] Revert use-webrtc-v2.ts
- [ ] Sửa meeting-room.tsx import
- [ ] Test meeting room
- [ ] Verify mic/camera/screen share works

### Proper Fix (Option B)
- [ ] Revert use-webrtc-v2.ts
- [ ] Thêm handleIceCandidate function
- [ ] Register 3 socket handlers
- [ ] Test meeting room
- [ ] Verify WebRTC connection
- [ ] Check console logs

---

## 🔍 TESTING

### Sau khi fix, kiểm tra:

1. **Local stream:**
   - Console log: "🎥 [useWebRTCV2] Auto-starting local stream"
   - Video grid hiển thị camera của bạn

2. **Peer connection:**
   - Console log: "📨 [useWebRTCV2] Received offer from..."
   - Console log: "✅ [useWebRTCV2] Processed offer from..."
   - Video của peer hiển thị

3. **Controls:**
   - Toggle mic → Console log mic state change
   - Toggle camera → Console log camera state change
   - Screen share → Console log screen share

---

**Recommendation:** 
- **NOW:** Option A (Quick fix) để meeting hoạt động
- **LATER:** Option B (Proper fix) khi có thời gian test kỹ

**Status:** Waiting for action
