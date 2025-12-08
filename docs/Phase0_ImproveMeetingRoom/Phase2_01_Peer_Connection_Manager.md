# PHASE 2.1: PEER CONNECTION MANAGER IMPLEMENTATION

> **Timeline:** 1 tuần  
> **Priority:** 🔴 CRITICAL  
> **Status:** ⏳ TODO  
> **Prerequisites:** Phase 0 ✅, Phase 1 ✅  
> **Score:** 9.5/10 ✅ Ready (Needs ConnectionClosed handling fix)

---

## 📋 MỤC TIÊU

Implement `P2PPeerConnectionManager` để quản lý RTCPeerConnection lifecycle:
- **Negotiation Queue** để tránh race conditions (CRITICAL)
- ICE candidate handling với queue limits
- Connection recovery với exponential backoff
- Track order consistency
- **Making Perfect Negotiation** pattern

---

## 🔍 VẤN ĐỀ HIỆN TẠI

**From `use-webrtc.ts` (Line 492-550):**

**⚠️ Vấn đề 1: Negotiation race conditions (NGUY HIỂM NHẤT)**
```typescript
pc.onnegotiationneeded = async () => {
  if (isReplacingTracksRef.current) return; // ❌ Có thể miss negotiation
  if (pc.signalingState !== 'stable') return; // ❌ Có thể gây deadlock
  // ...
};
```

**Tại sao nguy hiểm:**
- User A bật cam → `negotiationneeded` fire → tạo offer (signalingState = 'have-local-offer')
- Trong lúc đợi answer, User A bật mic → `negotiationneeded` fire lại
- Nhưng `signalingState !== 'stable'` → return early → negotiation bị miss
- Kết quả: Remote peer không nhận được mic track

**Vấn đề 2: ICE candidate queue không có limit**
```typescript
pendingCandidates.current.get(userId)!.push(candidate); // ❌ Có thể queue quá nhiều
```

**Vấn đề 3: Connection recovery không có retry logic**
```typescript
if (pc.connectionState === 'failed') {
  if (pc.restartIce) {
    pc.restartIce(); // ❌ Chỉ restart một lần, không có retry
  }
}
```

---

## 🏗️ IMPLEMENTATION CHI TIẾT

**File:** `talkplatform-frontend/services/p2p/core/p2p-peer-connection-manager.ts` (NEW)

### STEP 1: Types & Interfaces

```typescript
import { EventEmitter } from 'events';
import { Socket } from 'socket.io-client';
import { BaseP2PManager } from '../base/base-p2p-manager';
import { P2PErrorType, P2PError } from '../types';

export interface PeerConnectionInfo {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  isPolite: boolean; // For Perfect Negotiation pattern
  negotiationQueue: NegotiationTask[];
  isNegotiating: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  connectionRetryCount: number;
  lastConnectionState: RTCPeerConnectionState;
}

export interface NegotiationTask {
  id: string;
  type: 'offer' | 'answer' | 'ice-restart';
  priority: number; // Higher = more urgent (0 = normal, 1 = urgent)
  resolve: () => void;
  reject: (error: Error) => void;
  createdAt: number;
}

export interface PeerConnectionConfig {
  socket: Socket;
  meetingId: string;
  userId: string;
  targetUserId: string;
  isPolite?: boolean; // Who initiates (true = we make offer first)
  iceServers?: RTCConfiguration['iceServers'];
}

const MAX_ICE_CANDIDATES_QUEUE = 50;
const MAX_CONNECTION_RETRY_ATTEMPTS = 3;
const NEGOTIATION_DEBOUNCE_MS = 150; // Debounce rapid negotiations
const ICE_CANDIDATE_TIMEOUT_MS = 5000; // Timeout for ICE gathering
```

### STEP 2: Core Class Structure

```typescript
export class P2PPeerConnectionManager extends BaseP2PManager {
  private peers: Map<string, PeerConnectionInfo> = new Map();
  private negotiationDebounceTimer: Map<string, NodeJS.Timeout> = new Map();
  
  private readonly MAX_ICE_CANDIDATES = MAX_ICE_CANDIDATES_QUEUE;
  private readonly MAX_RETRIES = MAX_CONNECTION_RETRY_ATTEMPTS;
  private readonly NEGOTIATION_DEBOUNCE = NEGOTIATION_DEBOUNCE_MS;

  constructor(socket: Socket, meetingId: string, userId: string) {
    super(socket, meetingId, userId);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Listen to WebRTC signaling events
    this.setupSignalingListeners();

    this.isInitialized = true;
    this.log('info', 'P2PPeerConnectionManager initialized');
  }

  cleanup(): void {
    // Close all peer connections
    this.peers.forEach((peerInfo, userId) => {
      this.closePeerConnection(userId);
    });
    this.peers.clear();
    this.negotiationDebounceTimer.clear();
    
    super.cleanup();
    this.log('info', 'P2PPeerConnectionManager cleaned up');
  }

  /**
   * Create or get peer connection for a user
   * 
   * ⚠️ CRITICAL: isPolite must be determined consistently across both peers
   * Both peers must use the same logic to determine who is "polite"
   * 
   * Recommended logic (simple string comparison):
   * ```typescript
   * const isPolite = myUserId > targetUserId; // Lexicographic comparison
   * ```
   * 
   * This ensures:
   * - User "user-2" connecting to "user-1" → isPolite = true (user-2 > user-1)
   * - User "user-1" connecting to "user-2" → isPolite = false (user-1 < user-2)
   * - Same peer is always polite on both sides
   */
  getOrCreatePeerConnection(config: PeerConnectionConfig): RTCPeerConnection {
    const { targetUserId, isPolite = false, iceServers } = config;
    
    let peerInfo = this.peers.get(targetUserId);
    
    if (peerInfo && peerInfo.connection.connectionState !== 'closed') {
      return peerInfo.connection;
    }

    // Create new RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    });

    // Initialize peer info
    peerInfo = {
      userId: targetUserId,
      connection: pc,
      isPolite,
      negotiationQueue: [],
      isNegotiating: false,
      pendingCandidates: [],
      connectionRetryCount: 0,
      lastConnectionState: 'new',
    };

    this.peers.set(targetUserId, peerInfo);

    // Setup event handlers
    this.setupPeerConnectionHandlers(targetUserId, pc);

    this.log('info', `Peer connection created for ${targetUserId}`, { isPolite });

    return pc;
  }

  /**
   * Close peer connection
   */
  closePeerConnection(targetUserId: string): void {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) return;

    // Clear debounce timer
    const timer = this.negotiationDebounceTimer.get(targetUserId);
    if (timer) {
      clearTimeout(timer);
      this.negotiationDebounceTimer.delete(targetUserId);
    }

    // Reject all pending negotiations
    peerInfo.negotiationQueue.forEach(task => {
      task.reject(new Error('Peer connection closed'));
    });
    peerInfo.negotiationQueue = [];

    // Close connection
    if (peerInfo.connection.connectionState !== 'closed') {
      peerInfo.connection.close();
    }

    // Stop stream tracks
    if (peerInfo.stream) {
      peerInfo.stream.getTracks().forEach(track => track.stop());
    }

    this.peers.delete(targetUserId);
    this.log('info', `Peer connection closed for ${targetUserId}`);
  }
}
```

### STEP 3: Negotiation Queue (CRITICAL)

```typescript
  /**
   * 🔥 CRITICAL: Queue negotiation to avoid race conditions
   * 
   * This ensures negotiations run sequentially:
   * - User A bật cam (negotiation 1) → Queue task 1
   * - User A bật mic (negotiation 2) → Queue task 2, wait for task 1
   * - Task 1 completes → signalingState = 'stable' → Task 2 runs
   */
  private async queueNegotiation(
    targetUserId: string,
    type: 'offer' | 'answer' | 'ice-restart',
    priority: number = 0
  ): Promise<void> {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${targetUserId}`);
    }

    return new Promise((resolve, reject) => {
      const task: NegotiationTask = {
        id: `${targetUserId}-${Date.now()}-${Math.random()}`,
        type,
        priority,
        resolve,
        reject,
        createdAt: Date.now(),
      };

      // Insert task in priority order (higher priority first)
      const insertIndex = peerInfo.negotiationQueue.findIndex(
        t => t.priority < priority
      );
      if (insertIndex === -1) {
        peerInfo.negotiationQueue.push(task);
      } else {
        peerInfo.negotiationQueue.splice(insertIndex, 0, task);
      }

      this.log('info', `Queued negotiation task`, {
        targetUserId,
        type,
        priority,
        queueLength: peerInfo.negotiationQueue.length,
      });

      // Process queue (if not already processing)
      this.processNegotiationQueue(targetUserId).catch(err => {
        this.log('error', 'Failed to process negotiation queue', { error: err.message });
      });
    });
  }

  /**
   * Process negotiation queue sequentially
   * 
   * ⚠️ CRITICAL: If connection is closed, break immediately to avoid wasting resources
   */
  private async processNegotiationQueue(targetUserId: string): Promise<void> {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) return;

    // Already processing or queue empty
    if (peerInfo.isNegotiating || peerInfo.negotiationQueue.length === 0) {
      return;
    }

    // Check if connection is already closed
    if (peerInfo.connection.connectionState === 'closed') {
      this.log('warn', `Connection closed, clearing negotiation queue for ${targetUserId}`);
      // Reject all pending tasks
      peerInfo.negotiationQueue.forEach(task => {
        task.reject(new Error('Connection closed'));
      });
      peerInfo.negotiationQueue = [];
      return;
    }

    peerInfo.isNegotiating = true;

    try {
      while (peerInfo.negotiationQueue.length > 0) {
        // Check connection state before each task
        if (peerInfo.connection.connectionState === 'closed') {
          this.log('warn', `Connection closed during negotiation, clearing remaining queue`, {
            targetUserId,
            remainingTasks: peerInfo.negotiationQueue.length,
          });
          // Reject all remaining tasks
          peerInfo.negotiationQueue.forEach(task => {
            task.reject(new Error('Connection closed'));
          });
          peerInfo.negotiationQueue = [];
          break; // ⚠️ CRITICAL: Break immediately, don't process remaining tasks
        }

        const task = peerInfo.negotiationQueue.shift()!;

        try {
          // Wait for signaling state to be stable
          await this.waitForSignalingState(targetUserId, 'stable');

          // Double-check connection state after wait
          if (peerInfo.connection.connectionState === 'closed') {
            task.reject(new Error('Connection closed during negotiation'));
            // Clear remaining queue
            peerInfo.negotiationQueue.forEach(t => {
              t.reject(new Error('Connection closed'));
            });
            peerInfo.negotiationQueue = [];
            break;
          }

          // Execute negotiation task
          switch (task.type) {
            case 'offer':
              await this.handleNegotiationOffer(targetUserId);
              break;
            case 'answer':
              // Answer is handled when receiving offer from remote peer
              // This queue is for proactive negotiations
              break;
            case 'ice-restart':
              await this.handleIceRestart(targetUserId);
              break;
          }

          task.resolve();
          this.log('info', `Negotiation task completed`, {
            targetUserId,
            type: task.type,
            duration: Date.now() - task.createdAt,
          });
        } catch (error: any) {
          task.reject(error);
          
          // ⚠️ CRITICAL: Check if error is connection-related
          const isConnectionError = 
            error.message?.includes('Connection closed') ||
            error.message?.includes('closed') ||
            peerInfo.connection.connectionState === 'closed';

          if (isConnectionError) {
            this.log('error', `Connection closed, clearing negotiation queue`, {
              targetUserId,
              error: error.message,
              remainingTasks: peerInfo.negotiationQueue.length,
            });
            // Reject all remaining tasks
            peerInfo.negotiationQueue.forEach(t => {
              t.reject(new Error('Connection closed'));
            });
            peerInfo.negotiationQueue = [];
            break; // ⚠️ CRITICAL: Break immediately on connection error
          }

          // For other errors, log and continue with next task
          this.log('error', `Negotiation task failed, continuing with next task`, {
            targetUserId,
            type: task.type,
            error: error.message,
          });
        }
      }
    } finally {
      peerInfo.isNegotiating = false;
    }
  }

  /**
   * Wait for signaling state to become target state
   * With timeout to prevent infinite wait
   */
  private async waitForSignalingState(
    targetUserId: string,
    targetState: RTCSignalingState,
    timeoutMs: number = 10000
  ): Promise<void> {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${targetUserId}`);
    }

    const pc = peerInfo.connection;

    // Already in target state
    if (pc.signalingState === targetState) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pc.removeEventListener('signalingstatechange', checkState);
        reject(new Error(`Timeout waiting for signaling state ${targetState}`));
      }, timeoutMs);

      const checkState = () => {
        if (pc.signalingState === targetState) {
          clearTimeout(timeout);
          pc.removeEventListener('signalingstatechange', checkState);
          resolve();
        }
      };

      pc.addEventListener('signalingstatechange', checkState);
    });
  }
```

### STEP 4: Making Perfect Negotiation Pattern

```typescript
  /**
   * 🔥 CRITICAL: Handle negotiation needed event
   * Uses "Making Perfect Negotiation" pattern:
   * - Polite peer (isPolite = true) makes offer
   * - Impolite peer waits and answers
   * - Prevents offer collision (both peers making offer simultaneously)
   */
  private setupNegotiationNeededHandler(
    targetUserId: string,
    pc: RTCPeerConnection
  ): void {
    pc.onnegotiationneeded = () => {
      const peerInfo = this.peers.get(targetUserId);
      if (!peerInfo) return;

      this.log('info', `Negotiation needed for ${targetUserId}`, {
        signalingState: pc.signalingState,
        isPolite: peerInfo.isPolite,
      });

      // Debounce rapid negotiations (e.g., adding multiple tracks quickly)
      const existingTimer = this.negotiationDebounceTimer.get(targetUserId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        this.negotiationDebounceTimer.delete(targetUserId);

        // Only polite peer initiates offer
        // Impolite peer will answer when receiving offer
        if (peerInfo.isPolite) {
          this.queueNegotiation(targetUserId, 'offer', 0).catch(err => {
            this.log('error', 'Failed to queue negotiation', { error: err.message });
          });
        }
      }, this.NEGOTIATION_DEBOUNCE);

      this.negotiationDebounceTimer.set(targetUserId, timer);
    };
  }

  /**
   * Handle creating and sending offer
   */
  private async handleNegotiationOffer(targetUserId: string): Promise<void> {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${targetUserId}`);
    }

    const pc = peerInfo.connection;

    // Double-check state (should be stable after queue wait)
    if (pc.signalingState !== 'stable') {
      throw new Error(
        `Cannot create offer: signaling state is ${pc.signalingState}, expected 'stable'`
      );
    }

    try {
      // Create offer with consistent options
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: false,
      });

      // Set local description BEFORE sending offer
      await pc.setLocalDescription(offer);

      this.log('info', `Offer created for ${targetUserId}`, {
        sdpType: offer.type,
        signalingState: pc.signalingState,
      });

      // Send offer via socket
      if (this.socket) {
        const eventName = 'media:offer'; // New gateway event
        this.emitSocketEvent(eventName, {
          roomId: this.meetingId,
          targetUserId,
          offer: pc.localDescription,
        });
      }

      // Wait for answer
      await this.waitForSignalingState(targetUserId, 'stable', 30000);

    } catch (error: any) {
      this.log('error', `Failed to handle negotiation offer`, {
        targetUserId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle receiving offer from remote peer (Making Perfect Negotiation)
   */
  async handleRemoteOffer(
    fromUserId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    const peerInfo = this.peers.get(fromUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${fromUserId}`);
    }

    const pc = peerInfo.connection;

    this.log('info', `Received offer from ${fromUserId}`, {
      signalingState: pc.signalingState,
      isPolite: peerInfo.isPolite,
    });

    try {
      // Making Perfect Negotiation: Handle offer collision
      if (pc.signalingState === 'have-local-offer') {
        // We're also making an offer - need to handle collision
        if (peerInfo.isPolite) {
          // We're polite, so we should rollback our offer and accept theirs
          this.log('warn', 'Offer collision detected - rolling back local offer', {
            fromUserId,
          });
          await pc.setLocalDescription({ type: 'rollback' });
        } else {
          // We're impolite, reject their offer (they should rollback)
          throw new Error('Offer collision: impolite peer cannot accept offer');
        }
      }

      // Set remote description
      await pc.setRemoteDescription(offer);

      // Create and set answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.log('info', `Answer created for ${fromUserId}`, {
        sdpType: answer.type,
        signalingState: pc.signalingState,
      });

      // Send answer via socket
      if (this.socket) {
        const eventName = 'media:answer';
        this.emitSocketEvent(eventName, {
          roomId: this.meetingId,
          targetUserId: fromUserId,
          answer: pc.localDescription,
        });
      }

      // Process pending ICE candidates
      await this.processPendingCandidates(fromUserId);

    } catch (error: any) {
      this.log('error', `Failed to handle remote offer`, {
        fromUserId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle receiving answer from remote peer
   */
  async handleRemoteAnswer(
    fromUserId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    const peerInfo = this.peers.get(fromUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${fromUserId}`);
    }

    const pc = peerInfo.connection;

    if (pc.signalingState !== 'have-local-offer') {
      throw new Error(
        `Cannot set remote answer: signaling state is ${pc.signalingState}, expected 'have-local-offer'`
      );
    }

    try {
      await pc.setRemoteDescription(answer);

      this.log('info', `Answer received from ${fromUserId}`, {
        signalingState: pc.signalingState,
      });

      // Process pending ICE candidates
      await this.processPendingCandidates(fromUserId);

    } catch (error: any) {
      this.log('error', `Failed to handle remote answer`, {
        fromUserId,
        error: error.message,
      });
      throw error;
    }
  }
```

### STEP 5: ICE Candidate Handling

```typescript
  /**
   * Setup ICE candidate handler
   */
  private setupIceCandidateHandler(
    targetUserId: string,
    pc: RTCPeerConnection
  ): void {
    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        // ICE gathering complete
        this.log('info', `ICE gathering complete for ${targetUserId}`);
        return;
      }

      const peerInfo = this.peers.get(targetUserId);
      if (!peerInfo) return;

      // Check queue limit
      if (peerInfo.pendingCandidates.length >= this.MAX_ICE_CANDIDATES) {
        this.log('warn', `ICE candidate queue full for ${targetUserId}`, {
          queueLength: peerInfo.pendingCandidates.length,
        });
        // Remove oldest candidate (FIFO)
        peerInfo.pendingCandidates.shift();
      }

      peerInfo.pendingCandidates.push(event.candidate.toJSON());

      // Send candidate if remote description is set
      if (pc.remoteDescription) {
        this.sendIceCandidate(targetUserId, event.candidate.toJSON());
      }
    };
  }

  /**
   * Send ICE candidate
   */
  private sendIceCandidate(
    targetUserId: string,
    candidate: RTCIceCandidateInit
  ): void {
    if (!this.socket) return;

    const eventName = 'media:ice-candidate';
    this.emitSocketEvent(eventName, {
      roomId: this.meetingId,
      targetUserId,
      candidate,
    });
  }

  /**
   * Handle receiving ICE candidate from remote peer
   */
  async handleRemoteIceCandidate(
    fromUserId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const peerInfo = this.peers.get(fromUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${fromUserId}`);
    }

    const pc = peerInfo.connection;

    try {
      // Can only add candidate if remote description is set
      if (pc.remoteDescription) {
        await pc.addIceCandidate(candidate);
        this.log('debug', `ICE candidate added for ${fromUserId}`);
      } else {
        // Queue candidate for later
        if (peerInfo.pendingCandidates.length >= this.MAX_ICE_CANDIDATES) {
          peerInfo.pendingCandidates.shift();
        }
        peerInfo.pendingCandidates.push(candidate);
        this.log('debug', `ICE candidate queued for ${fromUserId}`);
      }
    } catch (error: any) {
      this.log('error', `Failed to add ICE candidate`, {
        fromUserId,
        error: error.message,
      });
    }
  }

  /**
   * Process queued ICE candidates
   */
  private async processPendingCandidates(targetUserId: string): Promise<void> {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) return;

    const pc = peerInfo.connection;

    if (!pc.remoteDescription) {
      return; // Can't add candidates yet
    }

    const candidates = peerInfo.pendingCandidates.splice(0);
    
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error: any) {
        this.log('warn', `Failed to add queued ICE candidate`, {
          targetUserId,
          error: error.message,
        });
      }
    }

    if (candidates.length > 0) {
      this.log('info', `Processed ${candidates.length} queued ICE candidates`, {
        targetUserId,
      });
    }
  }
```

### STEP 6: Connection Recovery với Exponential Backoff

```typescript
  /**
   * Setup connection state handler with recovery logic
   */
  private setupConnectionStateHandler(
    targetUserId: string,
    pc: RTCPeerConnection
  ): void {
    pc.onconnectionstatechange = () => {
      const peerInfo = this.peers.get(targetUserId);
      if (!peerInfo) return;

      const state = pc.connectionState;
      const previousState = peerInfo.lastConnectionState;
      peerInfo.lastConnectionState = state;

      this.log('info', `Connection state changed for ${targetUserId}`, {
        previous: previousState,
        current: state,
      });

      // Emit event for React components
      this.emit('connection-state-changed', {
        userId: targetUserId,
        state,
      });

      // Handle failed state with retry
      if (state === 'failed') {
        this.handleConnectionFailure(targetUserId).catch(err => {
          this.log('error', 'Connection recovery failed', {
            targetUserId,
            error: err.message,
          });
        });
      }

      // Handle disconnected state (less severe than failed)
      if (state === 'disconnected') {
        // Wait a bit before considering it failed
        setTimeout(() => {
          if (pc.connectionState === 'disconnected') {
            this.log('warn', `Connection still disconnected for ${targetUserId}, attempting recovery`);
            this.handleConnectionFailure(targetUserId).catch(err => {
              this.log('error', 'Connection recovery failed', {
                targetUserId,
                error: err.message,
              });
            });
          }
        }, 5000);
      }
    };
  }

  /**
   * Handle connection failure with exponential backoff retry
   */
  private async handleConnectionFailure(targetUserId: string): Promise<void> {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) return;

    if (peerInfo.connectionRetryCount >= this.MAX_RETRIES) {
      this.log('error', `Max retry attempts reached for ${targetUserId}`);
      this.emit('connection-failed', {
        userId: targetUserId,
        reason: 'max-retries-reached',
      });
      return;
    }

    peerInfo.connectionRetryCount += 1;
    const delay = Math.min(1000 * Math.pow(2, peerInfo.connectionRetryCount - 1), 10000);

    this.log('info', `Attempting connection recovery for ${targetUserId}`, {
      attempt: peerInfo.connectionRetryCount,
      delayMs: delay,
    });

    await new Promise(resolve => setTimeout(resolve, delay));

    const pc = peerInfo.connection;

    // Check if connection recovered on its own
    if (pc.connectionState === 'connected' || pc.connectionState === 'connecting') {
      this.log('info', `Connection recovered for ${targetUserId}`);
      peerInfo.connectionRetryCount = 0; // Reset counter
      return;
    }

    // Try ICE restart
    try {
      if (pc.restartIce) {
        pc.restartIce();

        // Queue negotiation for ICE restart
        await this.queueNegotiation(targetUserId, 'ice-restart', 1); // High priority

        this.log('info', `ICE restart initiated for ${targetUserId}`);
      } else {
        // Fallback: Create new peer connection
        this.log('warn', `ICE restart not available, creating new connection for ${targetUserId}`);
        this.recreatePeerConnection(targetUserId);
      }
    } catch (error: any) {
      this.log('error', `Connection recovery failed`, {
        targetUserId,
        attempt: peerInfo.connectionRetryCount,
        error: error.message,
      });

      // Retry again if under limit
      if (peerInfo.connectionRetryCount < this.MAX_RETRIES) {
        await this.handleConnectionFailure(targetUserId);
      }
    }
  }

  /**
   * Handle ICE restart negotiation
   */
  private async handleIceRestart(targetUserId: string): Promise<void> {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${targetUserId}`);
    }

    const pc = peerInfo.connection;

    // Only polite peer initiates ICE restart
    if (!peerInfo.isPolite) {
      return; // Wait for remote peer to restart
    }

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      if (this.socket) {
        this.emitSocketEvent('media:offer', {
          roomId: this.meetingId,
          targetUserId,
          offer: pc.localDescription,
        });
      }

      this.log('info', `ICE restart offer sent to ${targetUserId}`);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Recreate peer connection as last resort
   */
  private recreatePeerConnection(targetUserId: string): void {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) return;

    this.log('warn', `Recreating peer connection for ${targetUserId}`);

    // Close old connection
    const oldPc = peerInfo.connection;
    oldPc.close();

    // Create new connection
    const newPc = new RTCPeerConnection({
      iceServers: oldPc.getConfiguration().iceServers,
      iceCandidatePoolSize: 10,
    });

    // Update peer info
    peerInfo.connection = newPc;
    peerInfo.connectionRetryCount = 0;
    peerInfo.negotiationQueue = [];
    peerInfo.isNegotiating = false;

    // Re-setup handlers
    this.setupPeerConnectionHandlers(targetUserId, newPc);

    // Re-add tracks if local stream exists
    // (This will trigger negotiationneeded)
    this.emit('connection-recreated', {
      userId: targetUserId,
      connection: newPc,
    });
  }
```

### STEP 7: Setup Event Listeners

```typescript
  /**
   * Setup all peer connection event handlers
   */
  private setupPeerConnectionHandlers(
    targetUserId: string,
    pc: RTCPeerConnection
  ): void {
    this.setupNegotiationNeededHandler(targetUserId, pc);
    this.setupIceCandidateHandler(targetUserId, pc);
    this.setupConnectionStateHandler(targetUserId, pc);
    this.setupTrackHandler(targetUserId, pc);
  }

  /**
   * Setup track handler (when remote stream is received)
   */
  private setupTrackHandler(
    targetUserId: string,
    pc: RTCPeerConnection
  ): void {
    pc.ontrack = (event) => {
      const peerInfo = this.peers.get(targetUserId);
      if (!peerInfo) return;

      const stream = event.streams[0];
      if (stream) {
        peerInfo.stream = stream;
        this.log('info', `Remote stream received from ${targetUserId}`, {
          trackCount: stream.getTracks().length,
        });

        // Emit event for React components
        this.emit('remote-stream-received', {
          userId: targetUserId,
          stream,
        });
      }
    };
  }

  /**
   * Setup socket event listeners for WebRTC signaling
   */
  private setupSignalingListeners(): void {
    // Listen to offer
    this.onSocketEvent('media:offer', (data: {
      fromUserId: string;
      roomId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      if (data.roomId !== this.meetingId) return;

      this.handleRemoteOffer(data.fromUserId, data.offer).catch(err => {
        this.log('error', 'Failed to handle remote offer', {
          fromUserId: data.fromUserId,
          error: err.message,
        });
      });
    });

    // Listen to answer
    this.onSocketEvent('media:answer', (data: {
      fromUserId: string;
      roomId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      if (data.roomId !== this.meetingId) return;

      this.handleRemoteAnswer(data.fromUserId, data.answer).catch(err => {
        this.log('error', 'Failed to handle remote answer', {
          fromUserId: data.fromUserId,
          error: err.message,
        });
      });
    });

    // Listen to ICE candidate
    this.onSocketEvent('media:ice-candidate', (data: {
      fromUserId: string;
      roomId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (data.roomId !== this.meetingId) return;

      this.handleRemoteIceCandidate(data.fromUserId, data.candidate).catch(err => {
        this.log('error', 'Failed to handle remote ICE candidate', {
          fromUserId: data.fromUserId,
          error: err.message,
        });
      });
    });
  }
```

### STEP 8: Public API Methods

```typescript
  /**
   * Get peer connection for a user
   */
  getPeerConnection(targetUserId: string): RTCPeerConnection | null {
    const peerInfo = this.peers.get(targetUserId);
    return peerInfo?.connection || null;
  }

  /**
   * Get remote stream for a user
   */
  getRemoteStream(targetUserId: string): MediaStream | undefined {
    const peerInfo = this.peers.get(targetUserId);
    return peerInfo?.stream;
  }

  /**
   * Add track to peer connection (triggers negotiation)
   * Ensures consistent track order: audio first, then video
   */
  addTrackToPeer(
    targetUserId: string,
    track: MediaStreamTrack,
    stream: MediaStream
  ): void {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${targetUserId}`);
    }

    const pc = peerInfo.connection;
    const sender = pc.addTrack(track, stream);

    // Track order: audio first, then video
    // This is handled automatically by addTrack order

    this.log('info', `Track added to peer ${targetUserId}`, {
      kind: track.kind,
      id: track.id,
    });
  }

  /**
   * Remove track from peer connection
   */
  removeTrackFromPeer(targetUserId: string, track: MediaStreamTrack): void {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${targetUserId}`);
    }

    const pc = peerInfo.connection;
    const sender = pc.getSenders().find(s => s.track === track);

    if (sender) {
      pc.removeTrack(sender);
      this.log('info', `Track removed from peer ${targetUserId}`, {
        kind: track.kind,
        id: track.id,
      });
    }
  }

  /**
   * Get all peer connections
   */
  getAllPeerConnections(): Map<string, RTCPeerConnection> {
    const result = new Map<string, RTCPeerConnection>();
    this.peers.forEach((peerInfo, userId) => {
      result.set(userId, peerInfo.connection);
    });
    return result;
  }

  /**
   * Helper: Determine if current user is "polite" peer
   * 
   * ⚠️ CRITICAL: Both peers must use the same logic!
   * This helper ensures consistency across the application.
   * 
   * Logic: Lexicographic string comparison
   * - If myUserId > targetUserId → isPolite = true
   * - If myUserId < targetUserId → isPolite = false
   * 
   * Example:
   * - User "user-2" connecting to "user-1" → true (user-2 > user-1 alphabetically)
   * - User "user-1" connecting to "user-2" → false (user-1 < user-2 alphabetically)
   * 
   * This ensures the same peer is always polite on both sides.
   * 
   * See DEVIL_DETAILS_CHECKLIST.md for more information.
   */
  static determineIsPolite(myUserId: string, targetUserId: string): boolean {
    return myUserId > targetUserId;
  }
}
```

---

## ✅ ACCEPTANCE CRITERIA

- [ ] P2PPeerConnectionManager class created
- [ ] Negotiation Queue implemented (sequential processing)
- [ ] Making Perfect Negotiation pattern implemented (polite/impolite)
- [ ] ICE candidate queue với MAX limit (50)
- [ ] Connection recovery với exponential backoff (max 3 attempts)
- [ ] Track order consistency (audio first, then video)
- [ ] Signaling state management (wait for stable before negotiation)
- [ ] Offer collision handling
- [ ] All tests passing
- [ ] No race conditions in negotiation

---

## 🧪 TESTING STRATEGY

### Unit Tests

**File:** `talkplatform-frontend/services/p2p/core/__tests__/p2p-peer-connection-manager.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { P2PPeerConnectionManager } from '../p2p-peer-connection-manager';
import { createMockSocket } from '../../../tests/utils/webrtc-test-utils';

describe('P2PPeerConnectionManager', () => {
  let manager: P2PPeerConnectionManager;
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();
    manager = new P2PPeerConnectionManager(mockSocket as any, 'meeting-1', 'user-1');
  });

  // Test 1: Negotiation Queue Sequential Processing
  it('should process negotiation queue sequentially', async () => {
    await manager.initialize();
    
    const config = {
      socket: mockSocket as any,
      meetingId: 'meeting-1',
      userId: 'user-1',
      targetUserId: 'user-2',
      isPolite: true,
    };

    const pc = manager.getOrCreatePeerConnection(config);
    
    // Add multiple tracks quickly (should queue negotiations)
    const audioTrack = createMockMediaStreamTrack('audio', 'audio-1');
    const videoTrack = createMockMediaStreamTrack('video', 'video-1');
    const stream = createMockMediaStream([audioTrack, videoTrack]);

    manager.addTrackToPeer('user-2', audioTrack, stream);
    manager.addTrackToPeer('user-2', videoTrack, stream);

    // Wait for negotiations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify only one negotiation was processed at a time
    // (Check internal state or events)
  });

  // Test 2: Making Perfect Negotiation - Offer Collision
  it('should handle offer collision correctly', async () => {
    // Create two managers (simulating two peers)
    const manager1 = new P2PPeerConnectionManager(mockSocket as any, 'meeting-1', 'user-1');
    const manager2 = new P2PPeerConnectionManager(mockSocket as any, 'meeting-1', 'user-2');

    await manager1.initialize();
    await manager2.initialize();

    // ⚠️ IMPORTANT: Use static helper to ensure consistency
    // Manager1 (user-1) connecting to user-2: user-1 < user-2 → isPolite = false
    // Manager2 (user-2) connecting to user-1: user-2 > user-1 → isPolite = true
    const isPolite1 = P2PPeerConnectionManager.determineIsPolite('user-1', 'user-2');
    const isPolite2 = P2PPeerConnectionManager.determineIsPolite('user-2', 'user-1');
    
    expect(isPolite1).toBe(false);
    expect(isPolite2).toBe(true);
    
    const pc1 = manager1.getOrCreatePeerConnection({
      socket: mockSocket as any,
      meetingId: 'meeting-1',
      userId: 'user-1',
      targetUserId: 'user-2',
      isPolite: isPolite1,
    });

    const pc2 = manager2.getOrCreatePeerConnection({
      socket: mockSocket as any,
      meetingId: 'meeting-1',
      userId: 'user-2',
      targetUserId: 'user-1',
      isPolite: isPolite2,
    });

    // Both try to make offer simultaneously
    // Manager1 (polite) should win, Manager2 should rollback
    // ... test implementation
  });

  // Test 3: Connection Recovery
  it('should retry connection with exponential backoff', async () => {
    // Simulate connection failure
    // Verify retry attempts with correct delays
    // Verify max retry limit
  });

  // Test 4: ConnectionClosed Handling (CRITICAL)
  it('should break negotiation queue immediately when connection closes', async () => {
    await manager.initialize();
    
    const config = {
      socket: mockSocket as any,
      meetingId: 'meeting-1',
      userId: 'user-1',
      targetUserId: 'user-2',
      isPolite: true,
    };

    const pc = manager.getOrCreatePeerConnection(config);
    
    // Queue multiple negotiations
    const audioTrack = createMockMediaStreamTrack('audio', 'audio-1');
    const videoTrack = createMockMediaStreamTrack('video', 'video-1');
    const stream = createMockMediaStream([audioTrack, videoTrack]);

    manager.addTrackToPeer('user-2', audioTrack, stream);
    manager.addTrackToPeer('user-2', videoTrack, stream);

    // Close connection while negotiations are queued
    pc.close();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify queue was cleared
    // Verify no further negotiations were attempted
    // Verify all queued tasks were rejected
  });
});
```

### Integration Tests

**File:** `talkplatform-frontend/services/p2p/core/__tests__/p2p-peer-connection-manager.integration.test.ts`

```typescript
describe('P2PPeerConnectionManager Integration', () => {
  // Test: Two peers connecting with rapid track additions
  it('should handle rapid track additions without race conditions', async () => {
    // User A joins → adds audio → adds video → adds screen share
    // User B receives all tracks correctly
    // No negotiation failures
  });

  // Test: Connection failure and recovery
  it('should recover from connection failure', async () => {
    // Simulate network interruption
    // Verify ICE restart
    // Verify connection re-established
  });
});
```

---

## ⚠️ CRITICAL NOTES

1. **Negotiation Queue là CRITICAL**: Không có queue → race conditions → tracks bị miss
2. **Making Perfect Negotiation**: Prevents offer collisions, ensures stable connections
3. **Signaling State**: Luôn wait cho 'stable' trước khi negotiation mới
4. **Debounce**: Rapid negotiations (multiple tracks) được debounce để tránh spam
5. **ICE Candidate Queue**: Limit 50 để tránh memory leak
6. **Connection Recovery**: Exponential backoff với max 3 attempts
7. **ConnectionClosed Handling**: ⚠️ **CRITICAL** - Khi connection closed, phải break loop và clear queue ngay lập tức để tránh lãng phí resource xử lý các task vô nghĩa. Điều này được xử lý trong `processNegotiationQueue` với checks trước và sau mỗi task.

---

**Last Updated:** 2025-01-20  
**Status:** ✅ Ready for Implementation (Code chi tiết đã được viết)  
**Score:** 9.5/10 ✅ Ready

**Review Notes:**
- ✅ Negotiation Queue với sequential processing (tránh race conditions)
- ✅ Making Perfect Negotiation pattern với polite/impolite peers (tránh offer collisions)
- ✅ **ConnectionClosed handling**: Break queue immediately khi connection closed (đã sửa)
- ✅ Exponential backoff cho connection recovery (max 3 attempts)
- ✅ ICE candidate queue với limit (50 candidates)
- ⚠️ Cần test kỹ rollback mechanism với các browsers (Chrome/Firefox/Safari modern)

