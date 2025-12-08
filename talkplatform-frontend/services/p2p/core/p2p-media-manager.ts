import { BaseP2PManager } from './base-p2p-manager';
import { P2PMediaState, MediaManagerConfig, P2PErrorType } from '../types';
import { createP2PError, P2PErrorClass } from '../utils/p2p-error';
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
  private peers: Map<string, RTCPeerConnection> = new Map();
  private currentVideoDeviceId: string | null = null;
  private currentAudioDeviceId: string | null = null;
  
  // Retry configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 500; // ms

  constructor(config: MediaManagerConfig) {
    super(config.socket, config.meetingId, config.userId);
    
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
        this.handleForcedMute(data.isMuted);
      }
    });

    this.onSocketEvent('media:user-video-off', (data: { userId: string; isVideoOff: boolean }) => {
      if (data.userId === this.userId) {
        this.handleForcedVideoOff(data.isVideoOff);
      }
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

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) {
      throw createP2PError(P2PErrorType.DEVICE_NOT_FOUND, 'No audio track found');
    }

    // Check if forced by host
    if (this.state.mic.isForced && enabled === this.state.mic.isMuted) {
      this.log('warn', 'Mic state change blocked by host moderation');
      return;
    }

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
      // Check if forced by host
      if (this.state.camera.isForced && this.state.camera.isVideoOff) {
        this.log('warn', 'Camera state change blocked by host moderation');
        return;
      }

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

      // Replace track in ALL peer connections with retry mechanism
      await this.replaceVideoTrackInAllPeers(newVideoTrack);

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
  private async syncMicToDatabase(isMuted: boolean): Promise<void> {
    if (!this.socket) return;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // ⚠️ Don't reject - just log warning and fetch latest state
        this.log('warn', 'Timeout syncing mic state to database, fetching latest state', {
          attemptedState: isMuted,
        });
        
        // Fetch latest state from server to reconcile
        this.fetchLatestMicState().catch(err => {
          this.log('error', 'Failed to fetch latest mic state', { error: err.message });
        });
        
        // Resolve anyway - UI operation already succeeded (optimistic)
        resolve();
      }, 5000);

      this.emitSocketEvent('media:toggle-mic', { isMuted }, (response: { success?: boolean }) => {
        clearTimeout(timeout);
        if (response?.success) {
          resolve();
        } else {
          // Server rejected - fetch latest state to reconcile
          this.log('warn', 'Server rejected mic state change, fetching latest state');
          this.fetchLatestMicState().catch(err => {
            this.log('error', 'Failed to fetch latest mic state', { error: err.message });
          });
          resolve(); // Still resolve - don't block UI
        }
      });
    });
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
      if (this.socket.connected) {
        this.emitSocketEvent('room:request-participant-state', { userId: this.userId });
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });
  }

  /**
   * Sync camera state to database
   * 
   * ⚠️ CRITICAL: Uses Optimistic UI pattern (same as syncMicToDatabase)
   * - UI operation (camera toggle) already succeeded
   * - This sync is fire-and-forget
   * - If timeout, don't reject - just log warning and fetch latest state
   */
  private async syncCameraToDatabase(isVideoOff: boolean): Promise<void> {
    if (!this.socket) return;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // ⚠️ Don't reject - just log warning and fetch latest state
        this.log('warn', 'Timeout syncing camera state to database, fetching latest state', {
          attemptedState: isVideoOff,
        });
        
        // Fetch latest state from server to reconcile
        this.fetchLatestCameraState().catch(err => {
          this.log('error', 'Failed to fetch latest camera state', { error: err.message });
        });
        
        // Resolve anyway - UI operation already succeeded (optimistic)
        resolve();
      }, 5000);

      this.emitSocketEvent('media:toggle-video', { isVideoOff }, (response: { success?: boolean }) => {
        clearTimeout(timeout);
        if (response?.success) {
          resolve();
        } else {
          // Server rejected - fetch latest state to reconcile
          this.log('warn', 'Server rejected camera state change, fetching latest state');
          this.fetchLatestCameraState().catch(err => {
            this.log('error', 'Failed to fetch latest camera state', { error: err.message });
          });
          resolve(); // Still resolve - don't block UI
        }
      });
    });
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
   * Cleanup
   * CRITICAL: Must cleanup all tracked listeners to prevent duplicate listeners
   */
  cleanup(): void {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
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

