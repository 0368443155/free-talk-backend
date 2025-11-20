# Giải Thích: Bandwidth = 0 và Green Room vs Meeting Room

## 🎯 Vấn Đề

Bạn đúng! Bandwidth hiển thị **0 MB** vì:

1. ✅ LiveKit connection đã established
2. ❌ **NHƯNG không có media tracks (audio/video) được publish**
3. ❌ Green Room bị skip → không setup camera/mic

![Bandwidth Dashboard](file:///C:/Users/Admin/.gemini/antigravity/brain/74a1e29e-194e-42c3-ab85-2a365e48e765/uploaded_image_1763607041248.png)

![Current Meeting State](file:///C:/Users/Admin/.gemini/antigravity/brain/74a1e29e-194e-42c3-ab85-2a365e48e765/current_meeting_state_1763607063917.png)

---

## 📊 Green Room vs Meeting Room

### Green Room (Device Setup)
**Mục đích:** Setup và test camera/microphone TRƯỚC KHI join meeting

**Chức năng:**
- ✅ Preview camera feed
- ✅ Test microphone levels
- ✅ Select devices (camera, mic, speakers)
- ✅ Enable/disable video/audio
- ✅ Apply virtual backgrounds (optional)
- ✅ Click "Join Meeting" → transition to Meeting Room

**Code Flow:**
```typescript
// livekit-room-wrapper.tsx
const [phase, setPhase] = useState<'green-room' | 'waiting' | 'meeting'>('green-room');

// User sees Green Room first
{phase === 'green-room' && (
  <GreenRoom
    onJoinMeeting={handleJoinFromGreenRoom}
    onCancel={handleCancelFromGreenRoom}
    meetingTitle={meetingTitle}
  />
)}

// When user clicks "Join Meeting"
const handleJoinFromGreenRoom = async (settings: DeviceSettings) => {
  setDeviceSettings(settings); // Save camera/mic settings
  await fetchLiveKitToken(); // Get token and connect
};

// After LiveKit connects
function handleLiveKitConnected() {
  setPhase('meeting'); // Switch to Meeting Room
  
  // Apply device settings from Green Room
  if (deviceSettings) {
    enableCamera(deviceSettings.videoEnabled);
    enableMicrophone(deviceSettings.audioEnabled);
  }
}
```

### Meeting Room (Active Meeting)
**Mục đích:** Actual meeting với video/audio streaming

**Chức năng:**
- ✅ Display participant video tiles
- ✅ Real-time audio/video communication
- ✅ Screen sharing
- ✅ Chat
- ✅ Reactions
- ✅ Meeting controls

**Media Tracks:**
- **Audio Track:** Microphone input → LiveKit → Other participants
- **Video Track:** Camera feed → LiveKit → Other participants
- **Screen Track:** Screen share → LiveKit → Other participants

---

## ❌ Vấn Đề Hiện Tại

### Tại Sao Green Room Bị Skip?

Khi bạn navigate trực tiếp đến meeting URL, code có logic auto-join:

```typescript
// Có thể có logic như này trong meeting page
useEffect(() => {
  // Auto-join meeting khi page load
  joinMeeting(); // Skip Green Room
}, []);
```

### Kết Quả:
1. ❌ Green Room không hiển thị
2. ❌ `deviceSettings` = null
3. ❌ Camera/mic không được enable
4. ❌ Không có media tracks được publish
5. ❌ **Bandwidth = 0** (không có data transfer)

---

## ✅ Giải Pháp

### Option 1: Enable Camera/Mic Manually (Quick Fix)

Click vào các nút control ở meeting room:

1. **Turn on camera:**
   - Click nút "Turn off camera" (sẽ toggle thành "Turn on")
   - Camera sẽ start streaming
   - Bandwidth sẽ bắt đầu tăng

2. **Unmute microphone:**
   - Click nút "Mute microphone" (sẽ toggle thành "Unmute")
   - Audio sẽ start streaming
   - Bandwidth sẽ tăng thêm

**Expected Bandwidth After Enabling:**
- Video (720p): ~500-1500 KB/s
- Audio: ~50-100 KB/s
- Total: ~550-1600 KB/s

### Option 2: Fix Green Room Flow (Proper Solution)

Sửa code để luôn hiển thị Green Room trước:

```typescript
// meeting/[id]/page.tsx hoặc tương tự
export default function MeetingPage({ params }: { params: { id: string } }) {
  // Không auto-join, để LiveKitRoomWrapper handle flow
  return (
    <LiveKitRoomWrapper
      meetingId={params.id}
      user={user}
      onLeave={() => router.push('/dashboard')}
      isHost={isHost}
    />
  );
}
```

LiveKitRoomWrapper sẽ tự động:
1. Show Green Room first (phase = 'green-room')
2. User setup camera/mic
3. User click "Join Meeting"
4. Transition to Meeting Room với media enabled

### Option 3: Auto-Enable Media (Convenience)

Thêm logic auto-enable camera/mic khi join:

```typescript
function handleLiveKitConnected() {
  setPhase('meeting');
  
  // Auto-enable media nếu không có deviceSettings
  if (!deviceSettings) {
    // Enable camera và mic by default
    enableCamera(true);
    enableMicrophone(true);
  } else {
    // Apply settings từ Green Room
    enableCamera(deviceSettings.videoEnabled);
    enableMicrophone(deviceSettings.audioEnabled);
  }
}
```

---

## 🔍 Kiểm Tra Hiện Tại

### Console Logs Quan Trọng:
```
📊 [MEETING-ROOM] Bandwidth reporter status - isReporting: false
```

**Ý nghĩa:** Bandwidth reporter không active vì không có media tracks để monitor.

### DOM Elements:
- ✅ "Mute microphone" button [14]
- ✅ "Turn off camera" button [15]
- ✅ "Start screen share" button [16]

**Ý nghĩa:** Buttons hiển thị như camera/mic đang ON, nhưng thực tế chưa có tracks được publish.

---

## 🎬 Hướng Dẫn Test

### Test Ngay Bây Giờ:

1. **Ở meeting room hiện tại:**
   - Click nút camera (button [15])
   - Browser sẽ hỏi permission
   - Allow camera access
   - Video preview sẽ xuất hiện
   - **Bandwidth sẽ bắt đầu tăng**

2. **Click nút microphone (button [14]):**
   - Browser sẽ hỏi permission (nếu chưa)
   - Allow microphone access
   - Audio sẽ start streaming
   - **Bandwidth tăng thêm**

3. **Check LiveKit Dashboard:**
   - Refresh dashboard
   - Sẽ thấy:
     - Active tracks: 2 (video + audio)
     - Bandwidth usage: ~500-1500 KB/s
     - Participant: 1 (you)

### Test Với Green Room (Proper Flow):

1. **Logout và login lại**
2. **Tạo meeting mới**
3. **Join meeting** → Sẽ thấy Green Room
4. **Setup camera/mic trong Green Room**
5. **Click "Join Meeting"**
6. **Verify bandwidth ngay lập tức**

---

## 📊 Expected Bandwidth

### Với Video + Audio:
- **Outbound (Upload):**
  - Video 720p: 800-1200 KB/s
  - Audio: 50-100 KB/s
  - **Total: ~850-1300 KB/s**

- **Inbound (Download):**
  - Depends on other participants
  - 1 participant: ~850-1300 KB/s
  - 2 participants: ~1700-2600 KB/s

### Chỉ Audio (No Video):
- **Outbound:** 50-100 KB/s
- **Inbound:** 50-100 KB/s per participant

---

## 🎯 Kết Luận

**Vấn đề:** Green Room bị skip → Camera/mic không được enable → Bandwidth = 0

**Giải pháp nhanh:** Click camera/mic buttons trong meeting room

**Giải pháp đúng:** Fix flow để luôn hiển thị Green Room trước

Bạn muốn tôi:
1. ✅ Giúp enable camera/mic ngay trong meeting hiện tại?
2. ✅ Sửa code để Green Room luôn hiển thị?
3. ✅ Cả hai?
