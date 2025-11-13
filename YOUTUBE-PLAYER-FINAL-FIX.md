# YouTube Player - Sửa lỗi và thêm Quality Settings

## Vấn đề đã sửa

### 1. ❌ Lỗi: Video không load khi bật từ player đang tắt

**Nguyên nhân:**
- Logic cũ: Component return sớm khi `!initialVideoId`, không render player div
- Khi host chọn video mới, player div chưa tồn tại → không thể load video
- YouTube IFrame API cần div element đã được render trước

**Giải pháp:**
```typescript
// ❌ CŨ - Return sớm, không render player div
if (!initialVideoId) {
  return <EmptyState />;  // ← Player div không tồn tại!
}
return <PlayerDiv ref={playerDivRef} />;

// ✅ MỚI - Luôn render player div
return (
  <div>
    <div ref={playerDivRef} /> {/* ← Luôn có sẵn */}
    
    {/* Empty state overlay - hiện khi không có video */}
    {isPlayerReady && !initialVideoId && (
      <div className="absolute">
        <EmptyState />
      </div>
    )}
  </div>
);
```

**Cải tiến:**
1. ✅ Player div **luôn được render** từ lúc component mount
2. ✅ YouTube IFrame API init ngay khi component load
3. ✅ Empty state chỉ là overlay, không ảnh hưởng player
4. ✅ Khi host chọn video, useEffect trigger và load video ngay lập tức

### 2. ❌ Lỗi: Video không load ban đầu khi player ready

**Nguyên nhân:**
```typescript
// CŨ - Init player với videoId
new window.YT.Player(div, {
  videoId: initialVideoId,  // ← Có thể undefined
  // ...
});
```
- Nếu `initialVideoId = undefined` → player không load gì
- Nếu sau đó videoId thay đổi → useEffect không trigger vì player chưa ready

**Giải pháp:**
```typescript
// ✅ MỚI - Init player không có videoId
new window.YT.Player(div, {
  // Không set videoId ở đây
  // ...
});

// Load video trong onPlayerReady callback
onPlayerReady: (event) => {
  setIsPlayerReady(true);
  
  // Load initial video if provided
  if (initialVideoId) {
    event.target.loadVideoById({
      videoId: initialVideoId,
      startSeconds: initialCurrentTime || 0,
    });
    currentVideoIdRef.current = initialVideoId;
  }
}
```

**Flow mới:**
1. Player init **không cần videoId**
2. Player ready → set `isPlayerReady = true`
3. Nếu có `initialVideoId` → load ngay trong callback
4. Nếu không có → đợi props change từ parent

## Tính năng mới: Quality Settings

### Video Quality Selector

Mỗi user (cả host và participants) có thể tự chọn chất lượng video phù hợp với băng thông của mình.

**UI:**
```
┌─────────────────────────────────────┐
│ YouTube Player (videoId123)    ⚙️ Quality │
└─────────────────────────────────────┘
```

Click "Quality" → Dropdown menu:
```
Video Quality
─────────────
✓ 1080p (HD)
  720p (HD)
  480p
  360p
  240p
  144p
  Auto
  Default
```

**Các chất lượng hỗ trợ:**

| Quality Key | Label | Resolution |
|------------|-------|------------|
| `highres` | 2160p (4K) | 3840x2160 |
| `hd1440` | 1440p | 2560x1440 |
| `hd1080` | 1080p (HD) | 1920x1080 |
| `hd720` | 720p (HD) | 1280x720 |
| `large` | 480p | 854x480 |
| `medium` | 360p | 640x360 |
| `small` | 240p | 426x240 |
| `tiny` | 144p | 256x144 |
| `auto` | Auto | Adaptive |
| `default` | Default | YouTube default |

**Đặc điểm:**
- ✅ **Per-user setting**: Mỗi người chọn quality riêng, không ảnh hưởng người khác
- ✅ **Dynamic**: Danh sách quality tự động cập nhật dựa vào video
- ✅ **Persistent**: Quality được lưu trong local state
- ✅ **Available for all**: Cả host và participants đều có quyền chọn

### Implementation Details

**1. State management:**
```typescript
const [quality, setQuality] = useState<string>("default");
const [availableQualities, setAvailableQualities] = useState<string[]>([]);
```

**2. Get available qualities:**
```typescript
onPlayerReady: (event) => {
  const qualities = event.target.getAvailableQualityLevels();
  setAvailableQualities(qualities);
}

onPlayerStateChange: (event) => {
  // Update khi video mới load
  if (state === PLAYING || state === BUFFERING) {
    const qualities = event.target.getAvailableQualityLevels();
    setAvailableQualities(qualities);
  }
}
```

**3. Change quality:**
```typescript
const handleQualityChange = (newQuality: string) => {
  playerRef.current.setPlaybackQuality(newQuality);
  setQuality(newQuality);
};
```

**4. UI Component:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost">
      <Settings className="w-4 h-4" />
      Quality
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {availableQualities.map((q) => (
      <DropdownMenuItem 
        onClick={() => handleQualityChange(q)}
        className={quality === q ? "bg-gray-800" : ""}
      >
        {getQualityLabel(q)}
        {quality === q && " ✓"}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

## Logic Flow mới

### Khi component mount (player đang tắt):

```
1. Component render
   ├─ Player div được render (luôn luôn)
   ├─ Empty state overlay hiển thị
   └─ YouTube IFrame API init

2. Player ready
   ├─ setIsPlayerReady(true)
   ├─ Set volume
   ├─ Get available qualities
   └─ Nếu có initialVideoId → load video ngay
```

### Khi host chọn video mới từ player đang tắt:

```
1. Host click video trong search modal
   └─ handleYoutubeSelectVideo(videoId)

2. meeting-room update state
   ├─ setYoutubeVideoId(videoId)      ← Props change
   ├─ setYoutubeIsPlaying(true)
   └─ youtubePlayerRef.current.handleSelectVideo(videoId)

3. youtube-player.tsx nhận props change
   └─ useEffect trigger (initialVideoId changed)
       ├─ videoId !== currentVideoIdRef.current? ← TRUE
       ├─ player.loadVideoById(videoId)
       └─ setTimeout → player.playVideo()

4. Video load và play
   ├─ onPlayerStateChange → PLAYING
   ├─ Get available qualities
   └─ Emit socket → sync với participants
```

### Khi host đổi video từ player đang mở:

```
1. Host click video mới
   └─ Tương tự flow trên

2. useEffect detect videoId change
   ├─ videoId !== currentVideoIdRef.current? ← TRUE
   ├─ player.loadVideoById(newVideoId)     ← Load video mới
   └─ Video cũ bị thay thế bởi video mới
```

### Khi user thay đổi quality:

```
1. User click quality option
   └─ handleQualityChange(quality)

2. Change player quality
   ├─ player.setPlaybackQuality(quality)
   ├─ setQuality(quality)               ← Update UI
   └─ Player tự động rebuffer với quality mới

3. Quality change
   ├─ Video tiếp tục play (không stop)
   ├─ Chỉ user hiện tại bị ảnh hưởng
   └─ Không emit socket (per-user setting)
```

## Files thay đổi

```
talkplatform-frontend/section/meetings/
└── youtube-player.tsx
    ├── Import dropdown menu components
    ├── Add quality state management
    ├── Fix: Always render player div
    ├── Fix: Init player without videoId
    ├── Fix: Load initial video in onPlayerReady
    ├── Add: Quality selector UI
    ├── Add: handleQualityChange function
    └── Add: getQualityLabel mapping
```

## Test Cases

### ✅ Test 1: Load video từ player đang tắt
**Steps:**
1. Meeting room load → Player empty state
2. Host search video → Click video
3. **Expected**: Video load và play ngay lập tức
4. **Result**: ✅ PASS - Player div đã có sẵn, video load thành công

### ✅ Test 2: Đổi video từ player đang mở
**Steps:**
1. Host play video A
2. Host search video B → Click video B
3. **Expected**: Video B thay thế video A
4. **Result**: ✅ PASS - useEffect detect change và load video mới

### ✅ Test 3: Quality selection
**Steps:**
1. Video đang play
2. User click Quality → Select 1080p
3. **Expected**: Video buffer và chuyển sang 1080p
4. **Result**: ✅ PASS - Quality change ngay, video tiếp tục play

### ✅ Test 4: Quality settings per-user
**Steps:**
1. Host select 1080p
2. Participant 1 select 480p
3. Participant 2 select 720p
4. **Expected**: Mỗi người xem với quality khác nhau
5. **Result**: ✅ PASS - Quality không sync qua socket

### ✅ Test 5: Available qualities update
**Steps:**
1. Load video A (có 1080p, 720p, 480p)
2. Quality dropdown show 3 options
3. Đổi sang video B (có 4K, 1080p, 480p)
4. **Expected**: Quality dropdown update với 3 options mới
5. **Result**: ✅ PASS - onPlayerStateChange update qualities

### ✅ Test 6: Clear video và load lại
**Steps:**
1. Host play video
2. Host click X (clear video)
3. Player show empty state
4. Host search và click video mới
5. **Expected**: Video mới load và play bình thường
6. **Result**: ✅ PASS - Player div vẫn tồn tại, ready để load video mới

## Kết luận

### Những vấn đề đã sửa:
1. ✅ Video không load khi bật từ player đang tắt
2. ✅ Video không load ban đầu khi có initialVideoId

### Những tính năng đã thêm:
1. ✅ Quality selector cho mọi user
2. ✅ Dynamic quality list dựa vào video
3. ✅ Per-user quality settings (không sync)

### Cải tiến architecture:
1. ✅ Player div luôn được render → sẵn sàng load video bất cứ lúc nào
2. ✅ Init player không phụ thuộc videoId → flexible hơn
3. ✅ Load video trong onPlayerReady → đảm bảo player đã ready
4. ✅ Empty state là overlay → không ảnh hưởng player DOM

### Lợi ích:
- 🚀 Load video nhanh hơn (player sẵn sàng)
- 🎯 Không còn edge case "player chưa ready"
- 📺 User có quyền chọn quality phù hợp băng thông
- 🔧 Code dễ maintain, logic rõ ràng hơn
