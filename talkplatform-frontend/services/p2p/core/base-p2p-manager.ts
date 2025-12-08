import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * Base class cho tất cả P2P managers
 * 
 * Provides common functionality:
 * - Event handling
 * - Logging với context
 * - Socket.IO communication
 * - Cleanup utilities
 */
export abstract class BaseP2PManager extends EventEmitter {
  protected socket: Socket | null = null;
  protected meetingId: string = '';
  protected userId: string = '';
  protected isInitialized: boolean = false;

  /**
   * Track socket event listeners for cleanup
   * CRITICAL: Prevents duplicate listeners and memory leaks
   */
  private trackedListeners: Map<string, Function[]> = new Map();

  constructor(socket: Socket, meetingId: string, userId: string) {
    super();
    this.socket = socket;
    this.meetingId = meetingId;
    this.userId = userId;
    this.setupSocketReconnection();
  }

  /**
   * Initialize manager - must be implemented by subclasses
   */
  abstract initialize(): Promise<void>;

  /**
   * Cleanup resources - must be implemented by subclasses
   * CRITICAL: Must call this.cleanupTrackedListeners() in cleanup()
   */
  abstract cleanup(): void;

  /**
   * Log with context
   */
  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
    const prefix = `[${this.constructor.name}]`;
    const context = { 
      meetingId: this.meetingId, 
      userId: this.userId, 
      ...data 
    };

    // Only log in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development' || process.env.ENABLE_P2P_LOGS === 'true') {
      switch (level) {
        case 'info':
          console.log(prefix, message, context);
          break;
        case 'warn':
          console.warn(prefix, message, context);
          break;
        case 'error':
          console.error(prefix, message, context);
          break;
        case 'debug':
          console.debug(prefix, message, context);
          break;
      }
    }
  }

  /**
   * Emit socket event với error handling
   */
  protected emitSocketEvent(
    event: string, 
    data: any, 
    callback?: (response: any) => void
  ): void {
    if (!this.socket || !this.socket.connected) {
      this.log('error', `Cannot emit ${event}: socket not connected`);
      return;
    }

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }

    this.log('debug', `Emitted ${event}`, data);
  }

  /**
   * Listen to socket event (with tracking for cleanup)
   * CRITICAL: All socket listeners must use this method to ensure proper cleanup
   */
  protected onSocketEvent(event: string, handler: (...args: any[]) => void): void {
    if (!this.socket) {
      this.log('error', `Cannot listen to ${event}: socket not available`);
      return;
    }

    this.socket.on(event, handler);
    
    // Track listener for cleanup
    if (!this.trackedListeners.has(event)) {
      this.trackedListeners.set(event, []);
    }
    this.trackedListeners.get(event)!.push(handler);

    this.log('debug', `Listening to ${event}`);
  }

  /**
   * Remove socket event listener (with untracking)
   */
  protected offSocketEvent(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) return;

    if (handler) {
      this.socket.off(event, handler);
      
      // Remove from tracked listeners
      const handlers = this.trackedListeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
        // If no handlers left, remove event from map
        if (handlers.length === 0) {
          this.trackedListeners.delete(event);
        }
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      this.trackedListeners.delete(event);
    }
    
    this.log('debug', `Stopped listening to ${event}`);
  }

  /**
   * Setup socket reconnection handling
   * 
   * CRITICAL: Socket.IO automatically re-registers listeners that were registered
   * via socket.on() when it reconnects. However, we use trackedListeners to ensure
   * cleanup is complete and logging is accurate.
   */
  protected setupSocketReconnection(): void {
    if (!this.socket) return;

    // Track reconnection count for debugging
    let reconnectCount = 0;

    // Handle reconnection
    this.socket.on('connect', () => {
      reconnectCount++;
      this.log('info', 'Socket reconnected', { 
        reconnectCount,
        trackedListenersCount: this.trackedListeners.size 
      });
      
      // Note: Socket.IO automatically re-registers listeners registered via socket.on()
      // Our trackedListeners Map helps ensure we know what listeners exist for cleanup
      // but Socket.IO handles the actual re-registration on reconnect
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason: string) => {
      this.log('warn', 'Socket disconnected', { 
        reason,
        // Log if any tracked listeners exist (they will be re-registered on reconnect)
        trackedListenersCount: this.trackedListeners.size 
      });
    });

    // Handle connection errors
    this.socket.on('connect_error', (error: Error) => {
      this.log('error', 'Socket connection error', { 
        error: error.message,
        reconnectAttempts: reconnectCount 
      });
    });
  }

  /**
   * Cleanup all tracked listeners
   * CRITICAL: Must be called in cleanup() to prevent duplicate listeners
   * This is essential to prevent the "bấm 1 lần, server nhận 2 lần" bug
   */
  protected cleanupTrackedListeners(): void {
    this.trackedListeners.forEach((handlers, event) => {
      handlers.forEach(handler => {
        if (this.socket) {
          this.socket.off(event, handler);
        }
      });
    });
    this.trackedListeners.clear();
    this.log('info', 'All tracked listeners cleaned up');
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
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
    trackedListenersCount: number;
  } {
    return {
      manager: this.constructor.name,
      meetingId: this.meetingId,
      userId: this.userId,
      initialized: this.isInitialized,
      socketConnected: this.socket?.connected ?? false,
      trackedListenersCount: this.trackedListeners.size,
    };
  }
}

