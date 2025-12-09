import { BaseP2PManager } from './base-p2p-manager';
import { P2PMediaState, MediaManagerConfig, P2PErrorType } from '../types';
import { createP2PError, P2PErrorClass } from '../utils/p2p-error';
import { P2PTrackStateSync } from './p2p-track-state-sync';
import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * P2P Media Manager
 * 
 * Manages microphone and camera state with:
 * - Unified state management (single source of truth)
 * - Atomic track replacement with retry mechanism
 * - Database synchronization with Optimistic UI pattern
 * - Host moderation enforcement
 * - Device management
 */
export class P2PMediaManager extends BaseP2PManager {
  private state: P2PMediaState;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null; // 🔥 NEW: Separate screen stream
  private peers: Map<string, RTCPeerConnection> = new Map();
  private currentVideoDeviceId: string | null = null;
  private currentAudioDeviceId: string | null = null;

  // Retry configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 500; // ms

  // Throttle configuration for state fetching
  private lastFetchMicStateTime = 0;
  private readonly FETCH_STATE_THROTTLE_MS = 1000; // 1 second
  private stateSyncRef: P2PTrackStateSync | null = null; // 🔥 NEW: Reference to state sync manager

  constructor(config: MediaManagerConfig) {
    super(config.socket, config.meetingId, config.userId, config.useNewGateway ?? false);

    this.state = {
      mic: {
        enabled: false,
        track: null,
        isMuted: false,
        isForced: false,
        deviceId: null,
      },
      camera: {
        enabled: false,
        track: null,
        isVideoOff: false,
        isForced: false,
        deviceId: null,
      },
      screen: {
        isSharing: false,
        track: null,
        stream: null,
      },
    };
  }

  /**
   * Initialize manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('warn', 'Manager already initialized');
      return;
    }

    // Setup socket event listeners
    this.setupSocketListeners();

    this.isInitialized = true;
    this.log('info', 'P2PMediaManager initialized');
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    // Listen for host moderation events
    this.onSocketEvent('media:user-muted', (data: { userId: string; isMuted: boolean }) => {
      if (data.userId === this.userId) {
        // 🔥 FIX: Only handle if state mismatch (reconciliation)
        // Ignore our own echo from backend to prevent loop
        if (this.state.mic.isMuted !== data.isMuted) {
          this.log('info', 'Reconciling mic state from server', {
            local: this.state.mic.isMuted,
            server: data.isMuted
          });
          this.handleForcedMute(data.isMuted);
        }
        return;
      }
      // From another user - it's host moderation
      this.handleForcedMute(data.isMuted);
    });

    this.onSocketEvent('media:user-video-off', (data: { userId: string; isVideoOff: boolean }) => {
      if (data.userId === this.userId) {
        // 🔥 FIX: Only handle if state mismatch (reconciliation)
        if (this.state.camera.isVideoOff !== data.isVideoOff) {
          this.log('info', 'Reconciling camera state from server', {
            local: this.state.camera.isVideoOff,
            server: data.isVideoOff
          });
          this.handleForcedVideoOff(data.isVideoOff);
        }
        return;
      }
      // From another user - it's host moderation
      this.handleForcedVideoOff(data.isVideoOff);
    });
  }

  /**
   * Initialize local stream
   */
  async initializeLocalStream(
    audioEnabled: boolean = true,
    videoEnabled: boolean = true,
    deviceIds?: { audioDeviceId?: string; videoDeviceId?: string }
  ): Promise<MediaStream> {
    try {
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

      // Extract device IDs
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      if (audioTrack) {
        this.currentAudioDeviceId = audioTrack.getSettings().deviceId || null;
        this.state.mic.deviceId = this.currentAudioDeviceId;
        this.state.mic.track = audioTrack;
        this.state.mic.enabled = audioTrack.enabled;
        this.state.mic.isMuted = !audioTrack.enabled;
      }

      if (videoTrack) {
        this.currentVideoDeviceId = videoTrack.getSettings().deviceId || null;
        this.state.camera.deviceId = this.currentVideoDeviceId;
        this.state.camera.track = videoTrack;
        this.state.camera.enabled = videoTrack.enabled;
        this.state.camera.isVideoOff = !videoTrack.enabled;
      }

      this.log('info', 'Local stream initialized', {
        hasAudio: !!audioTrack,
        hasVideo: !!videoTrack,
      });

      return stream;
    } catch (error: any) {
      this.log('error', 'Failed to initialize local stream', { error: error.message });
      throw createP2PError(P2PErrorType.PERMISSION_DENIED, 'Failed to get user media', error);
    }
  }

  /**
   * Enable/disable microphone
   */
  async enableMicrophone(enabled: boolean): Promise<void> {
    if (!this.localStream) {
      throw createP2PError(P2PErrorType.DEVICE_NOT_FOUND, 'Local stream not initialized');
    }

    // 🔥 FIX: Prevent infinite loop from backend echo
    if (this.state.mic.enabled === enabled) {
      this.log('debug', 'Microphone already in desired state', { enabled });
      return;
    }

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) {
      throw createP2PError(P2PErrorType.DEVICE_NOT_FOUND, 'No audio track found');
    }

    // 🔥 FIX: Nới lỏng điều kiện kiểm tra host moderation
    // Chỉ chặn nếu host thực sự đang FORCE tắt (isForced = true) VÀ user đang cố bật lại
    // Logic cũ quá chặt, chặn cả khi user tự toggle
    // TODO: Cần logic check role chặt chẽ hơn sau này để phân biệt user tự toggle vs host force
    if (this.state.mic.isForced && !enabled && !this.state.mic.isMuted) {
      // Host đang force mute, user không thể tự bật lại
      this.log('warn', 'Mic state change blocked by host moderation - host has forced mute');
      return;
    }
    // Allow all other cases (user can toggle freely unless host is actively forcing)

    // Update track state (Optimistic UI - update immediately)
    audioTrack.enabled = enabled;
    this.state.mic.enabled = enabled;
    this.state.mic.isMuted = !enabled;

    // Emit state change immediately for React (Optimistic UI)
    this.emit('mic-state-changed', {
      enabled,
      isMuted: !enabled,
      isForced: this.state.mic.isForced,
    });

    // Update database (async, don't block - Optimistic UI pattern)
    // UI already updated above, sync happens in background
    // If sync fails/timeout, fetchLatestMicState() will reconcile automatically
    this.syncMicToDatabase(!enabled).catch(err => {
      // This should rarely happen now (we resolve instead of reject on timeout)
      // But keep for other unexpected errors
      this.log('error', 'Unexpected error syncing mic state', { error: err.message });
      // Don't emit sync-error for timeout - it's handled silently with state reconciliation
      // Only emit for unexpected errors
      if (!err.message.includes('Timeout')) {
        this.emit('sync-error', {
          type: 'mic',
          error: err.message,
          action: 'toggle-mic',
        });
      }
    });

    this.log('info', `Microphone ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable camera
   */
  async enableCamera(enabled: boolean, deviceId?: string): Promise<void> {
    // Check current state - if already in desired state and no device change, skip
    const currentEnabled = this.state.camera.enabled && !this.state.camera.isVideoOff;
    if (enabled === currentEnabled && !deviceId) {
      // Already in desired state, no need to change
      this.log('debug', 'Camera already in desired state', { enabled, currentEnabled });
      return;
    }

    if (enabled) {
      await this.turnCameraOn(deviceId);
    } else {
      await this.turnCameraOff();
    }
  }

  /**
   * Turn camera ON
   */
  private async turnCameraOn(deviceId?: string): Promise<void> {
    try {
      // 🔥 FIX: Nới lỏng điều kiện kiểm tra host moderation
      // Chỉ chặn nếu host thực sự đang FORCE tắt (isForced = true) VÀ user đang cố bật lại
      // Logic cũ quá chặt, chặn cả khi user tự toggle
      // TODO: Cần logic check role chặt chẽ hơn sau này để phân biệt user tự toggle vs host force
      if (this.state.camera.isForced && !this.state.camera.isVideoOff) {
        // Host đang force video off, user không thể tự bật lại
        this.log('warn', 'Camera state change blocked by host moderation - host has forced video off');
        return;
      }
      // Allow all other cases (user can toggle freely unless host is actively forcing)

      // Use existing device ID if not specified
      const targetDeviceId = deviceId || this.currentVideoDeviceId;

      // Request new video track
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          ...(targetDeviceId && { deviceId: { exact: targetDeviceId } }),
        },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (!newVideoTrack) {
        throw new Error('No video track in new stream');
      }

      // Store device ID for future use
      this.currentVideoDeviceId = newVideoTrack.getSettings().deviceId || null;
      this.state.camera.deviceId = this.currentVideoDeviceId;

      // Replace old video track in localStream
      if (this.localStream) {
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          this.localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop(); // Stop old track to free resources
        }
        this.localStream.addTrack(newVideoTrack);
      }

      // 🔥 FIX: Replace track in ALL peer connections with retry mechanism
      // Note: this.peers should be synced from P2PPeerConnectionManager before calling this
      if (this.peers.size > 0) {
        await this.replaceVideoTrackInAllPeers(newVideoTrack);
      } else {
        this.log('warn', 'No peer connections available to replace video track. Make sure setPeerConnections() is called before toggling camera.');
      }

      // Update state (Optimistic UI - update immediately)
      this.state.camera.enabled = true;
      this.state.camera.track = newVideoTrack;
      this.state.camera.isVideoOff = false;

      // Emit state change immediately for React (Optimistic UI)
      this.emit('camera-state-changed', {
        enabled: true,
        isVideoOff: false,
        isForced: this.state.camera.isForced
      });

      // Update database (async, don't block - Optimistic UI pattern)
      // UI already updated above, sync happens in background
      this.syncCameraToDatabase(false).catch(err => {
        // This should rarely happen now (we resolve instead of reject on timeout)
        // But keep for other unexpected errors
        this.log('error', 'Unexpected error syncing camera state', { error: err.message });
        // Don't emit sync-error for timeout - it's handled silently with state reconciliation
        if (!err.message.includes('Timeout')) {
          this.emit('sync-error', {
            type: 'camera',
            error: err.message,
            action: 'enable-camera',
          });
        }
      });

      this.log('info', 'Camera turned ON');

      // Stop the temporary stream (we only needed the track)
      newStream.getTracks().forEach(track => {
        if (track !== newVideoTrack) track.stop();
      });

    } catch (error: any) {
      this.log('error', 'Failed to turn camera on', { error: error.message });
      throw createP2PError(P2PErrorType.DEVICE_NOT_FOUND, 'Failed to get video track', error);
    }
  }

  /**
   * Turn camera OFF
   */
  private async turnCameraOff(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      // 🔥 FIX: When turning camera OFF, we need to notify peers by replacing track with null
      // This ensures peers know camera is off (not just disabled locally)
      // Similar to v1 behavior but more explicit
      if (this.peers.size > 0) {
        try {
          // Replace video track with null in all peer connections
          const replacePromises = Array.from(this.peers.entries()).map(async ([userId, peerConnection]) => {
            try {
              const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video' && !s.track?.label.includes('screen'));
              if (sender) {
                await sender.replaceTrack(null);
                this.log('info', `Replaced video track with null for peer ${userId} (camera OFF)`);
              }
            } catch (error: any) {
              this.log('warn', `Failed to remove video track for peer ${userId}`, { error: error.message });
            }
          });
          await Promise.allSettled(replacePromises);
        } catch (error: any) {
          this.log('warn', 'Failed to notify peers about camera OFF', { error: error.message });
        }
      }

      videoTrack.enabled = false;
      this.state.camera.enabled = false;
      this.state.camera.isVideoOff = true;

      // Don't stop track, just disable (allows quick re-enable)
      // If we want to free resources, we can stop it:
      // videoTrack.stop();
      // this.localStream.removeTrack(videoTrack);

      // Emit state change immediately for React (Optimistic UI)
      this.emit('camera-state-changed', {
        enabled: false,
        isVideoOff: true,
        isForced: this.state.camera.isForced
      });

      // Update database (async, don't block - Optimistic UI pattern)
      // UI already updated above, sync happens in background
      this.syncCameraToDatabase(true).catch(err => {
        // This should rarely happen now (we resolve instead of reject on timeout)
        // But keep for other unexpected errors
        this.log('error', 'Unexpected error syncing camera state', { error: err.message });
        // Don't emit sync-error for timeout - it's handled silently with state reconciliation
        if (!err.message.includes('Timeout')) {
          this.emit('sync-error', {
            type: 'camera',
            error: err.message,
            action: 'disable-camera',
          });
        }
      });

      this.log('info', 'Camera turned OFF');
    }
  }

  /**
   * Replace video track in all peer connections với retry mechanism
   */
  private async replaceVideoTrackInAllPeers(newTrack: MediaStreamTrack): Promise<void> {
    const replacePromises = Array.from(this.peers.entries()).map(async ([userId, peerConnection]) => {
      let lastError: Error | null = null;

      // Retry logic
      for (let attempt = 0; attempt < this.MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newTrack);
            this.log('info', `Replaced video track for peer ${userId}`, { attempt: attempt + 1 });
            return; // Success, exit retry loop
          } else {
            // No video sender exists, add track
            if (this.localStream) {
              peerConnection.addTrack(newTrack, this.localStream);
              this.log('info', `Added video track to peer ${userId}`, { attempt: attempt + 1 });
              return;
            }
          }
        } catch (error: any) {
          lastError = error;
          this.log('warn', `Failed to replace video track for peer ${userId}`, {
            attempt: attempt + 1,
            error: error.message,
          });

          // Wait before retry
          if (attempt < this.MAX_RETRY_ATTEMPTS - 1) {
            await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (attempt + 1)));
          }
        }
      }

      // All retries failed
      this.log('error', `Failed to replace video track for peer ${userId} after ${this.MAX_RETRY_ATTEMPTS} attempts`, {
        error: lastError?.message,
      });
    });

    // Use allSettled to not fail all if one fails
    const results = await Promise.allSettled(replacePromises);

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      this.log('warn', `${failed} peer(s) failed to receive video track update`);
    }
  }

  /**
   * Handle host forced mute
   */
  private async handleForcedMute(muted: boolean): Promise<void> {
    this.state.mic.isForced = true;
    await this.enableMicrophone(!muted);
    // Don't allow user to change until host unmutes
  }

  /**
   * Handle host forced video off
   */
  private async handleForcedVideoOff(videoOff: boolean): Promise<void> {
    this.state.camera.isForced = true;
    await this.enableCamera(!videoOff);
    // Don't allow user to change until host allows
  }

  /**
   * Sync mic state to database
   * 
   * ⚠️ CRITICAL: Uses Optimistic UI pattern
   * - UI operation (mic toggle) already succeeded
   * - This sync is fire-and-forget
   * - If timeout, don't reject - just log warning and fetch latest state
   * - Rejecting on timeout causes state mismatch: Client shows error but Server actually updated
   */
  /**
   * Sync mic state to database (optimistic UI pattern)
   * - UI operation (mic toggle) already succeeded
   * - Backend doesn't send response callback, only broadcasts media:user-muted
   * - This is fire-and-forget - just emit and resolve immediately
   * - We listen to media:user-muted broadcast to confirm state
   */
  private async syncMicToDatabase(isMuted: boolean): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      this.log('debug', 'Skipping syncMicToDatabase: socket not connected');
      return;
    }

    // 🔥 FIX: Backend doesn't support response callback for media:toggle-mic
    // Just emit and resolve immediately (fire-and-forget)
    // Backend will broadcast media:user-muted which we already listen to
    this.emitSocketEvent('media:toggle-mic', { isMuted });

    // 🔥 NEW: Update lastSyncedState immediately (optimistic)
    // This prevents false conflict detection when our own broadcast comes back
    if (this.stateSyncRef) {
      this.stateSyncRef.updateLastSyncedState('mic', isMuted);
    }

    // Resolve immediately - optimistic UI pattern
    // If backend rejects, it will broadcast media:user-muted with correct state
    return Promise.resolve();
  }

  /**
   * Fetch latest mic state from server to reconcile after timeout/rejection
   */
  private async fetchLatestMicState(): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      this.log('debug', 'Skipping fetchLatestMicState: socket not connected');
      return;
    }

    // Throttle to prevent spam
    const now = Date.now();
    if (now - this.lastFetchMicStateTime < this.FETCH_STATE_THROTTLE_MS) {
      this.log('debug', 'Skipping fetchLatestMicState: throttled');
      return;
    }
    this.lastFetchMicStateTime = now;

    // Emit request for latest participant state
    // Backend should respond with current participant state
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log('warn', 'Timeout fetching latest mic state');
        resolve();
      }, 3000);

      // Listen for state update from server
      const handleStateUpdate = (data: { userId: string; isMuted: boolean }) => {
        if (data.userId === this.userId) {
          clearTimeout(timeout);
          this.offSocketEvent('media:user-muted', handleStateUpdate);

          // Update local state to match server
          if (this.state.mic.isMuted !== data.isMuted) {
            this.log('info', 'Reconciling mic state from server', { serverState: data.isMuted });
            this.state.mic.isMuted = data.isMuted;
            this.state.mic.enabled = !data.isMuted;

            // Update MediaStream track to match
            if (this.localStream) {
              const audioTrack = this.localStream.getAudioTracks()[0];
              if (audioTrack) {
                audioTrack.enabled = !data.isMuted;
              }
            }

            this.emit('mic-state-changed', {
              enabled: !data.isMuted,
              isMuted: data.isMuted,
              isForced: this.state.mic.isForced,
            });
          }

          resolve();
        }
      };

      this.onSocketEvent('media:user-muted', handleStateUpdate);

      // Request latest state (only if socket is connected)
      if (this.socket && this.socket.connected) {
        this.emitSocketEvent('room:request-participant-state', { userId: this.userId });
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });
  }

  /**
   * Sync camera state to database (optimistic UI pattern)
   * - UI operation (camera toggle) already succeeded
   * - Backend doesn't send response callback, only broadcasts media:user-video-off
   * - This is fire-and-forget - just emit and resolve immediately
   * - We listen to media:user-video-off broadcast to confirm state
   */
  private async syncCameraToDatabase(isVideoOff: boolean): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      this.log('debug', 'Skipping syncCameraToDatabase: socket not connected');
      return;
    }

    // 🔥 FIX: Backend doesn't support response callback for media:toggle-video
    // Just emit and resolve immediately (fire-and-forget)
    // Backend will broadcast media:user-video-off which we already listen to
    this.emitSocketEvent('media:toggle-video', { isVideoOff });

    // 🔥 NEW: Update lastSyncedState immediately (optimistic)
    // This prevents false conflict detection when our own broadcast comes back
    if (this.stateSyncRef) {
      this.stateSyncRef.updateLastSyncedState('camera', isVideoOff);
    }

    // Resolve immediately - optimistic UI pattern
    // If backend rejects, it will broadcast media:user-video-off with correct state
    return Promise.resolve();
  }

  /**
   * Fetch latest camera state from server to reconcile after timeout/rejection
   * 
   * This is called automatically when syncCameraToDatabase times out or is rejected.
   * It ensures client state matches server state even if sync failed.
   */
  private async fetchLatestCameraState(): Promise<void> {
    if (!this.socket) return;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log('warn', 'Timeout fetching latest camera state from server');
        resolve(); // Resolve anyway - don't block
      }, 3000);

      // Listen for state update from server
      // Backend should emit 'media:user-video-off' when participant state is requested
      const handleStateUpdate = (data: { userId: string; isVideoOff: boolean }) => {
        if (data.userId === this.userId) {
          clearTimeout(timeout);
          this.offSocketEvent('media:user-video-off', handleStateUpdate);

          // Update local state to match server (reconciliation)
          if (this.state.camera.isVideoOff !== data.isVideoOff) {
            this.log('info', 'Reconciling camera state from server', {
              localState: this.state.camera.isVideoOff,
              serverState: data.isVideoOff
            });

            this.state.camera.isVideoOff = data.isVideoOff;
            this.state.camera.enabled = !data.isVideoOff;

            // Update MediaStream track to match server state
            if (this.localStream) {
              const videoTrack = this.localStream.getVideoTracks()[0];
              if (videoTrack) {
                videoTrack.enabled = !data.isVideoOff;
              }
            }

            // Emit state change to trigger React re-render via useSyncExternalStore
            this.emit('camera-state-changed', {
              enabled: !data.isVideoOff,
              isVideoOff: data.isVideoOff,
              isForced: this.state.camera.isForced,
            });
          }

          resolve();
        }
      };

      this.onSocketEvent('media:user-video-off', handleStateUpdate);

      // Request latest state from server
      // Backend should respond with current participant state
      this.emitSocketEvent('room:request-participant-state', { userId: this.userId });
    });
  }

  /**
   * Set state sync manager reference
   * 🔥 NEW: Allows updating lastSyncedState after successful sync
   */
  setStateSync(stateSync: P2PTrackStateSync | null): void {
    this.stateSyncRef = stateSync;
    this.log('debug', 'State sync manager linked');
  }

  /**
   * Set peer connections
   */
  setPeerConnections(peers: Map<string, RTCPeerConnection>): void {
    this.peers = peers;
  }

  /**
   * Get current state
   * 
   * CRITICAL: For use with useSyncExternalStore, use getMicState() or getCameraState()
   * to get primitive values instead of whole state object to prevent unnecessary re-renders.
   * 
   * If you need full state, use this method but be aware it creates a new object each time.
   */
  getState(): P2PMediaState {
    return { ...this.state };
  }

  /**
   * Get mic state as primitive values (for useSyncExternalStore)
   * Returns primitive boolean to ensure reference equality in React
   */
  getMicState(): {
    enabled: boolean;
    isMuted: boolean;
    isForced: boolean;
  } {
    return {
      enabled: this.state.mic.enabled,
      isMuted: this.state.mic.isMuted,
      isForced: this.state.mic.isForced,
    };
  }

  /**
   * Get camera state as primitive values (for useSyncExternalStore)
   * Returns primitive boolean to ensure reference equality in React
   */
  getCameraState(): {
    enabled: boolean;
    isVideoOff: boolean;
    isForced: boolean;
  } {
    return {
      enabled: this.state.camera.enabled,
      isVideoOff: this.state.camera.isVideoOff,
      isForced: this.state.camera.isForced,
    };
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get screen stream (separate from camera)
   * 🔥 NEW: For displaying screen share separately
   */
  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  /**
   * Set screen stream (separate from camera)
   * 🔥 NEW: Called when starting/stopping screen share
   */
  setScreenStream(stream: MediaStream | null): void {
    this.screenStream = stream;

    // Update state
    if (stream) {
      const screenTrack = stream.getVideoTracks()[0] || null;
      this.state.screen.isSharing = true;
      this.state.screen.track = screenTrack;
      this.state.screen.stream = stream;
    } else {
      this.state.screen.isSharing = false;
      this.state.screen.track = null;
      this.state.screen.stream = null;
    }

    this.emit('screen-stream-changed', stream);
    this.emit('screen-state-changed');
  }

  /**
   * Switch camera device
   */
  async switchCamera(deviceId: string): Promise<void> {
    if (this.state.camera.enabled) {
      await this.enableCamera(true, deviceId);
    } else {
      // Store device ID for when camera is enabled
      this.currentVideoDeviceId = deviceId;
      this.state.camera.deviceId = deviceId;
    }
  }

  /**
   * Switch microphone device
   */
  async switchMicrophone(deviceId: string): Promise<void> {
    if (!this.localStream) {
      throw createP2PError(P2PErrorType.DEVICE_NOT_FOUND, 'Local stream not initialized');
    }

    try {
      // Get new audio track with device ID
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });

      const newAudioTrack = audioStream.getAudioTracks()[0];
      if (!newAudioTrack) {
        throw new Error('No audio track in new stream');
      }

      // Replace old audio track
      const oldAudioTrack = this.localStream.getAudioTracks()[0];
      if (oldAudioTrack) {
        this.localStream.removeTrack(oldAudioTrack);
        oldAudioTrack.stop();
      }

      this.localStream.addTrack(newAudioTrack);

      // Replace in all peers
      for (const [userId, peerConnection] of this.peers.entries()) {
        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) {
          await sender.replaceTrack(newAudioTrack);
        }
      }

      this.currentAudioDeviceId = deviceId;
      this.state.mic.deviceId = deviceId;
      this.state.mic.track = newAudioTrack;

      this.log('info', 'Microphone device switched', { deviceId });

      // Stop temporary stream
      audioStream.getTracks().forEach(track => {
        if (track !== newAudioTrack) track.stop();
      });

    } catch (error: any) {
      this.log('error', 'Failed to switch microphone', { error: error.message });
      throw createP2PError(P2PErrorType.DEVICE_NOT_FOUND, 'Failed to switch microphone', error);
    }
  }

  /**
   * Sync all media states to server
   * 🔥 FIX 3: NEW - Call this after reconnection
   */
  public async syncAllStatesToServer(): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      this.log('warn', 'Cannot sync states: socket not connected');
      return;
    }

    const state = this.getState();

    this.log('info', 'Syncing all media states to server', {
      isMuted: state.mic.isMuted,
      isVideoOff: state.camera.isVideoOff,
      isScreenSharing: state.screen.isSharing
    });

    try {
      // Sync mic state
      await this.syncMicToDatabase(state.mic.isMuted);

      // Sync camera state
      await this.syncCameraToDatabase(state.camera.isVideoOff);

      // Sync screen share state
      if (this.socket) {
        this.emitSocketEvent('media:screen-share', {
          roomId: this.meetingId,
          userId: this.userId,
          isSharing: state.screen.isSharing
        });
        
        // 🔥 FIX: Also emit media:state-update for UnifiedRoomGateway
        // This ensures state is synced to RoomStateManager (Redis/DB)
        this.emitSocketEvent('media:state-update', {
          roomId: this.meetingId,
          isMuted: state.mic.isMuted,
          isVideoOff: state.camera.isVideoOff,
          isScreenSharing: state.screen.isSharing,
        });
      }

      this.log('info', '✅ All media states synced to server');
    } catch (error) {
      this.log('error', 'Failed to sync media states:', error);
    }
  }

  /**
   * Cleanup
   * CRITICAL: Must cleanup all tracked listeners to prevent duplicate listeners
   */
  cleanup(): void {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // 🔥 NEW: Stop screen stream tracks
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    // Cleanup state
    this.state.mic.track = null;
    this.state.camera.track = null;
    this.state.screen.track = null;
    this.state.screen.stream = null;

    // Remove socket listeners (with tracked cleanup)
    this.cleanupTrackedListeners();

    this.isInitialized = false;
    this.log('info', 'P2PMediaManager cleaned up');
  }
}

