# 🔍 YouTube Search & UI Redesign - Implementation Guide

## 🎯 Mục tiêu:

Redesign YouTube controls giống **free4talk.com**:
1. ✅ Move controls lên header (không còn trong player)
2. ✅ YouTube search modal (tìm kiếm trực tiếp)
3. ✅ Video suggestions/thumbnails
4. ✅ Compact UI

---

## 📋 Những gì đã tạo:

### 1. **YouTubeSearchModal Component**
File: `components/youtube-search-modal.tsx`

**Features:**
- Search bar với Enter support
- Grid layout video results
- Thumbnail + title + channel + duration + views
- Click để select video

**Props:**
```typescript
interface YouTubeSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectVideo: (videoId: string) => void;
}
```

### 2. **YouTubeControls Component**
File: `components/youtube-controls.tsx`

**Features:**
- Compact controls cho header
- Search button → Open modal
- Play/Pause (host only)
- Clear video (host only)
- Volume slider (all users)
- Divider giữa host controls và volume

---

## 🚀 Implementation Steps:

### **Step 1: Get YouTube Data API Key**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project hoặc select existing
3. Enable "YouTube Data API v3"
4. Create API Key (Credentials)
5. (Optional) Restrict key to your domain

**Save key vào `.env.local`:**
```bash
NEXT_PUBLIC_YOUTUBE_API_KEY=your_api_key_here
```

---

### **Step 2: Implement YouTube Search API**

Update `components/youtube-search-modal.tsx`:

```typescript
const handleSearch = async () => {
  if (!searchQuery.trim()) return;
  setIsSearching(true);

  try {
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&q=${encodeURIComponent(searchQuery)}&` +
      `type=video&maxResults=10&key=${API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.items) {
      // Get video details (duration, views)
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
      const detailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?` +
        `part=contentDetails,statistics&id=${videoIds}&key=${API_KEY}`
      );
      
      const detailsData = await detailsResponse.json();
      
      // Map results
      const results: YouTubeSearchResult[] = data.items.map((item: any, index: number) => {
        const details = detailsData.items[index];
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          channelTitle: item.snippet.channelTitle,
          duration: formatDuration(details.contentDetails.duration),
          viewCount: formatViews(details.statistics.viewCount),
        };
      });
      
      setSearchResults(results);
    }
  } catch (error) {
    console.error('YouTube search error:', error);
  } finally {
    setIsSearching(false);
  }
};

// Helper functions
function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = match?.[1]?.replace('H', '') || '0';
  const minutes = match?.[2]?.replace('M', '') || '0';
  const seconds = match?.[3]?.replace('S', '') || '0';
  
  if (hours !== '0') {
    return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.padStart(2, '0')}`;
}

function formatViews(count: string): string {
  const num = parseInt(count);
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B views`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K views`;
  return `${num} views`;
}
```

---

### **Step 3: Integrate Controls vào Meeting Room Header**

Update `section/meetings/meeting-room.tsx`:

**A. Import components:**
```typescript
import { YouTubeSearchModal } from "@/components/youtube-search-modal";
import { Search, Play, Pause, X, Volume2, VolumeX } from "lucide-react";
```

**B. Add state:**
```typescript
const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
const [youtubeVolume, setYoutubeVolume] = useState(50);
```

**C. Add YouTube controls to header:**

Tìm dòng có text `"YouTube Player (videoId)"` và replace header section với:

```tsx
<div className="bg-gray-800 px-4 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-700">
  <div className="flex items-center gap-4">
    <h1 className="text-base font-bold text-white">
      {meeting.title} - {onlineParticipantsCount} / {meeting.max_participants} participants
    </h1>
    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
  </div>
  
  {/* YouTube Controls */}
  <div className="flex items-center gap-3">
    {/* Host controls */}
    {isHost && (
      <>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowYouTubeSearch(true)}
          className="text-gray-300 hover:text-white"
          title="Search YouTube"
        >
          <Search className="w-4 h-4" />
        </Button>
        
        {meeting.youtube_video_id && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleYoutubeTogglePlay}
              className="text-gray-300 hover:text-white"
            >
              {meeting.youtube_is_playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleYoutubeClear}
              className="text-gray-300 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-4 bg-gray-700" />
          </>
        )}
      </>
    )}
    
    {/* Volume - all users */}
    {meeting.youtube_video_id && (
      <>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleYoutubeMute}
          className="text-gray-300 hover:text-white"
        >
          {youtubeVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Slider
          value={[youtubeVolume]}
          onValueChange={(v) => setYoutubeVolume(v[0])}
          max={100}
          className="w-24"
        />
        <span className="text-xs text-gray-300">{youtubeVolume}%</span>
      </>
    )}
  </div>
  
  {/* Right side - Participants/Chat/YouTube tabs */}
  <div className="flex items-center gap-2">
    {/* ... existing buttons ... */}
  </div>
</div>

{/* YouTube Search Modal */}
<YouTubeSearchModal
  open={showYouTubeSearch}
  onClose={() => setShowYouTubeSearch(false)}
  onSelectVideo={handleYoutubeSelectVideo}
/>
```

**D. Add handler functions:**

```typescript
const handleYoutubeSelectVideo = (videoId: string) => {
  if (!socket) return;
  
  // Update meeting state
  meeting.youtube_video_id = videoId;
  meeting.youtube_is_playing = true;
  meeting.youtube_current_time = 0;
  
  // Emit to server
  socket.emit("youtube:play", {
    videoId,
    currentTime: 0,
  });
};

const handleYoutubeTogglePlay = () => {
  if (!socket) return;
  
  const isPlaying = meeting.youtube_is_playing;
  meeting.youtube_is_playing = !isPlaying;
  
  if (isPlaying) {
    socket.emit("youtube:pause", { currentTime: meeting.youtube_current_time });
  } else {
    socket.emit("youtube:play", { videoId: meeting.youtube_video_id, currentTime: meeting.youtube_current_time });
  }
};

const handleYoutubeClear = () => {
  if (!socket) return;
  
  meeting.youtube_video_id = null;
  meeting.youtube_is_playing = false;
  meeting.youtube_current_time = 0;
  
  socket.emit("youtube:clear");
};

const handleYoutubeMute = () => {
  setYoutubeVolume(prev => prev > 0 ? 0 : 50);
};
```

---

### **Step 4: Simplify YouTubePlayer Component**

Update `youtube-player.tsx` để remove built-in controls và chỉ hiển thị player:

```tsx
// Remove CardHeader section completely
// Keep only video player div

return (
  <div className="aspect-video bg-black rounded overflow-hidden relative">
    <div ref={playerDivRef} className="w-full h-full" />
    
    {!playerRef.current && (
      <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
        Loading YouTube Player...
      </div>
    )}
    
    {/* Overlay for participants */}
    {!isHost && (
      <div 
        className="absolute inset-0 cursor-not-allowed z-10"
        style={{ pointerEvents: 'auto' }}
        title="Only host can control video"
      />
    )}
  </div>
);
```

---

## 🎨 UI Layout (Final):

```
┌────────────────────────────────────────────────────────────┐
│  Meeting Title - 3/6 participants                          │
│                                                             │
│  [🔍] [▶️] [✖️] | [🔊] ━━━━ 50%  [👥] [💬] [▶️]        │
│  YouTube Controls (Header)    Tabs →                       │
└────────────────────────────────────────────────────────────┘
│                                                             │
│                   Video Player                              │
│                   (No controls inside)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing:

### ✅ **Test 1: Search & Select Video**
1. Host click 🔍 (Search button)
2. Modal opens
3. Type "rick roll"
4. Press Enter
5. See search results
6. Click video → Video loads & plays

### ✅ **Test 2: Play/Pause from Header**
1. Host click ▶️/⏸️ in header
2. Video plays/pauses
3. All participants see sync

### ✅ **Test 3: Volume Control**
1. Any user drag volume slider in header
2. Volume changes locally
3. Not synced (each user controls own volume)

### ✅ **Test 4: Clear Video**
1. Host click ✖️ in header
2. Video clears for everyone
3. Header shows "Click search to add video"

---

## 🔑 API Key Security:

### **Best Practices:**

1. **Use server-side API calls** (recommended):
```typescript
// Create API route: app/api/youtube/search/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?` +
    `part=snippet&q=${query}&type=video&maxResults=10&` +
    `key=${process.env.YOUTUBE_API_KEY}`  // Server-side only
  );
  
  return Response.json(await response.json());
}

// Client calls:
const response = await fetch(`/api/youtube/search?q=${searchQuery}`);
```

2. **API Key Restrictions:**
- HTTP referrers: `your-domain.com/*`
- API restrictions: Only YouTube Data API v3
- Usage limits: Monitor quota

3. **Rate Limiting:**
- Default: 10,000 units/day
- Search: 100 units each
- Monitor usage in Cloud Console

---

## 📊 Comparison: Before vs After

| Feature | Before | After |
|---------|--------|-------|
| **Search** | Paste URL only | ✅ Direct search modal |
| **Controls Location** | Inside player | ✅ In header (compact) |
| **UI** | Separate card | ✅ Integrated header |
| **Search Results** | None | ✅ Thumbnails + info |
| **User Experience** | Multiple clicks | ✅ One-click search |

---

## ✅ Checklist:

- [ ] Get YouTube API key
- [ ] Add key to `.env.local`
- [ ] Implement search API call
- [ ] Add YouTubeSearchModal
- [ ] Move controls to header
- [ ] Test search functionality
- [ ] Test play/pause sync
- [ ] Test volume control
- [ ] Test clear video
- [ ] Test with multiple users

---

## 🚀 Next Steps:

1. **Get API Key** từ Google Cloud Console
2. **Implement search API** trong modal
3. **Update meeting-room header** với controls
4. **Test toàn bộ flow**

Sau khi có API key, tôi sẽ giúp bạn implement phần search API! 🎉
