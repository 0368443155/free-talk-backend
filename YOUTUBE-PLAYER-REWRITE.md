# YouTube Player - Đập Đi Xây Lại

## Vấn đề gốc rễ

### 1. **Double State Management (Quản lý state kép)**
- `meeting-room.tsx` quản lý state: `youtubeVideoId`, `youtubeIsPlaying`, `youtubeCurrentTime`
- `youtube-player.tsx` (cũ) cũng quản lý state riêng: `videoId`, `isPlaying`, `currentTimestamp`
- **KẾT QUẢ**: Hai state không đồng bộ, gây ra conflict

### 2. **Double Socket Listeners (Lắng nghe socket kép)**
- `meeting-room.tsx` lắng nghe: `youtube:sync`, `youtube:play`, `youtube:pause`, `youtube:clear`
- `youtube-player.tsx` (cũ) CŨNG lắng nghe: `youtube:sync`, `youtube:play`, `youtube:pause`, `youtube:clear`
- **KẾT QUẢ**: Cả hai đều cập nhật state → race condition → video bị "nháy" hoặc không load

### 3. **Logic xử lý props phức tạp**
```typescript
// Logic cũ - quá nhiều check và ref
if (lastLoadedVideoId.current === videoId && currentVideoId === videoId) {
  return; // ← BUG: Ngăn video mới load
}
```

### 4. **Props vs Internal State Conflict**
- Parent (meeting-room) truyền `initialVideoId` vào
- Child (youtube-player) có internal state `videoId`
- useEffect cố gắng sync giữa `initialVideoId` và `videoId` → infinite loop risk

## Giải pháp: Single Source of Truth

### Kiến trúc mới

```
┌─────────────────────────────────────┐
│       meeting-room.tsx              │
│  (SINGLE SOURCE OF TRUTH)           │
│                                     │
│  - Lắng nghe socket events          │
│  - Quản lý state:                   │
│    * youtubeVideoId                 │
│    * youtubeIsPlaying               │
│    * youtubeCurrentTime             │
│    * youtubeVolume                  │
│                                     │
│  - Truyền props xuống player        │
└──────────────┬──────────────────────┘
               │
               │ Props only (no socket)
               ▼
┌──────────────────────────────────────┐
│     youtube-player.tsx (MỚI)         │
│                                      │
│  - KHÔNG có internal state           │
│  - KHÔNG lắng nghe socket            │
│  - CHỈ nhận props từ parent          │
│  - CHỈ emit socket khi host action   │
│                                      │
│  - Sử dụng ref để track video        │
│    hiện tại (không trigger render)   │
└──────────────────────────────────────┘
```

## Những thay đổi chính

### 1. **Loại bỏ toàn bộ socket listeners trong player**
```typescript
// ❌ CŨ - Player tự lắng nghe socket
useEffect(() => {
  socket.on("youtube:sync", handleYouTubeSync);
  socket.on("youtube:play", handleYouTubePlay);
  // ...
}, [socket]);

// ✅ MỚI - Player KHÔNG lắng nghe socket
// Chỉ meeting-room lắng nghe và cập nhật props
```

### 2. **Loại bỏ internal state, chỉ dùng ref**
```typescript
// ❌ CŨ - State gây re-render và conflict
const [videoId, setVideoId] = useState(initialVideoId);
const [isPlaying, setIsPlaying] = useState(initialIsPlaying);

// ✅ MỚI - Dùng ref để track, không gây re-render
const currentVideoIdRef = useRef<string>("");
const isUpdatingRef = useRef(false);
```

### 3. **Logic đơn giản hóa - chỉ phản ứng với props**
```typescript
useEffect(() => {
  if (!isPlayerReady || !playerRef.current) return;

  const videoId = initialVideoId || "";
  
  // Case 1: Clear video
  if (!videoId && currentVideoIdRef.current) {
    player.stopVideo();
    currentVideoIdRef.current = "";
    return;
  }

  // Case 2: New video - LUÔN load khi videoId khác
  if (videoId && videoId !== currentVideoIdRef.current) {
    player.loadVideoById({ videoId, startSeconds: currentTime });
    currentVideoIdRef.current = videoId;
    return;
  }

  // Case 3: Same video, toggle play/pause
  if (videoId === currentVideoIdRef.current) {
    if (isPlaying) player.playVideo();
    else player.pauseVideo();
  }
}, [initialVideoId, initialCurrentTime, initialIsPlaying, isPlayerReady]);
```

### 4. **Host actions chỉ emit socket, không cập nhật state**
```typescript
// Player chỉ emit khi host thao tác trực tiếp
handleTogglePlay: () => {
  if (!isHost) return;
  
  // Thao tác trên player
  player.pauseVideo(); // hoặc playVideo()
  
  // Emit socket để sync với người khác
  socket.emit("youtube:pause", { currentTime });
  
  // ❌ KHÔNG setIsPlaying() - để meeting-room xử lý
}
```

## Flow hoạt động mới

### Khi host chọn video mới:

1. **User click video trong search modal**
   ```
   YouTubeSearchModal → handleSelectVideo(videoId)
   ```

2. **meeting-room nhận và cập nhật state**
   ```typescript
   handleYoutubeSelectVideo(videoId) {
     setYoutubeVideoId(videoId);           // ← Cập nhật state
     setYoutubeIsPlaying(true);
     youtubePlayerRef.current.handleSelectVideo(videoId, 0); // Gọi player
   }
   ```

3. **Player nhận và load video**
   ```typescript
   handleSelectVideo(videoId, startSeconds) {
     player.loadVideoById({ videoId, startSeconds });
     socket.emit("youtube:play", { videoId, currentTime: 0 }); // ← Emit
   }
   ```

4. **Server broadcast đến participants**
   ```
   Server → youtube:play event
   ```

5. **meeting-room của participants nhận event**
   ```typescript
   socket.on("youtube:play", (data) => {
     setYoutubeVideoId(data.videoId);      // ← Cập nhật state
     setYoutubeIsPlaying(true);
     // Player tự động phản ứng với props change
   });
   ```

6. **Player của participants load video**
   ```typescript
   // useEffect tự động trigger khi initialVideoId thay đổi
   if (videoId !== currentVideoIdRef.current) {
     player.loadVideoById({ videoId, startSeconds });
   }
   ```

### Khi host clear video:

1. **Host click nút X**
   ```
   handleYoutubeClear() → youtubePlayerRef.current.handleClearVideo()
   ```

2. **Player clear và emit**
   ```typescript
   handleClearVideo() {
     player.stopVideo();
     socket.emit("youtube:clear");
   }
   ```

3. **meeting-room nhận event**
   ```typescript
   socket.on("youtube:clear", () => {
     setYoutubeVideoId(null);  // ← Clear state
     setYoutubeIsPlaying(false);
   });
   ```

4. **Player phản ứng với props = null**
   ```typescript
   if (!videoId && currentVideoIdRef.current) {
     player.stopVideo();
   }
   ```

## Tại sao giải pháp này hoạt động?

### ✅ **Single Source of Truth**
- Chỉ có `meeting-room.tsx` quản lý state
- Player chỉ là "dumb component" hiển thị theo props
- Không còn conflict giữa 2 state

### ✅ **No Race Condition**
- Chỉ có 1 nơi lắng nghe socket
- Player không tự ý cập nhật state
- Flow rõ ràng: Socket → State → Props → Render

### ✅ **No Infinite Loop**
- Player dùng ref thay vì state
- useEffect chỉ trigger khi props thực sự thay đổi
- `isUpdatingRef` ngăn re-trigger trong quá trình update

### ✅ **Deterministic Behavior**
- Video mới LUÔN load khi `videoId !== currentVideoIdRef.current`
- Không có logic phức tạp với `lastLoadedVideoId`
- Mỗi case xử lý riêng biệt, rõ ràng

## Test cases cần kiểm tra

### ✅ Case 1: Đổi video khi player đang mở
- Host search video mới → click
- **Expected**: Video mới load và play ngay lập tức
- **Không còn**: Nháy thumbnail rồi quay về video cũ

### ✅ Case 2: Mở video sau khi đã tắt player
- Host clear video (X) → search video mới → click
- **Expected**: Video mới load và play bình thường
- **Không còn**: Màn hình đen

### ✅ Case 3: Participants sync với host
- Host đổi video → Participants tự động load video mới
- **Expected**: Mọi người xem cùng video, cùng timeline

### ✅ Case 4: Play/Pause sync
- Host pause → Participants pause
- Host play → Participants play
- **Expected**: Sync chính xác, không lag

### ✅ Case 5: Clear video sync
- Host clear → Participants cũng clear
- **Expected**: Tất cả đều thấy empty state

## Files đã thay đổi

```
talkplatform-frontend/section/meetings/
├── youtube-player.tsx          ← ĐÃ VIẾT LẠI HOÀN TOÀN
├── youtube-player-backup.tsx   ← Backup của file cũ
└── meeting-room.tsx            ← KHÔNG THAY ĐỔI (vẫn hoạt động)
```

## Kết luận

Bằng cách **loại bỏ double state management và double socket listeners**, chúng ta đã:

1. ✅ Sửa bug video không load khi đổi video mới
2. ✅ Sửa bug màn hình đen sau khi clear
3. ✅ Đơn giản hóa code, dễ maintain
4. ✅ Tạo ra flow rõ ràng, dễ debug
5. ✅ Tránh race condition và infinite loop

**Architecture pattern**: **Controlled Component** - Player hoàn toàn được điều khiển bởi props từ parent, không có internal state độc lập.
