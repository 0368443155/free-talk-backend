# CHIẾN LƯỢC CẢI THIỆN MEETING ROOM - PHÂN TÍCH CHI TIẾT

## 📋 MỤC LỤC

1. [Tổng quan vấn đề](#tổng-quan-vấn-đề)
2. [Phân tích chi tiết từng chức năng](#phân-tích-chi-tiết-từng-chức-năng)
3. [Chiến lược cải thiện](#chiến-lược-cải-thiện)
4. [Implementation Plan](#implementation-plan)
5. [Testing Strategy](#testing-strategy)

---

## 🎯 TỔNG QUAN VẤN ĐỀ

### Các vấn đề chính được xác định:

1. **Microphone & Camera:**
   - ❌ Duplicate permission requests
   - ❌ State sync không nhất quán giữa database và LiveKit
   - ❌ Stream reuse từ green-room không ổn định
   - ❌ Track enable/disable logic phức tạp với nhiều fallback

2. **Screen Sharing:**
   - ❌ Logic replace vs add track không rõ ràng
   - ❌ Cleanup không đầy đủ khi stop screen share
   - ❌ Không có proper error handling cho browser compatibility

3. **Layout:**
   - ❌ Không có responsive layout switching
   - ❌ Grid vs Spotlight mode chưa được implement đầy đủ
   - ❌ Video grid performance issues với nhiều participants

4. **Chat:**
   - ❌ Duplicate message handling (Socket.IO + LiveKit data channel)
   - ❌ Message ordering issues
   - ❌ Performance với nhiều messages

5. **User Management:**
   - ❌ Duplicate event handling
   - ❌ State sync issues giữa host actions và participant state
   - ❌ Race conditions trong moderation actions

---

## 🔍 PHÂN TÍCH CHI TIẾT TỪNG CHỨC NĂNG

### 1. MICROPHONE & CAMERA

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/hooks/use-livekit.ts`

```typescript
// Vấn đề 1: Logic enableCamera quá phức tạp với nhiều fallback
const enableCamera = useCallback(async (enabled: boolean, deviceId?: string) => {
  // Check if track exists
  // Try setEnabled
  // Fallback: unpublish and create new
  // Fallback: create new track
  // Multiple setTimeout calls
}, []);
```

**Vấn đề:**
- ❌ Có 3-4 layers of fallback logic
- ❌ Không có proper error recovery
- ❌ State updates không đồng bộ
- ❌ Race conditions khi toggle nhanh

**File:** `talkplatform-frontend/components/meeting/livekit-room-wrapper.tsx`

```typescript
// Vấn đề 2: Stream reuse từ green-room không ổn định
if (deviceSettings?.mediaStream) {
  const stream = deviceSettings.mediaStream;
  const videoTrack = stream.getVideoTracks()[0];
  const audioTrack = stream.getAudioTracks()[0];
  // Reuse tracks - nhưng có thể bị invalid
}
```

**Vấn đề:**
- ❌ MediaStream có thể bị closed sau khi green-room unmount
- ❌ Track state không được sync đúng
- ❌ Permission requests vẫn có thể xảy ra

**File:** `talkplatform-frontend/hooks/use-meeting-media.ts`

```typescript
// Vấn đề 3: State sync giữa database và UI
useEffect(() => {
  if (currentParticipant) {
    const dbIsMuted = (currentParticipant as any).is_muted ?? false;
    setIsMicEnabledState(!dbIsMuted);
    // Nhưng không sync với LiveKit track state
  }
}, [currentParticipant]);
```

**Vấn đề:**
- ❌ Database state và LiveKit track state không sync
- ❌ UI có thể hiển thị sai state
- ❌ Host moderation actions không được reflect ngay lập tức

#### Chiến lược cải thiện:

**1.1. Unified Media State Management**

```typescript
// Tạo một single source of truth cho media state
interface MediaState {
  mic: {
    enabled: boolean;
    deviceId: string | null;
    track: LocalAudioTrack | null;
    isMuted: boolean; // Database state
  };
  camera: {
    enabled: boolean;
    deviceId: string | null;
    track: LocalVideoTrack | null;
    isVideoOff: boolean; // Database state
  };
}

// Centralized media manager
class MediaManager {
  private state: MediaState;
  private room: Room | null = null;
  
  async enableMicrophone(enabled: boolean, deviceId?: string): Promise<void> {
    // 1. Update local state
    this.state.mic.enabled = enabled;
    
    // 2. Update LiveKit track
    if (this.room) {
      await this.room.localParticipant.setMicrophoneEnabled(enabled, deviceId ? { deviceId: { exact: deviceId } } : undefined);
    }
    
    // 3. Update database
    await this.syncToDatabase();
    
    // 4. Emit event for UI update
    this.emit('mic-state-changed', this.state.mic);
  }
  
  private async syncToDatabase(): Promise<void> {
    // Sync state to backend
    await this.socket.emit('media:toggle-mic', {
      isMuted: !this.state.mic.enabled
    });
  }
}
```

**1.2. Stream Reuse với Proper Cleanup**

```typescript
// Tạo MediaStreamManager để quản lý stream lifecycle
class MediaStreamManager {
  private activeStream: MediaStream | null = null;
  private streamRefs = new Set<MediaStream>();
  
  async getOrCreateStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    // Check if stream is still active
    if (this.activeStream && this.isStreamActive(this.activeStream)) {
      return this.activeStream;
    }
    
    // Create new stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.activeStream = stream;
    this.streamRefs.add(stream);
    
    // Setup cleanup on stream end
    stream.getTracks().forEach(track => {
      track.onended = () => {
        this.cleanupStream(stream);
      };
    });
    
    return stream;
  }
  
  private isStreamActive(stream: MediaStream): boolean {
    return stream.active && stream.getTracks().every(track => track.readyState === 'live');
  }
  
  private cleanupStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => track.stop());
    this.streamRefs.delete(stream);
    if (this.activeStream === stream) {
      this.activeStream = null;
    }
  }
}
```

**1.3. Track State Synchronization**

```typescript
// Sync LiveKit track state với database state
class TrackStateSync {
  private syncInterval: NodeJS.Timeout | null = null;
  
  startSync(room: Room, participant: IMeetingParticipant): void {
    this.syncInterval = setInterval(() => {
      this.syncTrackStates(room, participant);
    }, 1000); // Sync every second
  }
  
  private async syncTrackStates(room: Room, participant: IMeetingParticipant): Promise<void> {
    // Get LiveKit track states
    const micTrack = room.localParticipant.audioTrackPublications.values().next().value?.track;
    const cameraTrack = Array.from(room.localParticipant.videoTrackPublications.values())
      .find(pub => pub.source === Track.Source.Camera)?.track;
    
    // Get database states
    const dbIsMuted = participant.is_muted ?? false;
    const dbIsVideoOff = participant.is_video_off ?? false;
    
    // Compare and fix discrepancies
    if (micTrack) {
      const livekitIsMuted = micTrack.isMuted;
      if (livekitIsMuted !== dbIsMuted) {
        console.warn('⚠️ Mic state mismatch, syncing...');
        await this.syncMicState(room, dbIsMuted);
      }
    }
    
    if (cameraTrack) {
      const livekitIsVideoOff = cameraTrack.isMuted;
      if (livekitIsVideoOff !== dbIsVideoOff) {
        console.warn('⚠️ Camera state mismatch, syncing...');
        await this.syncCameraState(room, dbIsVideoOff);
      }
    }
  }
}
```

---

### 2. SCREEN SHARING

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/hooks/use-livekit.ts`

```typescript
// Vấn đề: Screen share logic đơn giản nhưng thiếu error handling
const startScreenShare = useCallback(async () => {
  await roomRef.current.localParticipant.setScreenShareEnabled(true, {
    audio: false,
    video: { displaySurface: 'monitor' } as any,
  });
}, []);
```

**Vấn đề:**
- ❌ Không check browser compatibility
- ❌ Không handle user cancellation
- ❌ Không cleanup properly khi error
- ❌ Không có fallback cho browsers không support

**File:** `talkplatform-frontend/hooks/use-webrtc.ts`

```typescript
// Vấn đề: Logic replace vs add track không rõ ràng
// REPLACE video track with screen (better approach for viewing)
const replacePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, { connection }]) => {
  const sender = connection.getSenders().find(s => s.track?.kind === 'video');
  if (sender) {
    await sender.replaceTrack(screenTrack);
  }
});
```

**Vấn đề:**
- ❌ Logic phức tạp với nhiều edge cases
- ❌ Không handle simultaneous camera + screen share
- ❌ Cleanup không đầy đủ

#### Chiến lược cải thiện:

**2.1. Enhanced Screen Share với Error Handling**

```typescript
class ScreenShareManager {
  private isSharing = false;
  private screenTrack: LocalVideoTrack | null = null;
  private cameraTrack: LocalVideoTrack | null = null;
  
  async startScreenShare(room: Room, options?: ScreenShareOptions): Promise<void> {
    try {
      // 1. Check browser support
      if (!this.isScreenShareSupported()) {
        throw new Error('Screen sharing is not supported in this browser');
      }
      
      // 2. Save current camera track
      this.cameraTrack = this.getCameraTrack(room);
      
      // 3. Start screen share
      await room.localParticipant.setScreenShareEnabled(true, {
        audio: options?.includeAudio ?? false,
        video: {
          displaySurface: options?.displaySurface ?? 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        } as any,
      });
      
      // 4. Wait for track to be published
      await this.waitForScreenShareTrack(room);
      
      // 5. Update state
      this.isSharing = true;
      this.screenTrack = this.getScreenShareTrack(room);
      
      // 6. Setup cleanup on user stop
      this.setupScreenShareCleanup(room);
      
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Screen sharing permission denied');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No screen/window available to share');
      } else {
        throw error;
      }
    }
  }
  
  private setupScreenShareCleanup(room: Room): void {
    // Listen for track ended event
    this.screenTrack?.on('ended', () => {
      this.handleScreenShareEnded(room);
    });
    
    // Listen for browser stop (user clicks stop in browser UI)
    if (this.screenTrack) {
      const stream = (this.screenTrack as any).mediaStream;
      if (stream) {
        stream.getVideoTracks()[0].onended = () => {
          this.handleScreenShareEnded(room);
        };
      }
    }
  }
  
  private async handleScreenShareEnded(room: Room): Promise<void> {
    await this.stopScreenShare(room, { restoreCamera: true });
  }
  
  async stopScreenShare(room: Room, options?: { restoreCamera?: boolean }): Promise<void> {
    try {
      await room.localParticipant.setScreenShareEnabled(false);
      
      // Restore camera if needed
      if (options?.restoreCamera && this.cameraTrack && !this.cameraTrack.isMuted) {
        // Camera will be restored automatically by LiveKit
      }
      
      this.isSharing = false;
      this.screenTrack = null;
      
    } catch (error) {
      console.error('Failed to stop screen share:', error);
      // Force cleanup
      this.isSharing = false;
      this.screenTrack = null;
    }
  }
  
  private isScreenShareSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  }
}
```

**2.2. Screen Share với Camera Simultaneous Support**

```typescript
// Support both camera and screen share at the same time
class DualVideoManager {
  async startScreenShareWithCamera(room: Room): Promise<void> {
    // 1. Ensure camera is enabled
    const cameraTrack = this.getCameraTrack(room);
    if (!cameraTrack || cameraTrack.isMuted) {
      await room.localParticipant.setCameraEnabled(true);
    }
    
    // 2. Start screen share (LiveKit supports multiple video tracks)
    await room.localParticipant.setScreenShareEnabled(true);
    
    // 3. UI will show both tracks
  }
  
  // Layout options:
  // - Picture-in-Picture: Camera small, screen large
  // - Side-by-side: Camera left, screen right
  // - Grid: Both in grid layout
}
```

---

### 3. LAYOUT MANAGEMENT

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/components/meeting/meeting-layout-wrapper.tsx`

```typescript
// Vấn đề: Layout wrapper quá đơn giản, chỉ hide header/footer
export function MeetingLayoutWrapper({ children }: { children: React.ReactNode }) {
  // Chỉ xử lý body styles
  // Không có layout switching logic
}
```

**Vấn đề:**
- ❌ Không có grid layout
- ❌ Không có spotlight mode
- ❌ Không có responsive layout
- ❌ Performance issues với nhiều participants

#### Chiến lược cải thiện:

**3.1. Layout Manager với Multiple Modes**

```typescript
enum LayoutMode {
  GRID = 'grid',
  SPOTLIGHT = 'spotlight',
  SIDEBAR = 'sidebar',
  FOCUS = 'focus', // Focus on screen share
}

class LayoutManager {
  private mode: LayoutMode = LayoutMode.GRID;
  private participants: Participant[] = [];
  private screenSharer: Participant | null = null;
  
  getLayout(mode: LayoutMode, participants: Participant[]): LayoutConfig {
    switch (mode) {
      case LayoutMode.GRID:
        return this.getGridLayout(participants);
      case LayoutMode.SPOTLIGHT:
        return this.getSpotlightLayout(participants);
      case LayoutMode.SIDEBAR:
        return this.getSidebarLayout(participants);
      case LayoutMode.FOCUS:
        return this.getFocusLayout(this.screenSharer, participants);
      default:
        return this.getGridLayout(participants);
    }
  }
  
  private getGridLayout(participants: Participant[]): LayoutConfig {
    // Calculate optimal grid size
    const count = participants.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    return {
      type: 'grid',
      columns: cols,
      rows: rows,
      participants: participants.map((p, i) => ({
        participant: p,
        position: {
          row: Math.floor(i / cols),
          col: i % cols,
        },
        size: {
          width: `${100 / cols}%`,
          height: `${100 / rows}%`,
        },
      })),
    };
  }
  
  private getSpotlightLayout(participants: Participant[]): LayoutConfig {
    // Speaker (active mic) gets large view
    // Others get small thumbnails
    const speaker = participants.find(p => p.isSpeaking) || participants[0];
    const others = participants.filter(p => p.id !== speaker.id);
    
    return {
      type: 'spotlight',
      main: speaker,
      thumbnails: others.slice(0, 6), // Max 6 thumbnails
    };
  }
  
  private getFocusLayout(screenSharer: Participant | null, participants: Participant[]): LayoutConfig {
    if (!screenSharer) {
      return this.getGridLayout(participants);
    }
    
    return {
      type: 'focus',
      main: screenSharer,
      participants: participants.filter(p => p.id !== screenSharer.id),
    };
  }
}
```

**3.2. Performance Optimization cho Video Grid**

```typescript
// Virtual scrolling cho video grid
class VirtualVideoGrid {
  private visibleRange: { start: number; end: number } = { start: 0, end: 9 };
  private containerHeight: number = 0;
  private itemHeight: number = 0;
  
  calculateVisibleRange(scrollTop: number, containerHeight: number, itemHeight: number): void {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + 2, // +2 for buffer
      this.participants.length
    );
    
    this.visibleRange = { start, end };
  }
  
  // Only render visible participants
  getVisibleParticipants(participants: Participant[]): Participant[] {
    return participants.slice(this.visibleRange.start, this.visibleRange.end);
  }
  
  // Lazy load video tracks for off-screen participants
  async loadParticipantTrack(participant: Participant): Promise<void> {
    if (this.isVisible(participant)) {
      await this.subscribeToTrack(participant);
    } else {
      // Unsubscribe to save bandwidth
      await this.unsubscribeFromTrack(participant);
    }
  }
}
```

---

### 4. CHAT SYSTEM

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/components/meeting/livekit-room-wrapper.tsx`

```typescript
// Vấn đề: Có 2 hệ thống chat
// 1. Socket.IO chat (primary)
// 2. LiveKit data channel chat (secondary, nhưng vẫn active)
onDataReceived: (payload, participant) => {
  if (data.type === 'chat') {
    // Skip LiveKit data channel chat messages - we only use Socket.IO for chat
    // This prevents duplicate messages
    return;
  }
}
```

**Vấn đề:**
- ❌ Có thể có duplicate messages nếu cả 2 systems đều active
- ❌ Message ordering issues
- ❌ Performance với nhiều messages

**File:** `talkplatform-backend/src/features/meeting/meetings.gateway.ts`

```typescript
// Vấn đề: Chat message handling
@SubscribeMessage('chat:message')
async handleChatMessage(...) {
  // Save to database
  // Broadcast to room
  // Nhưng không có message ordering guarantee
}
```

#### Chiến lược cải thiện:

**4.1. Unified Chat System**

```typescript
// Chỉ sử dụng Socket.IO cho chat, disable LiveKit data channel chat
class ChatManager {
  private socket: Socket;
  private messages: ChatMessage[] = [];
  private messageQueue: ChatMessage[] = []; // For offline messages
  
  async sendMessage(message: string): Promise<void> {
    if (!this.socket.connected) {
      // Queue message for when reconnected
      this.messageQueue.push({
        id: `temp-${Date.now()}`,
        message,
        timestamp: new Date(),
        status: 'pending',
      });
      return;
    }
    
    try {
      // Send via Socket.IO only
      this.socket.emit('chat:message', { message });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }
  
  // Handle incoming messages with ordering
  onMessageReceived(message: ChatMessage): void {
    // Insert message in correct position based on timestamp
    const insertIndex = this.messages.findIndex(
      m => new Date(m.timestamp) > new Date(message.timestamp)
    );
    
    if (insertIndex === -1) {
      this.messages.push(message);
    } else {
      this.messages.splice(insertIndex, 0, message);
    }
    
    // Emit update
    this.emit('messages-updated', this.messages);
  }
  
  // Retry queued messages on reconnect
  async retryQueuedMessages(): Promise<void> {
    for (const message of this.messageQueue) {
      try {
        await this.sendMessage(message.message);
        message.status = 'sent';
      } catch (error) {
        message.status = 'failed';
      }
    }
    
    // Remove sent messages
    this.messageQueue = this.messageQueue.filter(m => m.status !== 'sent');
  }
}
```

**4.2. Message Pagination & Performance**

```typescript
// Implement pagination cho chat messages
class ChatPagination {
  private pageSize = 50;
  private currentPage = 0;
  private totalMessages = 0;
  
  async loadMessages(meetingId: string, page: number = 0): Promise<ChatMessage[]> {
    const response = await fetch(`/api/v1/meetings/${meetingId}/chat/messages?page=${page}&limit=${this.pageSize}`);
    const data = await response.json();
    
    this.totalMessages = data.total;
    return data.messages;
  }
  
  // Load more messages when scrolling to top
  async loadMore(): Promise<ChatMessage[]> {
    if (this.hasMore()) {
      this.currentPage++;
      return await this.loadMessages(this.meetingId, this.currentPage);
    }
    return [];
  }
  
  hasMore(): boolean {
    return (this.currentPage + 1) * this.pageSize < this.totalMessages;
  }
}
```

---

### 5. USER MANAGEMENT

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/components/meeting/livekit-room-wrapper.tsx`

```typescript
// Vấn đề: Duplicate event handling
const lastMuteEventRef = useRef<{ userId: string; isMuted: boolean; timestamp: number } | null>(null);

const handleForceMute = (data: { userId: string; isMuted: boolean }) => {
  // Prevent duplicate events within 1 second
  // Nhưng vẫn có thể có race conditions
}
```

**Vấn đề:**
- ❌ Duplicate event prevention không đủ
- ❌ Race conditions trong moderation actions
- ❌ State sync issues

#### Chiến lược cải thiện:

**5.1. Event Deduplication với Proper State Management**

```typescript
class EventDeduplicator {
  private eventHistory = new Map<string, EventRecord[]>();
  private readonly DEDUP_WINDOW = 2000; // 2 seconds
  
  shouldProcess(event: Event): boolean {
    const key = `${event.type}-${event.userId}`;
    const history = this.eventHistory.get(key) || [];
    
    // Check if same event happened recently
    const recent = history.find(
      e => e.data === JSON.stringify(event.data) &&
      Date.now() - e.timestamp < this.DEDUP_WINDOW
    );
    
    if (recent) {
      return false; // Duplicate, skip
    }
    
    // Add to history
    history.push({
      timestamp: Date.now(),
      data: JSON.stringify(event.data),
    });
    
    // Keep only recent events
    this.eventHistory.set(key, history.filter(
      e => Date.now() - e.timestamp < this.DEDUP_WINDOW
    ));
    
    return true; // Process
  }
}
```

**5.2. Atomic Moderation Actions**

```typescript
class ModerationManager {
  private actionQueue: ModerationAction[] = [];
  private isProcessing = false;
  
  async muteParticipant(userId: string, mute: boolean): Promise<void> {
    // Add to queue
    this.actionQueue.push({
      type: 'mute',
      userId,
      mute,
      timestamp: Date.now(),
    });
    
    // Process queue
    await this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.actionQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift()!;
      
      try {
        // 1. Update database
        await this.updateDatabase(action);
        
        // 2. Update LiveKit
        await this.updateLiveKit(action);
        
        // 3. Broadcast to room
        await this.broadcastAction(action);
        
        // 4. Update local state
        this.updateLocalState(action);
        
      } catch (error) {
        console.error('Failed to process moderation action:', error);
        // Retry logic
        this.actionQueue.unshift(action); // Put back at front
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
      }
    }
    
    this.isProcessing = false;
  }
}
```

---

## 🚀 CHIẾN LƯỢC CẢI THIỆN

### Phase 1: Media Controls (Mic/Cam) - Priority: CRITICAL

**Timeline:** 1-2 weeks

#### Tasks:
1. ✅ Tạo `MediaManager` class để quản lý unified state
2. ✅ Implement `MediaStreamManager` cho stream reuse
3. ✅ Implement `TrackStateSync` cho state synchronization
4. ✅ Refactor `use-livekit.ts` để sử dụng MediaManager
5. ✅ Update `livekit-room-wrapper.tsx` để sử dụng new system
6. ✅ Testing: Mic/Cam toggle, device switching, permission handling

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   ├── media-manager.ts (NEW)
  │   ├── media-stream-manager.ts (NEW)
  │   └── track-state-sync.ts (NEW)
  ├── hooks/
  │   └── use-livekit.ts (REFACTOR)
  └── components/meeting/
      └── livekit-room-wrapper.tsx (REFACTOR)
```

### Phase 2: Screen Sharing - Priority: HIGH

**Timeline:** 1 week

#### Tasks:
1. ✅ Tạo `ScreenShareManager` class
2. ✅ Implement error handling và browser compatibility checks
3. ✅ Implement cleanup on user stop
4. ✅ Support simultaneous camera + screen share
5. ✅ Testing: Start/stop screen share, browser compatibility, error scenarios

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   └── screen-share-manager.ts (NEW)
  ├── hooks/
  │   └── use-livekit.ts (UPDATE)
  └── components/meeting/
      └── meeting-controls.tsx (UPDATE)
```

### Phase 3: Layout Management - Priority: MEDIUM

**Timeline:** 1-2 weeks

#### Tasks:
1. ✅ Tạo `LayoutManager` class với multiple modes
2. ✅ Implement grid layout với virtual scrolling
3. ✅ Implement spotlight mode
4. ✅ Implement focus mode (screen share)
5. ✅ Performance optimization
6. ✅ Testing: Layout switching, performance với nhiều participants

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   └── layout-manager.ts (NEW)
  ├── components/meeting/
  │   ├── video-grid.tsx (NEW)
  │   ├── spotlight-layout.tsx (NEW)
  │   └── meeting-layout-wrapper.tsx (REFACTOR)
```

### Phase 4: Chat System - Priority: MEDIUM

**Timeline:** 1 week

#### Tasks:
1. ✅ Tạo `ChatManager` class
2. ✅ Disable LiveKit data channel chat (chỉ dùng Socket.IO)
3. ✅ Implement message ordering
4. ✅ Implement pagination
5. ✅ Implement offline message queue
6. ✅ Testing: Message ordering, pagination, offline handling

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   └── chat-manager.ts (NEW)
  ├── hooks/
  │   └── use-meeting-chat.ts (REFACTOR)
  └── components/meeting/
      └── meeting-chat-panel.tsx (UPDATE)
```

### Phase 5: User Management - Priority: HIGH

**Timeline:** 1 week

#### Tasks:
1. ✅ Tạo `EventDeduplicator` class
2. ✅ Tạo `ModerationManager` class
3. ✅ Implement atomic moderation actions
4. ✅ Fix race conditions
5. ✅ Testing: Host moderation, duplicate events, race conditions

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   ├── event-deduplicator.ts (NEW)
  │   └── moderation-manager.ts (NEW)
  └── components/meeting/
      ├── meeting-participants-panel.tsx (REFACTOR)
      └── livekit-room-wrapper.tsx (UPDATE)
```

---

## 🧪 TESTING STRATEGY

### Unit Tests

```typescript
describe('MediaManager', () => {
  it('should enable microphone correctly', async () => {
    // Test mic enable
  });
  
  it('should sync state between database and LiveKit', async () => {
    // Test state sync
  });
  
  it('should handle device switching', async () => {
    // Test device switching
  });
});

describe('ScreenShareManager', () => {
  it('should start screen share successfully', async () => {
    // Test screen share start
  });
  
  it('should handle user cancellation', async () => {
    // Test user stops screen share
  });
  
  it('should cleanup properly on error', async () => {
    // Test error cleanup
  });
});
```

### Integration Tests

```typescript
describe('Meeting Room Integration', () => {
  it('should handle mic/cam toggle without errors', async () => {
    // Test full flow
  });
  
  it('should handle screen share with multiple participants', async () => {
    // Test screen share with multiple users
  });
  
  it('should handle chat messages correctly', async () => {
    // Test chat flow
  });
});
```

### E2E Tests

```typescript
describe('Meeting Room E2E', () => {
  it('User can join meeting and toggle mic/cam', async () => {
    // 1. Join meeting
    // 2. Toggle mic
    // 3. Toggle cam
    // 4. Verify state
  });
  
  it('Host can moderate participants', async () => {
    // 1. Host mutes participant
    // 2. Verify participant is muted
    // 3. Host unmutes participant
    // 4. Verify participant is unmuted
  });
});
```

---

## 📊 PRIORITY MATRIX

| Feature | Priority | Effort | Impact | Timeline |
|---------|----------|--------|--------|----------|
| Mic/Cam Controls | 🔴 CRITICAL | High | Very High | Week 1-2 |
| Screen Sharing | 🟠 HIGH | Medium | High | Week 2-3 |
| User Management | 🟠 HIGH | Medium | High | Week 3-4 |
| Layout Management | 🟡 MEDIUM | High | Medium | Week 4-6 |
| Chat System | 🟡 MEDIUM | Low | Medium | Week 6-7 |

---

## ✅ ACCEPTANCE CRITERIA

### Mic/Cam Controls
- [ ] No duplicate permission requests
- [ ] State sync between database and LiveKit works correctly
- [ ] Device switching works without errors
- [ ] Host moderation actions reflect immediately
- [ ] No race conditions when toggling quickly

### Screen Sharing
- [ ] Screen share starts successfully
- [ ] User cancellation is handled properly
- [ ] Cleanup works on error
- [ ] Browser compatibility is checked
- [ ] Simultaneous camera + screen share works (optional)

### Layout Management
- [ ] Grid layout works with many participants
- [ ] Spotlight mode works correctly
- [ ] Focus mode works for screen share
- [ ] Performance is acceptable with 20+ participants
- [ ] Layout switching is smooth

### Chat System
- [ ] No duplicate messages
- [ ] Message ordering is correct
- [ ] Pagination works correctly
- [ ] Offline messages are queued and sent on reconnect

### User Management
- [ ] No duplicate events
- [ ] Host moderation actions work atomically
- [ ] No race conditions
- [ ] State updates are immediate

---

## 🎯 NEXT STEPS

1. **Review và approve** chiến lược này
2. **Create detailed tickets** cho từng phase
3. **Start Phase 1** (Media Controls) - CRITICAL
4. **Daily standup** để track progress
5. **Weekly review** để adjust timeline nếu cần

---

**Document Version**: 1.0  
**Created**: 2025-12-06  
**Author**: AI Assistant  
**Status**: Ready for Review

