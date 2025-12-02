# 📊 PHÂN TÍCH CÁC THÀNH PHẦN TIÊU TỐN BĂNG THÔNG

**Date**: 2025-01-XX  
**Purpose**: Tổng hợp tất cả các thành phần cần monitor bandwidth trước khi implement

---

## ✅ ĐÃ MONITOR (Phase 1 & 2)

### 1. **Backend API Requests** ✅
- **Status**: ✅ Đã implement (Phase 1)
- **Method**: `MetricsMiddleware` capture HTTP requests/responses
- **Metrics**: Request size, Response size, Response time
- **Storage**: Redis → MySQL (hourly aggregation)

### 2. **WebRTC Peer Connections** ✅
- **Status**: ✅ Đã implement (Phase 2)
- **Method**: `RTCPeerConnection.getStats()` via Web Worker
- **Metrics**: Upload/Download bitrate, Latency, Packet loss, Jitter, TURN usage
- **Storage**: Redis (real-time) → Socket.IO broadcast to admin

---

## ❌ CHƯA MONITOR (Cần implement)

### 3. **YouTube Player Streaming** ❌
- **Status**: ❌ Chưa monitor
- **Impact**: ⚠️ **CAO** - YouTube streaming có thể tiêu tốn 1-10 Mbps/user
- **Method**: 
  - Sử dụng `Performance API` để track YouTube requests
  - Monitor `youtube.com` domain requests
  - Track video quality, bitrate, buffering
- **Metrics cần track**:
  - Download bitrate (kbps)
  - Video quality (144p, 240p, 360p, 480p, 720p, 1080p)
  - Buffering events
  - Total bytes downloaded
- **Priority**: 🔥 **HIGH** (User yêu cầu)

### 4. **File Upload/Download** ❌
- **Status**: ❌ Chưa monitor
- **Impact**: ⚠️ **TRUNG BÌNH** - Tùy thuộc vào file size
- **Method**:
  - Track `/api/v1/storage/upload` endpoint (đã có trong Phase 1 nhưng chưa tách riêng)
  - Track file download requests
  - Monitor pre-signed URL usage
- **Metrics cần track**:
  - Upload size per file
  - Download size per file
  - File type (image, video, PDF, etc.)
  - Upload/download speed
- **Priority**: 🟡 **MEDIUM**

### 5. **Screen Sharing (WebRTC)** ❌
- **Status**: ❌ Chưa tách riêng từ WebRTC monitoring
- **Impact**: ⚠️ **CAO** - Screen share có thể tiêu tốn 2-5 Mbps/user
- **Method**:
  - Tách screen share track từ WebRTC stats
  - Monitor riêng bandwidth cho screen share
- **Metrics cần track**:
  - Screen share upload bitrate
  - Screen share download bitrate (cho viewers)
  - Resolution (1080p, 720p, etc.)
- **Priority**: 🟡 **MEDIUM** (Có thể tách từ WebRTC monitoring hiện tại)

### 6. **LiveKit Video Streaming** ❌
- **Status**: ❌ Chưa monitor
- **Impact**: ⚠️ **CAO** - LiveKit có thể tiêu tốn 1-5 Mbps/user
- **Method**:
  - Sử dụng LiveKit SDK stats API
  - Monitor track bandwidth (camera, screen share, audio)
- **Metrics cần track**:
  - Upload/Download bitrate per track
  - Track type (camera, screen, audio)
  - Quality adaptation
- **Priority**: 🟡 **MEDIUM** (Nếu sử dụng LiveKit nhiều)

### 7. **Image/Media Loading** ❌
- **Status**: ❌ Chưa monitor
- **Impact**: ⚠️ **THẤP** - Nhưng có thể tích lũy
- **Method**:
  - Track image requests via `Performance API`
  - Monitor CDN resources
- **Metrics cần track**:
  - Total image bytes loaded
  - Image count per page
  - CDN bandwidth
- **Priority**: 🟢 **LOW**

### 8. **Chat Attachments** ❌
- **Status**: ❌ Chưa monitor
- **Impact**: ⚠️ **THẤP** - Thường là small files
- **Method**:
  - Track file upload trong chat
  - Monitor attachment downloads
- **Metrics cần track**:
  - Attachment size
  - Attachment type
- **Priority**: 🟢 **LOW**

### 9. **External CDN Resources** ❌
- **Status**: ❌ Chưa monitor
- **Impact**: ⚠️ **THẤP** - Fonts, CSS, JS từ CDN
- **Method**:
  - Track external resource requests
- **Metrics cần track**:
  - CDN bandwidth
  - Resource type
- **Priority**: 🟢 **LOW**

---

## 📋 TỔNG HỢP THEO ĐỘ ƯU TIÊN

### 🔥 **HIGH PRIORITY** (Cần implement ngay)
1. **YouTube Player Streaming** - User yêu cầu, impact cao

### 🟡 **MEDIUM PRIORITY** (Có thể implement sau)
2. **File Upload/Download** - Đã có trong Phase 1 nhưng chưa tách riêng
3. **Screen Sharing** - Có thể tách từ WebRTC monitoring
4. **LiveKit Video Streaming** - Nếu sử dụng nhiều

### 🟢 **LOW PRIORITY** (Có thể bỏ qua hoặc implement sau)
5. **Image/Media Loading**
6. **Chat Attachments**
7. **External CDN Resources**

---

## 🎯 ĐỀ XUẤT IMPLEMENTATION PLAN

### Phase 4: YouTube Player Monitoring (HIGH PRIORITY)
- **Timeline**: 1-2 ngày
- **Components**:
  1. Frontend: Performance API hook để track YouTube requests
  2. Frontend: YouTube player stats collector
  3. Backend: Extend `MeetingMetricsGateway` để nhận YouTube metrics
  4. Admin Dashboard: Hiển thị YouTube bandwidth per meeting

### Phase 5: File Upload/Download Monitoring (MEDIUM PRIORITY)
- **Timeline**: 1 ngày
- **Components**:
  1. Backend: Tách file upload/download từ Phase 1 metrics
  2. Admin Dashboard: Hiển thị file transfer stats

### Phase 6: Screen Sharing & LiveKit Monitoring (MEDIUM PRIORITY)
- **Timeline**: 1-2 ngày
- **Components**:
  1. Frontend: Tách screen share stats từ WebRTC
  2. Frontend: LiveKit stats collector (nếu cần)
  3. Admin Dashboard: Hiển thị screen share bandwidth

---

## 📊 METRICS STRUCTURE ĐỀ XUẤT

```typescript
interface ComprehensiveMetrics {
  // WebRTC (đã có)
  webrtc: {
    uploadBitrate: number;
    downloadBitrate: number;
    latency: number;
    packetLoss: number;
    usingRelay: boolean;
  };
  
  // YouTube (mới)
  youtube: {
    downloadBitrate: number;
    quality: string; // '144p' | '240p' | '360p' | '480p' | '720p' | '1080p'
    bufferingEvents: number;
    totalBytesDownloaded: number;
  };
  
  // Screen Share (mới)
  screenShare: {
    uploadBitrate: number;
    downloadBitrate: number;
    resolution: string;
  };
  
  // File Transfer (mới)
  fileTransfer: {
    uploadSize: number;
    downloadSize: number;
    fileType: string;
  };
  
  // LiveKit (mới, nếu cần)
  livekit: {
    uploadBitrate: number;
    downloadBitrate: number;
    trackType: string;
  };
}
```

---

## 🔧 TECHNICAL APPROACH

### YouTube Monitoring:
```javascript
// Sử dụng Performance API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('youtube.com') || entry.name.includes('googlevideo.com')) {
      // Track bandwidth
      const transferSize = entry.transferSize || 0;
      const duration = entry.duration || 0;
      const bitrate = (transferSize * 8) / (duration / 1000); // kbps
    }
  }
});
observer.observe({ entryTypes: ['resource'] });
```

### File Upload/Download:
- Đã có trong Phase 1 middleware
- Chỉ cần filter và aggregate riêng

### Screen Share:
- Tách từ WebRTC stats bằng cách check track source
- `track.source === 'screen'` hoặc `track.kind === 'video' && isScreenShare`

---

## ✅ NEXT STEPS

1. ✅ **Approve plan** - User xác nhận
2. 🔄 **Implement Phase 4** - YouTube Player Monitoring
3. 🔄 **Implement Phase 5** - File Upload/Download (nếu cần)
4. 🔄 **Implement Phase 6** - Screen Share & LiveKit (nếu cần)

