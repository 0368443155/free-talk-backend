import { BaseP2PManager } from './base-p2p-manager';
import { MediaManagerConfig } from '../types';
import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * Remote Stream Info
 */
export interface RemoteStreamInfo {
  userId: string;
  stream: MediaStream;
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
    super(config.socket, config.meetingId, config.userId);
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
   */
  addRemoteStream(userId: string, stream: MediaStream): void {
    const audioTrack = stream.getAudioTracks()[0] || null;
    const videoTrack = stream.getVideoTracks().find(t => t.kind === 'video' && !t.label.includes('screen')) || null;
    const screenTrack = stream.getVideoTracks().find(t => t.label.includes('screen') || t.label.includes('Screen')) || null;

    const existing = this.remoteStreams.get(userId);
    
    if (existing) {
      // Update existing stream
      existing.stream = stream;
      existing.audioTrack = audioTrack;
      existing.videoTrack = videoTrack;
      existing.screenTrack = screenTrack;
      existing.lastUpdated = new Date();
      
      this.log('info', `Updated remote stream for ${userId}`, {
        hasAudio: !!audioTrack,
        hasVideo: !!videoTrack,
        hasScreen: !!screenTrack,
      });
    } else {
      // Create new stream info
      const streamInfo: RemoteStreamInfo = {
        userId,
        stream,
        audioTrack,
        videoTrack,
        screenTrack,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };
      
      this.remoteStreams.set(userId, streamInfo);
      
      this.log('info', `Added remote stream for ${userId}`, {
        hasAudio: !!audioTrack,
        hasVideo: !!videoTrack,
        hasScreen: !!screenTrack,
      });
    }

    // Emit event for React components
    this.emit('stream-added', { userId, stream });
  }

  /**
   * Remove remote stream
   */
  removeRemoteStream(userId: string): void {
    const streamInfo = this.remoteStreams.get(userId);
    
    if (streamInfo) {
      // Stop all tracks
      streamInfo.stream.getTracks().forEach(track => {
        track.stop();
      });
      
      this.remoteStreams.delete(userId);
      
      this.log('info', `Removed remote stream for ${userId}`);
      
      // Emit event for React components
      this.emit('stream-removed', { userId });
    }
  }

  /**
   * Get remote stream for a user
   */
  getRemoteStream(userId: string): MediaStream | null {
    const streamInfo = this.remoteStreams.get(userId);
    return streamInfo?.stream || null;
  }

  /**
   * Get all remote streams
   */
  getAllRemoteStreams(): Map<string, MediaStream> {
    const streams = new Map<string, MediaStream>();
    
    this.remoteStreams.forEach((info, userId) => {
      streams.set(userId, info.stream);
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
   */
  hasActiveStream(userId: string): boolean {
    const streamInfo = this.remoteStreams.get(userId);
    if (!streamInfo) return false;
    
    // Check if stream has at least one active track
    return streamInfo.stream.getTracks().some(track => track.readyState === 'live');
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
   */
  cleanup(): void {
    // Stop all tracks in all streams
    this.remoteStreams.forEach((streamInfo) => {
      streamInfo.stream.getTracks().forEach(track => {
        track.stop();
      });
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

