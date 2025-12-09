import { BaseP2PManager } from './base-p2p-manager';
import { MediaManagerConfig } from '../types';
import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * Remote Stream Info
 * 🔥 FIX: Separate streams for camera and screen
 */
export interface RemoteStreamInfo {
  userId: string;
  // 🔥 UPDATED: Separate streams
  mainStream: MediaStream | null;   // Camera + Mic
  screenStream: MediaStream | null; // Screen Share
  // Legacy: Keep for backward compatibility
  stream: MediaStream | null; // Alias to mainStream
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
  screenTrack: MediaStreamTrack | null;
  createdAt: Date;
  lastUpdated: Date;
}

/**
 * P2P Stream Manager
 * 
 * Manages remote MediaStream lifecycle:
 * - Stream reuse and caching
 * - Track lifecycle management
 * - Cleanup utilities
 * - Stream state tracking
 */
export class P2PStreamManager extends BaseP2PManager {
  private remoteStreams: Map<string, RemoteStreamInfo> = new Map();

  constructor(config: MediaManagerConfig) {
    super(config.socket, config.meetingId, config.userId, config.useNewGateway ?? false);
  }

  /**
   * Initialize manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('warn', 'Manager already initialized');
      return;
    }

    this.isInitialized = true;
    this.log('info', 'P2PStreamManager initialized');
  }

  /**
   * Add or update remote stream from peer connection
   * 🔥 FIX: Separate main stream (camera) and screen stream
   */
  addRemoteStream(userId: string, stream: MediaStream): void {
    let info = this.remoteStreams.get(userId);
    
    // Create if not exists
    if (!info) {
      info = {
        userId,
        mainStream: null,
        screenStream: null,
        stream: null, // Legacy
        audioTrack: null,
        videoTrack: null,
        screenTrack: null,
        createdAt: new Date(),
        lastUpdated: new Date()
      };
      this.remoteStreams.set(userId, info);
    }

    // Analyze stream to determine type
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    // Heuristic 1: Check track label
    const isScreenLabel = videoTracks.some(t => 
      t.label.toLowerCase().includes('screen') || 
      t.label.toLowerCase().includes('capture') ||
      t.label.toLowerCase().includes('display')
    );

    // Heuristic 2: If we already have main (camera) stream, this must be screen
    const hasMain = !!info.mainStream;
    const isScreen = isScreenLabel || (hasMain && videoTracks.length > 0 && !audioTracks.length);

    if (isScreen) {
      this.log('info', `Set SCREEN stream for ${userId}`);
      info.screenStream = stream;
      info.screenTrack = videoTracks[0] || null;
    } else {
      this.log('info', `Set MAIN stream for ${userId}`);
      info.mainStream = stream;
      info.stream = stream; // Legacy compatibility
      info.audioTrack = audioTracks[0] || null;
      info.videoTrack = videoTracks.find(t => !t.label.includes('screen')) || null;
    }
    
    info.lastUpdated = new Date();
    this.emit('stream-updated', { userId });
  }

  /**
   * Remove remote stream
   * 🔥 FIX: Handle null streams
   */
  removeRemoteStream(userId: string): void {
    const streamInfo = this.remoteStreams.get(userId);
    
    if (streamInfo) {
      // Stop all tracks from main stream
      if (streamInfo.mainStream) {
        streamInfo.mainStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // Stop all tracks from screen stream
      if (streamInfo.screenStream) {
        streamInfo.screenStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // Legacy: Stop tracks from stream if exists
      if (streamInfo.stream) {
        streamInfo.stream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      this.remoteStreams.delete(userId);
      
      this.log('info', `Removed remote stream for ${userId}`);
      
      // Emit event for React components
      this.emit('stream-removed', { userId });
    }
  }

  /**
   * Get remote stream for a user (backward compatibility)
   * 🔥 FIX: Default to main, fallback to screen
   */
  getRemoteStream(userId: string): MediaStream | null {
    const info = this.remoteStreams.get(userId);
    return info?.mainStream || info?.screenStream || null;
  }

  /**
   * Get remote screen stream
   * 🔥 FIX: NEW - Get screen share stream separately
   */
  getRemoteScreenStream(userId: string): MediaStream | null {
    return this.remoteStreams.get(userId)?.screenStream || null;
  }

  /**
   * Get all remote streams
   * 🔥 FIX: Handle null streams - prioritize mainStream
   */
  getAllRemoteStreams(): Map<string, MediaStream> {
    const streams = new Map<string, MediaStream>();
    
    this.remoteStreams.forEach((info, userId) => {
      // Prioritize mainStream, fallback to screenStream, then legacy stream
      const stream = info.mainStream || info.screenStream || info.stream;
      if (stream) {
        streams.set(userId, stream);
      }
    });
    
    return streams;
  }

  /**
   * Get remote stream info
   */
  getRemoteStreamInfo(userId: string): RemoteStreamInfo | null {
    return this.remoteStreams.get(userId) || null;
  }

  /**
   * Get all remote stream infos
   */
  getAllRemoteStreamInfos(): Map<string, RemoteStreamInfo> {
    return new Map(this.remoteStreams);
  }

  /**
   * Check if user has active stream
   * 🔥 FIX: Check both main and screen streams
   */
  hasActiveStream(userId: string): boolean {
    const streamInfo = this.remoteStreams.get(userId);
    if (!streamInfo) return false;
    
    // Check if main or screen stream has at least one active track
    const mainActive = streamInfo.mainStream?.getTracks().some(track => track.readyState === 'live') || false;
    const screenActive = streamInfo.screenStream?.getTracks().some(track => track.readyState === 'live') || false;
    return mainActive || screenActive;
  }

  /**
   * Get stream count
   */
  getStreamCount(): number {
    return this.remoteStreams.size;
  }

  /**
   * Handle track ended event
   */
  handleTrackEnded(userId: string, track: MediaStreamTrack): void {
    const streamInfo = this.remoteStreams.get(userId);
    if (!streamInfo) return;

    // Remove track from stream info
    if (streamInfo.audioTrack === track) {
      streamInfo.audioTrack = null;
    } else if (streamInfo.videoTrack === track) {
      streamInfo.videoTrack = null;
    } else if (streamInfo.screenTrack === track) {
      streamInfo.screenTrack = null;
    }

    // Check if stream has any remaining tracks (audio, video, or screen)
    const hasRemainingTracks = 
      streamInfo.audioTrack !== null || 
      streamInfo.videoTrack !== null || 
      streamInfo.screenTrack !== null;

    // If no remaining tracks, remove stream
    if (!hasRemainingTracks) {
      this.removeRemoteStream(userId);
    } else {
      streamInfo.lastUpdated = new Date();
      this.emit('stream-updated', { userId, stream: streamInfo.stream });
    }
  }

  /**
   * Cleanup all streams
   * 🔥 FIX: Handle null streams
   */
  cleanup(): void {
    // Stop all tracks in all streams
    this.remoteStreams.forEach((streamInfo) => {
      // Stop main stream tracks
      if (streamInfo.mainStream) {
        streamInfo.mainStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // Stop screen stream tracks
      if (streamInfo.screenStream) {
        streamInfo.screenStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // Legacy: Stop stream tracks if exists
      if (streamInfo.stream) {
        streamInfo.stream.getTracks().forEach(track => {
          track.stop();
        });
      }
    });

    this.remoteStreams.clear();
    this.isInitialized = false;
    
    this.log('info', 'P2PStreamManager cleaned up');
  }

  /**
   * Get manager info for debugging
   */
  getInfo(): {
    manager: string;
    meetingId: string;
    userId: string;
    initialized: boolean;
    socketConnected: boolean;
    streamCount: number;
    trackedListenersCount: number;
  } {
    return {
      ...super.getInfo(),
      streamCount: this.remoteStreams.size,
    };
  }
}

