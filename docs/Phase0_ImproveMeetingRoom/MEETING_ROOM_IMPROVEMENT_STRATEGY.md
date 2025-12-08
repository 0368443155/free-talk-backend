# CHIẾN LƯỢC CẢI THIỆN P2P MEETING ROOM - PHÂN TÍCH CHI TIẾT

> **Focus:** P2P WebRTC Meeting Room (bỏ LiveKit) - Các chức năng xương sống cần cải thiện

## 📋 MỤC LỤC

1. [Tổng quan vấn đề](#tổng-quan-vấn-đề)
2. [Phân tích chi tiết từng chức năng P2P](#phân-tích-chi-tiết-từng-chức-năng-p2p)
3. [Chiến lược cải thiện](#chiến-lược-cải-thiện)
4. [Implementation Plan](#implementation-plan)
5. [Testing Strategy](#testing-strategy)

---

## 🎯 TỔNG QUAN VẤN ĐỀ

### Context: P2P WebRTC Meeting Room

**Tech Stack:**
- WebRTC (RTCPeerConnection) cho P2P connections
- Socket.IO cho signaling (offer/answer/ICE candidates)
- MediaStream API cho camera/mic/screen share
- Mesh topology (mỗi peer kết nối trực tiếp với tất cả peers khác)

**Files chính:**
- `talkplatform-frontend/hooks/use-webrtc.ts` - WebRTC logic
- `talkplatform-frontend/section/meetings/meeting-room.tsx` - Main meeting room component
- `talkplatform-frontend/section/meetings/video-grid.tsx` - Video grid layout
- `talkplatform-frontend/components/meeting/meeting-chat-panel.tsx` - Chat
- `talkplatform-frontend/components/meeting/meeting-participants-panel.tsx` - User management

### Các vấn đề chính được xác định (P2P WebRTC):

1. **Microphone & Camera:**
   - ❌ Track replacement logic phức tạp với nhiều edge cases
   - ❌ State sync không nhất quán giữa MediaStream và database
   - ❌ Video toggle cần request new track mỗi lần (không reuse)
   - ❌ Track replacement trong multiple peer connections không đồng bộ

2. **Screen Sharing:**
   - ❌ Replace vs restore camera logic không rõ ràng
   - ❌ Cleanup không đầy đủ khi stop screen share
   - ❌ Camera track cache (lastCameraTrackRef) có thể bị invalid
   - ❌ Không handle trường hợp user cancel screen share từ browser UI

3. **Peer Connection Management:**
   - ❌ Negotiation race conditions (onnegotiationneeded)
   - ❌ ICE candidate handling không đầy đủ
   - ❌ Connection state recovery khi failed
   - ❌ Track order inconsistency (audio first, then video)

4. **Video Grid Layout:**
   - ❌ Performance issues với nhiều participants (render tất cả videos)
   - ❌ Grid layout không responsive
   - ❌ Spotlight mode chưa hoàn thiện
   - ❌ Không có virtual scrolling cho nhiều participants

5. **Chat:**
   - ❌ Message ordering có thể bị lỗi
   - ❌ Performance với nhiều messages
   - ❌ Offline message queue chưa có

6. **User Management:**
   - ❌ Host moderation actions không sync với WebRTC tracks
   - ❌ Duplicate event handling trong Socket.IO
   - ❌ Race conditions khi toggle mic/cam nhanh

---

## 🔍 PHÂN TÍCH CHI TIẾT TỪNG CHỨC NĂNG

### 1. MICROPHONE & CAMERA

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/hooks/use-webrtc.ts`

```typescript
// Vấn đề 1: Toggle video logic phức tạp - cần request new track mỗi lần
const toggleVideo = useCallback(async () => {
  if (willBeOff) {
    videoTrack.enabled = false;
  } else {
    // Phải request new track mỗi lần ON - không reuse
    const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const newVideoTrack = newStream.getVideoTracks()[0];
    
    // Replace trong localStream
    localStreamRef.current.removeTrack(oldVideoTrack);
    localStreamRef.current.addTrack(newVideoTrack);
    
    // Replace trong TẤT CẢ peer connections - có thể fail một số
    const replacePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, peer]) => {
      const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack); // Có thể fail
      }
    });
    await Promise.all(replacePromises); // Nếu một cái fail, cả đống fail
  }
}, []);
```

**Vấn đề:**
- ❌ Phải request new MediaStream mỗi lần bật video (không reuse track)
- ❌ Replace track trong nhiều peer connections không atomic (một cái fail → tất cả fail)
- ❌ Không có retry mechanism khi replace track fail
- ❌ Race condition khi toggle nhanh nhiều lần

**Vấn đề 2: Toggle mute đơn giản nhưng thiếu sync**

```typescript
const toggleMute = useCallback(() => {
  const audioTrack = localStreamRef.current.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled; // Chỉ update local track
  
  // Notify server nhưng không đợi confirmation
  socket.emit('media:toggle-mic', { isMuted: !audioTrack.enabled });
}, []);
```

**Vấn đề:**
- ❌ Chỉ update local track, không sync với database state
- ❌ Host moderation có thể conflict với user action
- ❌ Không có error handling nếu socket emit fail

**Vấn đề 3: State sync giữa MediaStream và database**

```typescript
// Database state (is_muted, is_video_off) và MediaStream track state không sync
// Khi host mute user → database updated nhưng MediaStream track vẫn enabled
// User có thể unmute local track → conflict
```

**Vấn đề:**
- ❌ Database state và MediaStream track state độc lập
- ❌ Host moderation không enforce được trên MediaStream level
- ❌ UI có thể hiển thị sai state

#### Chiến lược cải thiện:

**1.1. Unified Media State Management cho P2P**

```typescript
// Tạo một single source of truth cho media state trong P2P
interface P2PMediaState {
  mic: {
    enabled: boolean;
    track: MediaStreamTrack | null;
    isMuted: boolean; // Database state (can be forced by host)
    isForced: boolean; // If host forced mute/unmute
  };
  camera: {
    enabled: boolean;
    track: MediaStreamTrack | null;
    isVideoOff: boolean; // Database state
    isForced: boolean; // If host forced video off/on
  };
}

// Centralized P2P media manager
class P2PMediaManager {
  private state: P2PMediaState;
  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private socket: Socket | null = null;
  private currentVideoDeviceId: string | null = null;
  
  async enableMicrophone(enabled: boolean): Promise<void> {
    if (!this.localStream) {
      throw new Error('Local stream not initialized');
    }
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) {
      throw new Error('No audio track found');
    }
    
    // 1. Update track state
    audioTrack.enabled = enabled;
    this.state.mic.enabled = enabled;
    
    // 2. Update database (async, don't block)
    this.syncMicToDatabase(enabled).catch(err => {
      console.error('Failed to sync mic state to database:', err);
    });
    
    // 3. Emit event for UI update
    this.emit('mic-state-changed', { enabled, isForced: this.state.mic.isForced });
  }
  
  async enableCamera(enabled: boolean, deviceId?: string): Promise<void> {
    if (enabled === this.state.camera.enabled && !deviceId) {
      // Already in desired state, no need to change
      return;
    }
    
    if (enabled) {
      // Turning camera ON
      await this.turnCameraOn(deviceId);
    } else {
      // Turning camera OFF
      await this.turnCameraOff();
    }
  }
  
  private async turnCameraOn(deviceId?: string): Promise<void> {
    try {
      // Request new video track
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          ...(deviceId && { deviceId: { exact: deviceId } }),
        },
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      if (!newVideoTrack) {
        throw new Error('No video track in new stream');
      }
      
      // Store device ID for future use
      this.currentVideoDeviceId = newVideoTrack.getSettings().deviceId || null;
      
      // Replace old video track in localStream
      if (this.localStream) {
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          this.localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop(); // Stop old track to free resources
        }
        this.localStream.addTrack(newVideoTrack);
      }
      
      // Replace track in ALL peer connections with retry mechanism
      await this.replaceVideoTrackInAllPeers(newVideoTrack);
      
      // Update state
      this.state.camera.enabled = true;
      this.state.camera.track = newVideoTrack;
      
      // Update database
      await this.syncCameraToDatabase(false);
      
      this.emit('camera-state-changed', { enabled: true, isForced: this.state.camera.isForced });
      
    } catch (error) {
      console.error('Failed to turn camera on:', error);
      throw error;
    }
  }
  
  private async turnCameraOff(): Promise<void> {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = false;
      this.state.camera.enabled = false;
      
      // Don't stop track, just disable (allows quick re-enable)
      // If we want to free resources, we can stop it:
      // videoTrack.stop();
      // this.localStream.removeTrack(videoTrack);
      
      await this.syncCameraToDatabase(true);
      this.emit('camera-state-changed', { enabled: false, isForced: this.state.camera.isForced });
    }
  }
  
  private async replaceVideoTrackInAllPeers(newTrack: MediaStreamTrack): Promise<void> {
    const replacePromises = Array.from(this.peers.entries()).map(async ([userId, peerConnection]) => {
      try {
        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newTrack);
          console.log(`✅ Replaced video track for peer ${userId}`);
        } else {
          // No video sender exists, add track
          if (this.localStream) {
            peerConnection.addTrack(newTrack, this.localStream);
            console.log(`➕ Added video track to peer ${userId}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to replace video track for peer ${userId}:`, error);
        // Retry once
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newTrack);
            console.log(`✅ Retry successful for peer ${userId}`);
          }
        } catch (retryError) {
          console.error(`❌ Retry failed for peer ${userId}:`, retryError);
          // Mark peer as failed, can retry connection later
        }
      }
    });
    
    await Promise.allSettled(replacePromises); // Don't fail all if one fails
  }
  
  // Handle host moderation - force state
  async forceMicrophoneState(muted: boolean): Promise<void> {
    this.state.mic.isForced = true;
    await this.enableMicrophone(!muted);
    // Don't allow user to change until host unmutes
  }
  
  async forceCameraState(videoOff: boolean): Promise<void> {
    this.state.camera.isForced = true;
    await this.enableCamera(!videoOff);
    // Don't allow user to change until host allows
  }
  
  private async syncMicToDatabase(enabled: boolean): Promise<void> {
    if (!this.socket) return;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      
      this.socket!.emit('media:toggle-mic', { isMuted: !enabled }, (response: { success: boolean }) => {
        clearTimeout(timeout);
        if (response?.success) {
          resolve();
        } else {
          reject(new Error('Server rejected mic state change'));
        }
      });
    });
  }
  
  private async syncCameraToDatabase(videoOff: boolean): Promise<void> {
    if (!this.socket) return;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      
      this.socket!.emit('media:toggle-video', { isVideoOff: videoOff }, (response: { success: boolean }) => {
        clearTimeout(timeout);
        if (response?.success) {
          resolve();
        } else {
          reject(new Error('Server rejected camera state change'));
        }
      });
    });
  }
}
```

**1.2. MediaStream Lifecycle Management**

```typescript
// Quản lý MediaStream lifecycle trong P2P
class P2PStreamManager {
  private localStream: MediaStream | null = null;
  private streamRefs = new Set<MediaStream>();
  private trackCache = new Map<string, MediaStreamTrack>(); // Cache tracks by deviceId
  
  async initializeLocalStream(audioEnabled: boolean, videoEnabled: boolean, deviceIds?: {
    audioDeviceId?: string;
    videoDeviceId?: string;
  }): Promise<MediaStream> {
    // Check if stream exists and is active
    if (this.localStream && this.isStreamActive(this.localStream)) {
      // Update tracks if needed
      await this.updateTracks(audioEnabled, videoEnabled, deviceIds);
      return this.localStream;
    }
    
    // Create new stream
    const constraints: MediaStreamConstraints = {
      audio: audioEnabled ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(deviceIds?.audioDeviceId && { deviceId: { exact: deviceIds.audioDeviceId } }),
      } : false,
      video: videoEnabled ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
        ...(deviceIds?.videoDeviceId && { deviceId: { exact: deviceIds.videoDeviceId } }),
      } : false,
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.localStream = stream;
    this.streamRefs.add(stream);
    
    // Cache tracks
    stream.getTracks().forEach(track => {
      const deviceId = track.getSettings().deviceId;
      if (deviceId) {
        this.trackCache.set(deviceId, track);
      }
      
      // Setup cleanup on track end
      track.onended = () => {
        this.handleTrackEnded(track);
      };
    });
    
    return stream;
  }
  
  private async updateTracks(audioEnabled: boolean, videoEnabled: boolean, deviceIds?: {
    audioDeviceId?: string;
    videoDeviceId?: string;
  }): Promise<void> {
    if (!this.localStream) return;
    
    // Update audio track
    const currentAudioTrack = this.localStream.getAudioTracks()[0];
    if (audioEnabled && !currentAudioTrack) {
      // Need to add audio track
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceIds?.audioDeviceId && { deviceId: { exact: deviceIds.audioDeviceId } }),
        },
      });
      const audioTrack = audioStream.getAudioTracks()[0];
      if (audioTrack) {
        this.localStream.addTrack(audioTrack);
      }
    } else if (!audioEnabled && currentAudioTrack) {
      currentAudioTrack.enabled = false;
      // Or stop it: currentAudioTrack.stop(); this.localStream.removeTrack(currentAudioTrack);
    }
    
    // Update video track (similar logic)
    // ...
  }
  
  private isStreamActive(stream: MediaStream): boolean {
    return stream.active && stream.getTracks().every(track => 
      track.readyState === 'live' || track.readyState === 'ended'
    );
  }
  
  private handleTrackEnded(track: MediaStreamTrack): void {
    console.log('Track ended:', track.kind, track.id);
    
    // Remove from cache
    const deviceId = track.getSettings().deviceId;
    if (deviceId) {
      this.trackCache.delete(deviceId);
    }
    
    // Remove from stream
    if (this.localStream) {
      this.localStream.removeTrack(track);
    }
  }
  
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
  
  cleanup(): void {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.streamRefs.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.streamRefs.clear();
    this.trackCache.clear();
    this.localStream = null;
  }
}
```

**1.3. Track State Sync với Database**

```typescript
// Sync MediaStream track state với database state
class P2PTrackStateSync {
  private syncInterval: NodeJS.Timeout | null = null;
  private mediaManager: P2PMediaManager;
  private socket: Socket;
  
  startSync(mediaManager: P2PMediaManager, socket: Socket, participant: IMeetingParticipant): void {
    this.mediaManager = mediaManager;
    this.socket = socket;
    
    this.syncInterval = setInterval(() => {
      this.syncTrackStates(participant);
    }, 2000); // Sync every 2 seconds
  }
  
  private async syncTrackStates(participant: IMeetingParticipant): Promise<void> {
    const localStream = this.mediaManager.getLocalStream();
    if (!localStream) return;
    
    // Get MediaStream track states
    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];
    
    const streamMicEnabled = audioTrack?.enabled ?? false;
    const streamVideoEnabled = videoTrack?.enabled ?? false;
    
    // Get database states
    const dbIsMuted = participant.is_muted ?? false;
    const dbIsVideoOff = participant.is_video_off ?? false;
    
    // Compare and fix discrepancies
    if (audioTrack && streamMicEnabled === dbIsMuted) {
      // Mismatch: stream enabled but DB says muted (or vice versa)
      console.warn('⚠️ Mic state mismatch, syncing...', {
        streamEnabled: streamMicEnabled,
        dbMuted: dbIsMuted,
      });
      await this.mediaManager.enableMicrophone(!dbIsMuted);
    }
    
    if (videoTrack && streamVideoEnabled === dbIsVideoOff) {
      // Mismatch: stream enabled but DB says video off (or vice versa)
      console.warn('⚠️ Camera state mismatch, syncing...', {
        streamEnabled: streamVideoEnabled,
        dbVideoOff: dbIsVideoOff,
      });
      await this.mediaManager.enableCamera(!dbIsVideoOff);
    }
  }
  
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}
```

---

### 2. SCREEN SHARING (P2P WebRTC)

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/hooks/use-webrtc.ts`

```typescript
// Vấn đề 1: Logic replace vs restore camera không rõ ràng
const toggleScreenShare = useCallback(async () => {
  if (isScreenSharing) {
    // Stop screen share - restore camera
    const restorePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, { connection }]) => {
      const sender = connection.getSenders().find(s => s.track?.kind === 'video');
      if (sender && lastCameraTrackRef.current && lastCameraTrackRef.current.readyState === 'live') {
        await sender.replaceTrack(lastCameraTrackRef.current);
      } else if (sender) {
        // If no cached camera, get fresh one - có thể fail
        const freshCamera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const freshVideoTrack = freshCamera.getVideoTracks()[0];
        await sender.replaceTrack(freshVideoTrack);
      }
    });
    await Promise.all(restorePromises); // Nếu một cái fail → tất cả fail
  } else {
    // Start screen share - replace video track
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const screenTrack = displayStream.getVideoTracks()[0];
    
    // Cache current camera
    lastCameraTrackRef.current = localStreamRef.current?.getVideoTracks()[0] || null;
    
    // Replace in all peers
    const replacePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, { connection }]) => {
      const sender = connection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }
    });
    await Promise.all(replacePromises);
  }
}, []);
```

**Vấn đề:**
- ❌ `lastCameraTrackRef` có thể bị invalid (track ended)
- ❌ Restore camera logic phức tạp với nhiều fallback
- ❌ Không handle trường hợp user cancel screen share từ browser UI
- ❌ Không check browser compatibility trước khi request
- ❌ Replace track trong nhiều peers không atomic (một fail → tất cả fail)
- ❌ Cleanup screen stream không đầy đủ khi error

#### Chiến lược cải thiện:

**2.1. Enhanced Screen Share Manager cho P2P**

```typescript
class P2PScreenShareManager {
  private isSharing = false;
  private screenTrack: MediaStreamTrack | null = null;
  private screenStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private socket: Socket | null = null;
  private cameraRestorePromise: Promise<void> | null = null;
  
  async startScreenShare(localStream: MediaStream, peers: Map<string, RTCPeerConnection>): Promise<void> {
    if (this.isSharing) {
      console.warn('Screen share already active');
      return;
    }
    
    try {
      // 1. Check browser support
      if (!this.isScreenShareSupported()) {
        throw new Error('Screen sharing is not supported in this browser');
      }
      
      // 2. Save current camera track (with validation)
      const currentVideoTrack = localStream.getVideoTracks()[0];
      if (currentVideoTrack && currentVideoTrack.readyState === 'live') {
        this.cameraTrack = currentVideoTrack;
        // Clone track settings for future restoration
        this.cameraTrack = currentVideoTrack;
      }
      
      // 3. Request screen share
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        } as any,
        audio: false,
      });
      
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) {
        throw new Error('No video track in display stream');
      }
      
      this.screenTrack = screenTrack;
      this.screenStream = displayStream;
      
      // 4. Setup cleanup on user stop (browser UI)
      screenTrack.onended = () => {
        console.log('Screen share ended by user (browser UI)');
        this.stopScreenShare(localStream, peers, { restoreCamera: true }).catch(err => {
          console.error('Failed to cleanup screen share:', err);
        });
      };
      
      // 5. Replace video track in all peer connections with retry
      await this.replaceVideoTrackInAllPeers(screenTrack, peers);
      
      // 6. Update local stream (show screen instead of camera)
      const audioTracks = localStream.getAudioTracks();
      localStream.removeTrack(currentVideoTrack);
      localStream.addTrack(screenTrack);
      
      this.localStream = localStream;
      this.isSharing = true;
      
      // 7. Notify server
      if (this.socket) {
        this.socket.emit('media:screen-share', { isSharing: true });
      }
      
      console.log('✅ Screen share started successfully');
      
    } catch (error: any) {
      console.error('Failed to start screen share:', error);
      
      // Cleanup on error
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
      }
      this.screenTrack = null;
      this.screenStream = null;
      
      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        throw new Error('Screen sharing permission denied. Please allow screen sharing in your browser.');
      } else if (error.name === 'NotFoundError' || error.name === 'NotReadableError') {
        throw new Error('No screen/window available to share or screen is already being shared.');
      } else if (error.name === 'AbortError') {
        throw new Error('Screen sharing was interrupted. Please try again.');
      } else {
        throw new Error(`Failed to start screen share: ${error.message}`);
      }
    }
  }
  
  async stopScreenShare(
    localStream: MediaStream, 
    peers: Map<string, RTCPeerConnection>,
    options?: { restoreCamera?: boolean }
  ): Promise<void> {
    if (!this.isSharing) {
      return;
    }
    
    try {
      // 1. Stop screen track
      if (this.screenTrack) {
        this.screenTrack.stop();
        if (localStream) {
          localStream.removeTrack(this.screenTrack);
        }
      }
      
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
      }
      
      // 2. Restore camera if needed
      if (options?.restoreCamera !== false) {
        await this.restoreCamera(localStream, peers);
      }
      
      // 3. Cleanup
      this.screenTrack = null;
      this.screenStream = null;
      this.isSharing = false;
      
      // 4. Notify server
      if (this.socket) {
        this.socket.emit('media:screen-share', { isSharing: false });
      }
      
      console.log('✅ Screen share stopped successfully');
      
    } catch (error) {
      console.error('Failed to stop screen share:', error);
      // Force cleanup even if restore fails
      this.screenTrack = null;
      this.screenStream = null;
      this.isSharing = false;
    }
  }
  
  private async restoreCamera(localStream: MediaStream, peers: Map<string, RTCPeerConnection>): Promise<void> {
    // Prevent multiple restore attempts
    if (this.cameraRestorePromise) {
      return this.cameraRestorePromise;
    }
    
    this.cameraRestorePromise = (async () => {
      try {
        let cameraTrack: MediaStreamTrack | null = null;
        
        // Try to use cached camera track first
        if (this.cameraTrack && this.cameraTrack.readyState === 'live') {
          cameraTrack = this.cameraTrack;
          console.log('✅ Using cached camera track');
        } else {
          // Request new camera track
          console.log('📹 Requesting new camera track...');
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
            audio: false,
          });
          cameraTrack = cameraStream.getVideoTracks()[0];
          
          // Update cached track
          if (cameraTrack) {
            this.cameraTrack = cameraTrack;
          }
        }
        
        if (!cameraTrack) {
          throw new Error('Failed to get camera track');
        }
        
        // Add camera track to local stream
        localStream.addTrack(cameraTrack);
        
        // Replace screen track with camera in all peer connections
        await this.replaceVideoTrackInAllPeers(cameraTrack, peers);
        
        console.log('✅ Camera restored successfully');
        
      } catch (error) {
        console.error('❌ Failed to restore camera:', error);
        // Don't throw - allow screen share to stop even if camera restore fails
      } finally {
        this.cameraRestorePromise = null;
      }
    })();
    
    return this.cameraRestorePromise;
  }
  
  private async replaceVideoTrackInAllPeers(
    newTrack: MediaStreamTrack,
    peers: Map<string, RTCPeerConnection>
  ): Promise<void> {
    const replacePromises = Array.from(peers.entries()).map(async ([userId, peerConnection]) => {
      try {
        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newTrack);
          console.log(`✅ Replaced video track for peer ${userId}`);
        } else {
          // No video sender exists, add track
          if (this.localStream) {
            peerConnection.addTrack(newTrack, this.localStream);
            console.log(`➕ Added video track to peer ${userId}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to replace video track for peer ${userId}:`, error);
        // Retry once after delay
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newTrack);
            console.log(`✅ Retry successful for peer ${userId}`);
          }
        } catch (retryError) {
          console.error(`❌ Retry failed for peer ${userId}:`, retryError);
        }
      }
    });
    
    // Use allSettled to not fail all if one fails
    await Promise.allSettled(replacePromises);
  }
  
  private isScreenShareSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  }
  
  isCurrentlySharing(): boolean {
    return this.isSharing;
  }
  
  getScreenTrack(): MediaStreamTrack | null {
    return this.screenTrack;
  }
}
```

**2.2. Screen Share với Camera Simultaneous (Optional - Advanced)**

```typescript
// Option: Support both camera and screen share simultaneously
// Requires adding screen track as separate track (not replacing camera)
class P2PDualVideoManager {
  async startScreenShareWithCamera(
    localStream: MediaStream,
    peers: Map<string, RTCPeerConnection>
  ): Promise<void> {
    // 1. Ensure camera is enabled
    const cameraTrack = localStream.getVideoTracks()[0];
    if (!cameraTrack || !cameraTrack.enabled) {
      // Enable camera first
      await this.enableCamera(localStream, peers);
    }
    
    // 2. Request screen share
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 } as any,
      audio: false,
    });
    const screenTrack = displayStream.getVideoTracks()[0];
    
    // 3. Add screen track to local stream (don't replace camera)
    localStream.addTrack(screenTrack);
    
    // 4. Add screen track to all peer connections as separate track
    // Note: This requires support for multiple video tracks in WebRTC
    // Most implementations use single video track, so this is optional
    
    // 5. UI will show both: camera in small PIP, screen large
  }
}
```

---

### 3. PEER CONNECTION MANAGEMENT (P2P WebRTC)

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/hooks/use-webrtc.ts`

```typescript
// Vấn đề 1: Negotiation race conditions
pc.onnegotiationneeded = async () => {
  // Prevent negotiation during track replacement
  if (isReplacingTracksRef.current) {
    return; // Nhưng có thể miss negotiation khi thực sự cần
  }
  
  // Prevent negotiation during signaling state changes
  if (pc.signalingState !== 'stable') {
    return; // Có thể gây deadlock
  }
  
  // Wait a bit - không đảm bảo state sẽ stable
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Create offer
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    iceRestart: false,
  });
  // ...
};
```

**Vấn đề:**
- ❌ Negotiation có thể bị skip khi cần thiết
- ❌ Race conditions giữa multiple negotiation attempts
- ❌ `isReplacingTracksRef` flag không đảm bảo atomicity
- ❌ Wait 100ms không đảm bảo state sẽ stable

**Vấn đề 2: ICE candidate handling**

```typescript
// ICE candidates có thể đến trước khi remote description được set
const handleIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
  const peer = peersRef.current.get(data.fromUserId);
  if (peer && peer.connection.remoteDescription && data.candidate) {
    await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
  } else {
    // Queue for later - nhưng có thể queue quá nhiều
    pendingCandidates.current.get(data.fromUserId)!.push(data.candidate);
  }
};
```

**Vấn đề:**
- ❌ Pending candidates queue có thể phình to
- ❌ Không có limit cho queue size
- ❌ Candidates có thể expire nếu queue quá lâu

**Vấn đề 3: Connection recovery**

```typescript
pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'failed') {
    // Attempt ICE restart - nhưng không đảm bảo success
    if (pc.restartIce) {
      pc.restartIce();
    }
  }
};
```

**Vấn đề:**
- ❌ ICE restart có thể fail nhiều lần
- ❌ Không có exponential backoff
- ❌ Không notify user về connection issues

**Vấn đề 4: Track order inconsistency**

```typescript
// Add tracks in consistent order (audio first, then video)
tracks.filter(track => track.kind === 'audio').forEach(track => {
  pc.addTrack(track, localStreamRef.current!);
});
tracks.filter(track => track.kind === 'video').forEach(track => {
  pc.addTrack(track, localStreamRef.current!);
});
```

**Vấn đề:**
- ❌ Track order có thể khác nhau giữa các peers
- ❌ SDP m-line order phụ thuộc vào thứ tự addTrack
- ❌ Có thể gây issues với một số WebRTC implementations

#### Chiến lược cải thiện:

**3.1. Peer Connection Manager với Proper Negotiation Handling**

```typescript
class P2PPeerConnectionManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private negotiationQueue: Map<string, Promise<void>> = new Map();
  private isNegotiating: Map<string, boolean> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private readonly MAX_PENDING_CANDIDATES = 50;
  
  createPeerConnection(targetUserId: string, localStream: MediaStream): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers for NAT traversal
        // { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' },
      ],
      iceCandidatePoolSize: 10,
    });
    
    // Add tracks in consistent order (audio first, then video)
    const audioTracks = localStream.getAudioTracks();
    const videoTracks = localStream.getVideoTracks();
    
    audioTracks.forEach(track => {
      pc.addTrack(track, localStream);
    });
    videoTracks.forEach(track => {
      pc.addTrack(track, localStream);
    });
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.handleIceCandidate(targetUserId, event.candidate);
      }
    };
    
    // Handle negotiation with queue
    pc.onnegotiationneeded = async () => {
      await this.handleNegotiationNeeded(targetUserId, pc);
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      this.handleConnectionStateChange(targetUserId, pc);
    };
    
    // Handle incoming tracks
    pc.ontrack = (event) => {
      this.handleTrack(targetUserId, event);
    };
    
    this.peers.set(targetUserId, pc);
    return pc;
  }
  
  private async handleNegotiationNeeded(userId: string, pc: RTCPeerConnection): Promise<void> {
    // Prevent concurrent negotiations
    if (this.isNegotiating.get(userId)) {
      console.log(`⏸️ Negotiation already in progress for ${userId}`);
      return;
    }
    
    // Check if there's already a queued negotiation
    if (this.negotiationQueue.has(userId)) {
      console.log(`⏸️ Negotiation queued for ${userId}`);
      return;
    }
    
    // Queue negotiation
    const negotiationPromise = (async () => {
      try {
        this.isNegotiating.set(userId, true);
        
        // Wait for stable state
        await this.waitForStableState(pc);
        
        // Create offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          iceRestart: false,
        });
        
        await pc.setLocalDescription(offer);
        
        // Send offer via Socket.IO
        this.socket.emit('webrtc:offer', {
          targetUserId: userId,
          offer: pc.localDescription,
        });
        
        console.log(`✅ Negotiation completed for ${userId}`);
        
      } catch (error) {
        console.error(`❌ Negotiation failed for ${userId}:`, error);
      } finally {
        this.isNegotiating.set(userId, false);
        this.negotiationQueue.delete(userId);
      }
    })();
    
    this.negotiationQueue.set(userId, negotiationPromise);
    await negotiationPromise;
  }
  
  private async waitForStableState(pc: RTCPeerConnection, maxWait: number = 1000): Promise<void> {
    const startTime = Date.now();
    
    while (pc.signalingState !== 'stable' && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (pc.signalingState !== 'stable') {
      console.warn(`⚠️ PeerConnection ${pc} not stable after ${maxWait}ms, current state: ${pc.signalingState}`);
    }
  }
  
  private handleIceCandidate(userId: string, candidate: RTCIceCandidate | null): void {
    if (!candidate) return;
    
    const peer = this.peers.get(userId);
    if (!peer) return;
    
    // Check if we can add candidate immediately
    if (peer.remoteDescription) {
      peer.addIceCandidate(candidate).catch(err => {
        console.error(`❌ Failed to add ICE candidate for ${userId}:`, err);
      });
    } else {
      // Queue candidate
      const queue = this.pendingCandidates.get(userId) || [];
      
      // Limit queue size to prevent memory issues
      if (queue.length >= this.MAX_PENDING_CANDIDATES) {
        console.warn(`⚠️ Too many pending ICE candidates for ${userId}, dropping oldest`);
        queue.shift();
      }
      
      queue.push(candidate.toJSON());
      this.pendingCandidates.set(userId, queue);
    }
  }
  
  async processPendingCandidates(userId: string): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer || !peer.remoteDescription) return;
    
    const pending = this.pendingCandidates.get(userId) || [];
    if (pending.length === 0) return;
    
    console.log(`📥 Processing ${pending.length} pending ICE candidates for ${userId}`);
    
    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error(`❌ Failed to add pending ICE candidate:`, error);
      }
    }
    
    this.pendingCandidates.delete(userId);
  }
  
  private handleConnectionStateChange(userId: string, pc: RTCPeerConnection): void {
    console.log(`🔗 Connection state for ${userId}: ${pc.connectionState}`);
    
    if (pc.connectionState === 'failed') {
      this.handleConnectionFailed(userId, pc);
    } else if (pc.connectionState === 'disconnected') {
      // Attempt to reconnect
      this.attemptReconnect(userId, pc);
    }
  }
  
  private async handleConnectionFailed(userId: string, pc: RTCPeerConnection): Promise<void> {
    console.log(`❌ Connection failed for ${userId}, attempting ICE restart...`);
    
    try {
      // Attempt ICE restart with exponential backoff
      let attempt = 0;
      const maxAttempts = 3;
      const baseDelay = 1000;
      
      while (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (pc.restartIce) {
          pc.restartIce();
          console.log(`🔄 ICE restart attempt ${attempt + 1} for ${userId}`);
        }
        
        // Wait a bit and check if connection improved
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (pc.connectionState === 'connected' || pc.connectionState === 'connecting') {
          console.log(`✅ Connection recovered for ${userId}`);
          return;
        }
        
        attempt++;
      }
      
      console.error(`❌ Failed to recover connection for ${userId} after ${maxAttempts} attempts`);
      // Notify user about connection issues
      this.emit('connection-failed', { userId });
      
    } catch (error) {
      console.error(`❌ Error during connection recovery:`, error);
    }
  }
  
  private async attemptReconnect(userId: string, pc: RTCPeerConnection): Promise<void> {
    // Light reconnect attempt - just wait and let WebRTC handle it
    setTimeout(() => {
      if (pc.connectionState === 'disconnected') {
        console.log(`🔄 Attempting to reconnect to ${userId}...`);
        // WebRTC should automatically attempt to reconnect
      }
    }, 2000);
  }
  
  private handleTrack(userId: string, event: RTCTrackEvent): void {
    console.log(`📥 Received ${event.track.kind} track from ${userId}`);
    const [stream] = event.streams;
    
    if (stream) {
      this.emit('track-received', { userId, stream, track: event.track });
    }
  }
  
  closePeerConnection(userId: string): void {
    const pc = this.peers.get(userId);
    if (pc) {
      pc.close();
      this.peers.delete(userId);
      this.negotiationQueue.delete(userId);
      this.isNegotiating.delete(userId);
      this.pendingCandidates.delete(userId);
    }
  }
  
  cleanup(): void {
    this.peers.forEach((pc, userId) => {
      this.closePeerConnection(userId);
    });
  }
}
```

**3.2. Layout Manager với Multiple Modes (cho P2P)**

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

**4.1. Layout Manager với Multiple Modes (cho P2P)**

```typescript
enum LayoutMode {
  GRID = 'grid',
  SPOTLIGHT = 'spotlight',
  SIDEBAR = 'sidebar',
  FOCUS = 'focus', // Focus on screen share
}

class P2PLayoutManager {
  private mode: LayoutMode = LayoutMode.GRID;
  private participants: IMeetingParticipant[] = [];
  private screenSharer: IMeetingParticipant | null = null;
  
  getLayout(mode: LayoutMode, participants: IMeetingParticipant[]): LayoutConfig {
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
  
  private getGridLayout(participants: IMeetingParticipant[]): LayoutConfig {
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
  
  private getSpotlightLayout(participants: IMeetingParticipant[]): LayoutConfig {
    // Speaker (active mic) gets large view
    const speaker = participants.find(p => p.is_speaking) || participants[0];
    const others = participants.filter(p => p.user.id !== speaker.user.id);
    
    return {
      type: 'spotlight',
      main: speaker,
      thumbnails: others.slice(0, 6), // Max 6 thumbnails
    };
  }
  
  private getFocusLayout(screenSharer: IMeetingParticipant | null, participants: IMeetingParticipant[]): LayoutConfig {
    if (!screenSharer) {
      return this.getGridLayout(participants);
    }
    
    return {
      type: 'focus',
      main: screenSharer,
      participants: participants.filter(p => p.user.id !== screenSharer.user.id),
    };
  }
  
  setScreenSharer(participant: IMeetingParticipant | null): void {
    this.screenSharer = participant;
  }
}

// Virtual scrolling cho video grid
class VirtualVideoGrid {
  private visibleRange: { start: number; end: number } = { start: 0, end: 9 };
  private itemHeight: number = 200; // Approximate height of each video tile
  
  calculateVisibleRange(scrollTop: number, containerHeight: number): void {
    const start = Math.floor(scrollTop / this.itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / this.itemHeight) + 2, // +2 for buffer
      this.totalItems
    );
    
    this.visibleRange = { start, end };
  }
  
  // Only render visible participants
  getVisibleParticipants(participants: IMeetingParticipant[]): IMeetingParticipant[] {
    return participants.slice(this.visibleRange.start, this.visibleRange.end);
  }
}
```

---

### 4. LAYOUT MANAGEMENT (Video Grid)

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/section/meetings/video-grid.tsx`

```typescript
// Vấn đề: Render tất cả participants, không có virtual scrolling
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {Array.from(peers.entries()).map(([userId, peer]) => {
    return <RemoteVideo stream={peer.stream} participant={participant} />;
  })}
</div>
```

**Vấn đề:**
- ❌ Render tất cả video elements, gây performance issues với nhiều participants
- ❌ Không có virtual scrolling
- ❌ Grid layout không responsive với viewport size
- ❌ Spotlight mode chưa hoàn thiện (chỉ highlight, không thay đổi layout)

### 5. CHAT SYSTEM (Socket.IO)

#### Vấn đề hiện tại:

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

**Vấn đề:**
- ❌ Message ordering có thể bị lỗi nếu messages đến gần nhau
- ❌ Không có pagination cho messages cũ
- ❌ Performance với nhiều messages (load tất cả một lúc)
- ❌ Offline message queue chưa có

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

### 6. USER MANAGEMENT (Host Moderation)

#### Vấn đề hiện tại:

**File:** `talkplatform-frontend/components/meeting/meeting-participants-panel.tsx`

```typescript
// Vấn đề: Host moderation actions emit Socket.IO events nhưng không sync với WebRTC tracks
const handleMuteParticipant = (participantId: string) => {
  socket.emit('admin:mute-user', { userId: participantId, isMuted: true });
  // Nhưng WebRTC tracks không bị force mute ngay
};
```

**Vấn đề:**
- ❌ Host moderation chỉ update database, không enforce trên MediaStream level
- ❌ Participant có thể unmute local track → conflict
- ❌ Duplicate events có thể xảy ra nếu emit nhiều lần
- ❌ Race conditions khi toggle nhanh

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

**6.1. Event Deduplication với Proper State Management**

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

**6.2. Atomic Moderation Actions cho P2P**

```typescript
class P2PModerationManager {
  private actionQueue: ModerationAction[] = [];
  private isProcessing = false;
  private mediaManager: P2PMediaManager;
  private socket: Socket;
  
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
        // 1. Update database via Socket.IO
        await this.updateDatabase(action);
        
        // 2. For local participant: Enforce on MediaStream level
        if (action.userId === this.currentUserId) {
          await this.enforceOnMediaStream(action);
        }
        
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
  
  private async enforceOnMediaStream(action: ModerationAction): Promise<void> {
    if (action.type === 'mute') {
      // Force mic state on MediaStream track
      await this.mediaManager.forceMicrophoneState(action.mute);
    } else if (action.type === 'video-off') {
      // Force camera state on MediaStream track
      await this.mediaManager.forceCameraState(action.videoOff);
    }
  }
  
  private async updateDatabase(action: ModerationAction): Promise<void> {
    return new Promise((resolve, reject) => {
      const eventName = action.type === 'mute' ? 'admin:mute-user' : 'admin:video-off-user';
      
      this.socket.emit(eventName, {
        userId: action.userId,
        isMuted: action.mute ?? false,
        isVideoOff: action.videoOff ?? false,
      }, (response: { success: boolean }) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error('Server rejected moderation action'));
        }
      });
    });
  }
}
```

---

## 🚀 CHIẾN LƯỢC CẢI THIỆN

### Phase 0: Foundation & Migration Setup - Priority: CRITICAL

**Timeline:** 2 weeks (Week 0-1)

> **⚠️ IMPORTANT:** Phase 0 phải hoàn thành trước khi bắt đầu các phases khác.  
> Đây là foundation cho toàn bộ implementation.

#### Tasks:
1. ✅ **Testing Infrastructure Setup**
   - Install Vitest, Testing Library, WebRTC mocks
   - Create test configuration và setup files
   - Create test utilities for WebRTC testing
   - Write example tests

2. ✅ **Migration Strategy**
   - Document migration plan từ old gateway sang new gateway
   - Update EVENT_MIGRATION_MAP.md
   - Define feature flag strategy
   - Create rollout plan

3. ✅ **Base Classes & Interfaces**
   - Create directory structure (`services/p2p/`)
   - Define base types (`p2p-types.ts`, `p2p-events.ts`)
   - Create `BaseP2PManager` class
   - Export all types correctly

4. ✅ **Architecture Documentation**
   - Create architecture overview với diagrams
   - Document component responsibilities
   - Create sequence diagrams cho WebRTC flows
   - Document security considerations

5. ✅ **Monitoring & Metrics Setup**
   - Create `P2PMetricsCollector` class
   - Implement stats collection
   - Setup metrics reporting

#### Files to create:
```
talkplatform-frontend/
  ├── vitest.config.ts (NEW)
  ├── tests/
  │   ├── setup.ts (NEW)
  │   └── utils/
  │       └── webrtc-test-utils.ts (NEW)
  ├── services/
  │   └── p2p/
  │       ├── core/
  │       │   └── base-p2p-manager.ts (NEW)
  │       ├── types/
  │       │   ├── p2p-types.ts (NEW)
  │       │   ├── p2p-events.ts (NEW)
  │       │   └── index.ts (NEW)
  │       └── utils/
  │           └── p2p-metrics-collector.ts (NEW)
  └── hooks/
      └── __tests__/
          └── use-webrtc.test.ts (NEW)

docs/
  ├── PHASE_0_FOUNDATION.md (NEW)
  ├── P2P_MIGRATION_STRATEGY.md (NEW)
  ├── P2P_ARCHITECTURE.md (NEW)
  └── P2P_SEQUENCE_DIAGRAMS.md (NEW)
```

#### Deliverables:
- [ ] Testing infrastructure hoàn chỉnh và working
- [ ] Migration strategy document với rollout plan
- [ ] Base classes và types cho tất cả managers
- [ ] Architecture documentation với diagrams
- [ ] Metrics collection framework

**📖 Chi tiết:** Xem `docs/PHASE_0_FOUNDATION.md`

---

### Phase 1: Media Controls (Mic/Cam) - Priority: CRITICAL

**Timeline:** 1-2 weeks

#### Tasks:
1. ✅ Tạo `P2PMediaManager` class để quản lý unified state
2. ✅ Implement `P2PStreamManager` cho stream lifecycle
3. ✅ Implement `P2PTrackStateSync` cho state synchronization
4. ✅ Refactor `use-webrtc.ts` để sử dụng P2PMediaManager
5. ✅ Update `meeting-room.tsx` để sử dụng new system
6. ✅ Testing: Mic/Cam toggle, device switching, permission handling

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   ├── p2p-media-manager.ts (NEW)
  │   ├── p2p-stream-manager.ts (NEW)
  │   └── p2p-track-state-sync.ts (NEW)
  ├── hooks/
  │   └── use-webrtc.ts (REFACTOR)
  └── section/meetings/
      └── meeting-room.tsx (REFACTOR)
```

### Phase 2: Peer Connection Management - Priority: CRITICAL

**Timeline:** 1 week

#### Tasks:
1. ✅ Tạo `P2PPeerConnectionManager` class
2. ✅ Implement negotiation queue để tránh race conditions
3. ✅ Implement proper ICE candidate handling với queue limits
4. ✅ Implement connection recovery với exponential backoff
5. ✅ Testing: Multiple peers, connection failures, ICE restart

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   └── p2p-peer-connection-manager.ts (NEW)
  ├── hooks/
  │   └── use-webrtc.ts (REFACTOR)
```

### Phase 3: Screen Sharing - Priority: HIGH

**Timeline:** 1 week

#### Tasks:
1. ✅ Tạo `P2PScreenShareManager` class
2. ✅ Implement error handling và browser compatibility checks
3. ✅ Implement cleanup on user stop (browser UI)
4. ✅ Implement camera restoration logic
5. ✅ Testing: Start/stop screen share, browser compatibility, error scenarios

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   └── p2p-screen-share-manager.ts (NEW)
  ├── hooks/
  │   └── use-webrtc.ts (UPDATE)
  └── section/meetings/
      └── meeting-room.tsx (UPDATE)
```

### Phase 4: Layout Management - Priority: MEDIUM

**Timeline:** 1-2 weeks

#### Tasks:
1. ✅ Tạo `P2PLayoutManager` class với multiple modes
2. ✅ Implement grid layout với virtual scrolling
3. ✅ Implement spotlight mode
4. ✅ Implement focus mode (screen share)
5. ✅ Performance optimization
6. ✅ Testing: Layout switching, performance với nhiều participants

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   └── p2p-layout-manager.ts (NEW)
  ├── section/meetings/
  │   ├── video-grid.tsx (REFACTOR)
  │   └── meeting-room.tsx (UPDATE)
```

### Phase 5: Chat System - Priority: MEDIUM

**Timeline:** 1 week

#### Tasks:
1. ✅ Tạo `ChatManager` class
2. ✅ Implement message ordering
3. ✅ Implement pagination
4. ✅ Implement offline message queue
5. ✅ Testing: Message ordering, pagination, offline handling

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

### Phase 6: User Management - Priority: HIGH

**Timeline:** 1 week

#### Tasks:
1. ✅ Tạo `EventDeduplicator` class
2. ✅ Tạo `P2PModerationManager` class
3. ✅ Implement atomic moderation actions với WebRTC track enforcement
4. ✅ Fix race conditions
5. ✅ Testing: Host moderation, duplicate events, race conditions

#### Files to create/modify:
```
talkplatform-frontend/
  ├── services/
  │   ├── event-deduplicator.ts (NEW)
  │   └── p2p-moderation-manager.ts (NEW)
  └── components/meeting/
      └── meeting-participants-panel.tsx (REFACTOR)
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
| **Phase 0:** Foundation & Migration | 🔴 CRITICAL | Medium | Very High | Week 0-1 |
| **Phase 1:** Mic/Cam Controls | 🔴 CRITICAL | High | Very High | Week 2-4 |
| **Phase 2:** Peer Connection Management | 🔴 CRITICAL | Medium | Very High | Week 4-5 |
| **Phase 3:** Screen Sharing | 🟠 HIGH | Medium | High | Week 5-6 |
| **Phase 6:** User Management | 🟠 HIGH | Medium | High | Week 6-7 |
| **Phase 5:** Chat System | 🟡 MEDIUM | Low | Medium | Week 7-8 |
| **Phase 4:** Layout Management | 🟡 MEDIUM | High | Medium | Week 8-10 |

**Total Timeline:** 10-12 weeks (2.5-3 months)

**Note:** Phase 0 là prerequisite cho tất cả phases khác. Không thể skip Phase 0.

---

## ✅ ACCEPTANCE CRITERIA

### Mic/Cam Controls (P2P)
- [ ] No duplicate permission requests
- [ ] State sync between database and MediaStream works correctly
- [ ] Track replacement in all peer connections works reliably
- [ ] Device switching works without errors
- [ ] Host moderation actions enforce on MediaStream level
- [ ] No race conditions when toggling quickly

### Peer Connection Management
- [ ] No negotiation race conditions
- [ ] ICE candidates are handled properly (queue + process)
- [ ] Connection recovery works with exponential backoff
- [ ] Track order is consistent (audio first, then video)
- [ ] Connection state changes are handled gracefully

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

1. **Review và approve** chiến lược này (bao gồm Phase 0)
2. **Start Phase 0** (Foundation & Migration Setup) - CRITICAL
   - Setup testing infrastructure
   - Create migration strategy
   - Build base classes
   - Document architecture
3. **Create detailed tickets** cho Phase 0 tasks
4. **Daily standup** để track progress
5. **Weekly review** để adjust timeline nếu cần
6. **Sau khi Phase 0 complete:** Start Phase 1 (Media Controls)

---

**Document Version**: 3.0  
**Created**: 2025-12-06  
**Last Updated**: 2025-12-08  
**Author**: AI Assistant  
**Status**: Updated with Phase 0  
**Focus**: P2P WebRTC Meeting Room với Foundation Phase  
**Changes in v3.0:**
- ✅ Added Phase 0: Foundation & Migration Setup
- ✅ Updated priority matrix với Phase 0
- ✅ Adjusted timeline: 10-12 weeks total
- ✅ Created detailed Phase 0 documentation
- ✅ Updated next steps to start with Phase 0

