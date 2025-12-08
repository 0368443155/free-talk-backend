import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaseP2PManager } from '../base-p2p-manager';
import { createMockSocket } from '../../../../tests/utils/webrtc-test-utils';

// Create concrete implementation for testing
class TestP2PManager extends BaseP2PManager {
  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  cleanup(): void {
    // CRITICAL: Cleanup all tracked listeners before destroying
    this.cleanupTrackedListeners();
    this.isInitialized = false;
  }
}

describe('BaseP2PManager', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let manager: TestP2PManager;

  beforeEach(() => {
    mockSocket = createMockSocket();
    manager = new TestP2PManager(mockSocket as any, 'meeting-1', 'user-1');
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (manager) {
      manager.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should create manager with correct properties', () => {
      expect(manager.isReady()).toBe(false);
      expect(manager.getInfo().meetingId).toBe('meeting-1');
      expect(manager.getInfo().userId).toBe('user-1');
      expect(manager.getInfo().initialized).toBe(false);
    });

    it('should initialize correctly', async () => {
      await manager.initialize();
      expect(manager.isReady()).toBe(true);
      expect(manager.getInfo().initialized).toBe(true);
    });
  });

  describe('Socket Event Handling', () => {
    it('should track listeners when using onSocketEvent', () => {
      const handler = vi.fn();
      // Access protected method using type assertion for testing
      (manager as any).onSocketEvent('test-event', handler);

      expect(mockSocket.on).toHaveBeenCalledWith('test-event', handler);
      expect(manager.getInfo().trackedListenersCount).toBe(1);
    });

    it('should remove tracked listeners when using offSocketEvent', () => {
      const handler = vi.fn();
      // Access protected method using type assertion for testing
      (manager as any).onSocketEvent('test-event', handler);
      expect(manager.getInfo().trackedListenersCount).toBe(1);

      (manager as any).offSocketEvent('test-event', handler);
      expect(mockSocket.off).toHaveBeenCalledWith('test-event', handler);
      expect(manager.getInfo().trackedListenersCount).toBe(0);
    });

    it('should remove all listeners for event when handler not specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      // Access protected method using type assertion for testing
      (manager as any).onSocketEvent('test-event', handler1);
      (manager as any).onSocketEvent('test-event', handler2);
      expect(manager.getInfo().trackedListenersCount).toBe(1); // Same event, 2 handlers

      (manager as any).offSocketEvent('test-event');
      expect(mockSocket.off).toHaveBeenCalledWith('test-event');
      expect(manager.getInfo().trackedListenersCount).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all tracked listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      // Access protected method using type assertion for testing
      (manager as any).onSocketEvent('event-1', handler1);
      (manager as any).onSocketEvent('event-2', handler2);
      expect(manager.getInfo().trackedListenersCount).toBe(2);

      manager.cleanup();
      
      // Verify all listeners were removed
      expect(mockSocket.off).toHaveBeenCalledTimes(2);
      expect(manager.getInfo().trackedListenersCount).toBe(0);
      expect(manager.isReady()).toBe(false);
    });

    it('should prevent duplicate listeners after cleanup and re-init', async () => {
      const handler = vi.fn();
      
      // Access protected method using type assertion for testing
      (manager as any).onSocketEvent('test-event', handler);
      expect(manager.getInfo().trackedListenersCount).toBe(1);

      // Cleanup
      manager.cleanup();
      expect(manager.getInfo().trackedListenersCount).toBe(0);

      // Re-initialize and add listener again
      await manager.initialize();
      (manager as any).onSocketEvent('test-event', handler);
      expect(manager.getInfo().trackedListenersCount).toBe(1);
      
      // Verify socket.on was called exactly twice (once before cleanup, once after)
      expect(mockSocket.on).toHaveBeenCalledTimes(2);
    });
  });

  describe('Emit Socket Event', () => {
    it('should emit event when socket is connected', () => {
      mockSocket.connected = true;
      
      // Access protected method using type assertion for testing
      (manager as any).emitSocketEvent('test-event', { data: 'test' });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should not emit when socket is disconnected', () => {
      mockSocket.connected = false;
      
      // Access protected method using type assertion for testing
      (manager as any).emitSocketEvent('test-event', { data: 'test' });
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should emit with callback when provided', () => {
      mockSocket.connected = true;
      const callback = vi.fn();
      
      // Access protected method using type assertion for testing
      (manager as any).emitSocketEvent('test-event', { data: 'test' }, callback);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' }, callback);
    });
  });

  describe('Socket Reconnection', () => {
    it('should setup reconnection handlers in constructor', () => {
      // Reconnection handlers are set up in constructor via setupSocketReconnection()
      // They use socket.on() directly (not onSocketEvent) for reconnection lifecycle
      // This is intentional - reconnection handlers are not tracked because Socket.IO
      // automatically re-registers them on reconnect
      
      // Create a fresh manager WITHOUT clearing mocks to verify setupSocketReconnection
      const freshMockSocket = createMockSocket();
      const freshManager = new TestP2PManager(freshMockSocket as any, 'meeting-2', 'user-2');
      
      // After constructor, setupSocketReconnection should have been called
      // which calls socket.on() for 'connect', 'disconnect', 'connect_error'
      const onCalls = (freshMockSocket.on as any).mock.calls;
      expect(onCalls.length).toBeGreaterThanOrEqual(3);
      
      // Verify specific events were registered
      const eventNames = onCalls.map((call: any[]) => call[0]);
      expect(eventNames).toContain('connect');
      expect(eventNames).toContain('disconnect');
      expect(eventNames).toContain('connect_error');
      
      // Cleanup
      freshManager.cleanup();
    });
  });
});

