import { BaseP2PManager } from './base-p2p-manager';
import { MediaManagerConfig } from '../types';
import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * Track State Sync Configuration
 */
export interface TrackStateSyncConfig {
  syncInterval: number; // ms - How often to sync state
  conflictResolution: 'client-wins' | 'server-wins' | 'merge';
}

/**
 * Track State from Server
 */
export interface ServerTrackState {
  userId: string;
  isMuted: boolean;
  isVideoOff: boolean;
  timestamp: number;
}

/**
 * P2P Track State Sync
 * 
 * Handles periodic synchronization of MediaStream track state with database:
 * - Periodic sync (polling server for latest state)
 * - Conflict resolution (when client and server state differ)
 * - State reconciliation (ensure consistency)
 */
export class P2PTrackStateSync extends BaseP2PManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private config: TrackStateSyncConfig;
  private lastSyncedState: {
    isMuted: boolean | null;
    isVideoOff: boolean | null;
    timestamp: number;
  } = {
    isMuted: null,
    isVideoOff: null,
    timestamp: 0,
  };

  constructor(
    config: MediaManagerConfig,
    syncConfig: TrackStateSyncConfig = {
      syncInterval: 30000, // 30 seconds
      conflictResolution: 'server-wins', // Server is source of truth
    }
  ) {
    super(config.socket, config.meetingId, config.userId);
    this.config = syncConfig;
  }

  /**
   * Initialize manager and start periodic sync
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('warn', 'Manager already initialized');
      return;
    }

    // Setup socket listeners for server state updates
    this.setupSocketListeners();

    // Start periodic sync
    this.startPeriodicSync();

    this.isInitialized = true;
    this.log('info', 'P2PTrackStateSync initialized', {
      syncInterval: this.config.syncInterval,
      conflictResolution: this.config.conflictResolution,
    });
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    // Listen for server-initiated state updates
    this.onSocketEvent('media:user-muted', (data: { userId: string; isMuted: boolean; timestamp?: number }) => {
      if (data.userId === this.userId) {
        this.handleServerStateUpdate('mic', data.isMuted, data.timestamp || Date.now());
      }
    });

    this.onSocketEvent('media:user-video-off', (data: { userId: string; isVideoOff: boolean; timestamp?: number }) => {
      if (data.userId === this.userId) {
        this.handleServerStateUpdate('camera', data.isVideoOff, data.timestamp || Date.now());
      }
    });
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.syncStateFromServer().catch(err => {
        this.log('error', 'Periodic sync failed', { error: err.message });
      });
    }, this.config.syncInterval);

    this.log('info', 'Periodic sync started', { interval: this.config.syncInterval });
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.log('info', 'Periodic sync stopped');
    }
  }

  /**
   * Sync state from server
   */
  async syncStateFromServer(): Promise<ServerTrackState | null> {
    if (!this.socket || !this.socket.connected) {
      this.log('warn', 'Socket not connected, skipping sync');
      return null;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log('warn', 'Timeout waiting for server state');
        resolve(null);
      }, 5000);

      const handleStateResponse = (data: ServerTrackState) => {
        clearTimeout(timeout);
        this.offSocketEvent('room:participant-state', handleStateResponse);

        this.log('info', 'Received state from server', data);
        
        // Emit event for reconciliation
        this.emit('server-state-received', data);
        
        resolve(data);
      };

      this.onSocketEvent('room:participant-state', handleStateResponse);

      // Request latest state from server
      this.emitSocketEvent('room:request-participant-state', { userId: this.userId });
    });
  }

  /**
   * Handle server state update
   */
  private handleServerStateUpdate(
    type: 'mic' | 'camera',
    serverValue: boolean,
    timestamp: number
  ): void {
    const lastState = type === 'mic' 
      ? this.lastSyncedState.isMuted 
      : this.lastSyncedState.isVideoOff;

    // Check for conflict (client state differs from server)
    if (lastState !== null && lastState !== serverValue) {
      this.log('warn', `State conflict detected for ${type}`, {
        clientState: lastState,
        serverState: serverValue,
        timestamp,
      });

      // Resolve conflict based on config
      this.resolveConflict(type, lastState, serverValue, timestamp);
    } else {
      // No conflict, update last synced state
      if (type === 'mic') {
        this.lastSyncedState.isMuted = serverValue;
      } else {
        this.lastSyncedState.isVideoOff = serverValue;
      }
      this.lastSyncedState.timestamp = timestamp;

      // Emit event for state update
      this.emit('state-synced', { type, value: serverValue, timestamp });
    }
  }

  /**
   * Resolve conflict between client and server state
   */
  private resolveConflict(
    type: 'mic' | 'camera',
    clientState: boolean,
    serverState: boolean,
    timestamp: number
  ): void {
    switch (this.config.conflictResolution) {
      case 'server-wins':
        // Server is source of truth - update client state
        this.log('info', `Resolving conflict: server wins for ${type}`, {
          oldState: clientState,
          newState: serverState,
        });
        this.emit('state-conflict-resolved', {
          type,
          resolution: 'server-wins',
          clientState,
          serverState,
          finalState: serverState,
        });
        break;

      case 'client-wins':
        // Client is source of truth - send client state to server
        this.log('info', `Resolving conflict: client wins for ${type}`, {
          clientState,
          serverState,
        });
        this.emit('state-conflict-resolved', {
          type,
          resolution: 'client-wins',
          clientState,
          serverState,
          finalState: clientState,
        });
        // Sync client state to server
        if (type === 'mic') {
          this.emitSocketEvent('media:toggle-mic', { isMuted: clientState });
        } else {
          this.emitSocketEvent('media:toggle-video', { isVideoOff: clientState });
        }
        break;

      case 'merge':
        // Use most recent timestamp
        const clientTimestamp = this.lastSyncedState.timestamp;
        const finalState = timestamp > clientTimestamp ? serverState : clientState;
        this.log('info', `Resolving conflict: merge (timestamp-based) for ${type}`, {
          clientState,
          serverState,
          finalState,
          clientTimestamp,
          serverTimestamp: timestamp,
        });
        this.emit('state-conflict-resolved', {
          type,
          resolution: 'merge',
          clientState,
          serverState,
          finalState,
        });
        break;
    }
  }

  /**
   * Update last synced state (called by P2PMediaManager after successful sync)
   */
  updateLastSyncedState(type: 'mic' | 'camera', value: boolean): void {
    if (type === 'mic') {
      this.lastSyncedState.isMuted = value;
    } else {
      this.lastSyncedState.isVideoOff = value;
    }
    this.lastSyncedState.timestamp = Date.now();
  }

  /**
   * Get last synced state
   */
  getLastSyncedState(): {
    isMuted: boolean | null;
    isVideoOff: boolean | null;
    timestamp: number;
  } {
    return { ...this.lastSyncedState };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopPeriodicSync();
    this.cleanupTrackedListeners();
    this.isInitialized = false;
    this.log('info', 'P2PTrackStateSync cleaned up');
  }
}

