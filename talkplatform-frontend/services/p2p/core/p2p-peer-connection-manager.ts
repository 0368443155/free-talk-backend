import { BaseP2PManager } from './base-p2p-manager';
import { MediaManagerConfig, P2PErrorType } from '../types';
import { createP2PError } from '../utils/p2p-error';
import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * Peer Connection Info
 */
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

/**
 * Negotiation Task
 */
export interface NegotiationTask {
  id: string;
  type: 'offer' | 'answer' | 'ice-restart';
  priority: number; // Higher = more urgent (0 = normal, 1 = urgent)
  resolve: () => void;
  reject: (error: Error) => void;
  createdAt: number;
}

/**
 * Peer Connection Config
 */
export interface PeerConnectionConfig {
  targetUserId: string;
  isPolite?: boolean; // Who initiates (true = we make offer first)
  iceServers?: RTCConfiguration['iceServers'];
  localStream?: MediaStream; // Optional local stream to add tracks
}

const MAX_ICE_CANDIDATES_QUEUE = 50;
const MAX_CONNECTION_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const NEGOTIATION_DEBOUNCE_MS = 150; // Debounce rapid negotiations
const SIGNALING_STATE_TIMEOUT_MS = 10000;

/**
 * P2P Peer Connection Manager
 * 
 * Manages RTCPeerConnection lifecycle with:
 * - Negotiation Queue to avoid race conditions (CRITICAL)
 * - ICE candidate handling with queue limits
 * - Connection recovery with exponential backoff
 * - Perfect Negotiation pattern
 */
export class P2PPeerConnectionManager extends BaseP2PManager {
  private peers: Map<string, PeerConnectionInfo> = new Map();
  private negotiationDebounceTimer: Map<string, NodeJS.Timeout> = new Map();
  
  private readonly MAX_ICE_CANDIDATES = MAX_ICE_CANDIDATES_QUEUE;
  private readonly MAX_RETRIES = MAX_CONNECTION_RETRY_ATTEMPTS;
  private readonly INITIAL_RETRY_DELAY = INITIAL_RETRY_DELAY_MS;
  private readonly NEGOTIATION_DEBOUNCE = NEGOTIATION_DEBOUNCE_MS;

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

    // Listen to WebRTC signaling events
    this.setupSignalingListeners();

    this.isInitialized = true;
    this.log('info', 'P2PPeerConnectionManager initialized');
  }

  /**
   * Setup socket listeners for signaling events
   */
  private setupSignalingListeners(): void {
    // Listen for offer from remote peer
    // Backend emits with fromUserId (the user who sent the offer)
    this.onSocketEvent('media:offer', async (data: { fromUserId?: string; targetUserId?: string; offer: RTCSessionDescriptionInit }) => {
      try {
        // Backend may send fromUserId or targetUserId depending on implementation
        const fromUserId = data.fromUserId || data.targetUserId;
        if (!fromUserId) {
          this.log('error', 'Received offer without userId');
          return;
        }
        await this.handleRemoteOffer(fromUserId, data.offer);
      } catch (error: any) {
        this.log('error', 'Failed to handle remote offer', { error: error.message });
      }
    });

    // Listen for answer from remote peer
    this.onSocketEvent('media:answer', async (data: { fromUserId?: string; targetUserId?: string; answer: RTCSessionDescriptionInit }) => {
      try {
        const fromUserId = data.fromUserId || data.targetUserId;
        if (!fromUserId) {
          this.log('error', 'Received answer without userId');
          return;
        }
        await this.handleRemoteAnswer(fromUserId, data.answer);
      } catch (error: any) {
        this.log('error', 'Failed to handle remote answer', { error: error.message });
      }
    });

    // Listen for ICE candidate from remote peer
    this.onSocketEvent('media:ice-candidate', async (data: { fromUserId?: string; targetUserId?: string; candidate: RTCIceCandidateInit }) => {
      try {
        const fromUserId = data.fromUserId || data.targetUserId;
        if (!fromUserId) {
          this.log('error', 'Received ICE candidate without userId');
          return;
        }
        await this.handleRemoteIceCandidate(fromUserId, data.candidate);
      } catch (error: any) {
        this.log('error', 'Failed to handle remote ICE candidate', { error: error.message });
      }
    });
  }

  /**
   * Determine if this peer is "polite" (makes offer first)
   * 
   * ⚠️ CRITICAL: This must be consistent across both peers
   * Both peers must use the same logic to determine who is "polite"
   * 
   * Recommended logic (simple string comparison):
   * - User "user-2" connecting to "user-1" → isPolite = true (user-2 > user-1)
   * - User "user-1" connecting to "user-2" → isPolite = false (user-1 < user-2)
   * - Same peer is always polite on both sides
   */
  static determineIsPolite(myUserId: string, targetUserId: string): boolean {
    return myUserId > targetUserId; // Lexicographical comparison
  }

  /**
   * Create or get peer connection for a user
   */
  getOrCreatePeerConnection(config: PeerConnectionConfig): RTCPeerConnection {
    const { targetUserId, isPolite, iceServers, localStream } = config;
    
    // Determine isPolite if not provided
    const determinedIsPolite = isPolite ?? P2PPeerConnectionManager.determineIsPolite(this.userId, targetUserId);
    
    let peerInfo = this.peers.get(targetUserId);
    
    // Check if connection is still valid (not closed or failed)
    if (peerInfo) {
      const state = peerInfo.connection.connectionState;
      if (state !== 'closed' && state !== 'failed') {
        // Update isPolite if changed (shouldn't happen, but handle it)
        peerInfo.isPolite = determinedIsPolite;
        return peerInfo.connection;
      }
    }

    // Create new RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    });

    // Initialize peer info
    peerInfo = {
      userId: targetUserId,
      connection: pc,
      isPolite: determinedIsPolite,
      negotiationQueue: [],
      isNegotiating: false,
      pendingCandidates: [],
      connectionRetryCount: 0,
      lastConnectionState: 'new',
    };

    this.peers.set(targetUserId, peerInfo);

    // Add local tracks if provided
    if (localStream) {
      const tracks = localStream.getTracks();
      // Add audio tracks first, then video tracks (consistent order)
      tracks.filter(track => track.kind === 'audio').forEach(track => {
        pc.addTrack(track, localStream);
      });
      tracks.filter(track => track.kind === 'video').forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Setup event handlers
    this.setupPeerConnectionHandlers(targetUserId, pc);

    this.log('info', `Peer connection created for ${targetUserId}`, { isPolite: determinedIsPolite });

    return pc;
  }

  /**
   * Setup peer connection event handlers
   */
  private setupPeerConnectionHandlers(targetUserId: string, pc: RTCPeerConnection): void {
    // Setup negotiation needed handler
    this.setupNegotiationNeededHandler(targetUserId, pc);

    // Setup ICE candidate handler
    this.setupIceCandidateHandler(targetUserId, pc);

    // Setup connection state handler
    this.setupConnectionStateHandler(targetUserId, pc);

    // Setup track handler
    this.setupTrackHandler(targetUserId, pc);
  }

  /**
   * Setup negotiation needed handler with debounce
   */
  private setupNegotiationNeededHandler(targetUserId: string, pc: RTCPeerConnection): void {
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
   * Setup ICE candidate handler
   */
  private setupIceCandidateHandler(targetUserId: string, pc: RTCPeerConnection): void {
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
   * Setup connection state handler with recovery logic
   */
  private setupConnectionStateHandler(targetUserId: string, pc: RTCPeerConnection): void {
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

      if (state === 'failed') {
        this.handleConnectionFailed(targetUserId, pc);
      } else if (state === 'connected') {
        // Reset retry count on successful connection
        peerInfo.connectionRetryCount = 0;
      }
    };
  }

  /**
   * Setup track handler
   */
  private setupTrackHandler(targetUserId: string, pc: RTCPeerConnection): void {
    pc.ontrack = (event) => {
      const peerInfo = this.peers.get(targetUserId);
      if (!peerInfo) return;

      this.log('info', `Received ${event.track.kind} track from ${targetUserId}`);

      const [remoteStream] = event.streams;
      if (remoteStream) {
        peerInfo.stream = remoteStream;
        this.emit('track-received', { userId: targetUserId, stream: remoteStream, track: event.track });
      }
    };
  }

  /**
   * Queue negotiation to avoid race conditions
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

    // Check if connection is already closed or failed
    const connectionState = peerInfo.connection.connectionState;
    if (connectionState === 'closed' || connectionState === 'failed') {
      this.log('warn', `Connection ${connectionState}, clearing negotiation queue for ${targetUserId}`);
      // Reject all pending tasks
      peerInfo.negotiationQueue.forEach(task => {
        task.reject(new Error(`Connection ${connectionState}`));
      });
      peerInfo.negotiationQueue = [];
      return;
    }

    peerInfo.isNegotiating = true;

    try {
      while (peerInfo.negotiationQueue.length > 0) {
        // Check connection state before each task
        const connectionState = peerInfo.connection.connectionState;
        if (connectionState === 'closed' || connectionState === 'failed') {
          this.log('warn', `Connection ${connectionState} during negotiation, clearing remaining queue`, {
            targetUserId,
            remainingTasks: peerInfo.negotiationQueue.length,
          });
          // Reject all remaining tasks
          peerInfo.negotiationQueue.forEach(task => {
            task.reject(new Error(`Connection ${connectionState}`));
          });
          peerInfo.negotiationQueue = [];
          break; // ⚠️ CRITICAL: Break immediately, don't process remaining tasks
        }

        const task = peerInfo.negotiationQueue.shift()!;

        try {
          // Wait for signaling state to be stable
          await this.waitForSignalingState(targetUserId, 'stable');

          // Double-check connection state after wait
          const connectionStateAfterWait = peerInfo.connection.connectionState;
          if (connectionStateAfterWait === 'closed' || connectionStateAfterWait === 'failed') {
            task.reject(new Error(`Connection ${connectionStateAfterWait} during negotiation`));
            // Clear remaining queue
            peerInfo.negotiationQueue.forEach(t => {
              t.reject(new Error(`Connection ${connectionStateAfterWait}`));
            });
            peerInfo.negotiationQueue = [];
            break;
          }

          // Execute negotiation task
          switch (task.type) {
            case 'offer':
              await this.handleNegotiationOffer(targetUserId);
              break;
            case 'ice-restart':
              await this.handleIceRestart(targetUserId);
              break;
            // Answer is handled when receiving offer from remote peer
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
          const currentConnectionState = peerInfo.connection.connectionState;
          const isConnectionError = 
            error.message?.includes('Connection closed') ||
            error.message?.includes('closed') ||
            error.message?.includes('failed') ||
            currentConnectionState === 'closed' ||
            currentConnectionState === 'failed';

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
   */
  private async waitForSignalingState(
    targetUserId: string,
    targetState: RTCSignalingState,
    timeoutMs: number = SIGNALING_STATE_TIMEOUT_MS
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
      if (this.socket && pc.localDescription) {
        this.emitSocketEvent('media:offer', {
          roomId: this.meetingId,
          targetUserId,
          offer: pc.localDescription,
        });
      }

      // Wait for answer (with timeout)
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
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch (rollbackError: any) {
            this.log('error', `Failed to rollback local offer (Safari issue?)`, {
              fromUserId,
              error: rollbackError.message,
            });
            // Fallback for browsers that don't support rollback well (e.g., older Safari)
            this.emit('rollback-failed', {
              userId: fromUserId,
              reason: 'rollback_failed',
            });
            throw new Error('Rollback failed, peer connection needs to be recreated.');
          }
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
      if (this.socket && pc.localDescription) {
        this.emitSocketEvent('media:answer', {
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

  /**
   * Send ICE candidate
   */
  private sendIceCandidate(
    targetUserId: string,
    candidate: RTCIceCandidateInit
  ): void {
    if (!this.socket) return;

    this.emitSocketEvent('media:ice-candidate', {
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

  /**
   * Handle connection failed with exponential backoff retry
   */
  private async handleConnectionFailed(
    targetUserId: string,
    pc: RTCPeerConnection
  ): Promise<void> {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) return;

    if (peerInfo.connectionRetryCount >= this.MAX_RETRIES) {
      this.log('error', `Connection failed after ${this.MAX_RETRIES} retries for ${targetUserId}`);
      this.emit('connection-failed', {
        userId: targetUserId,
        retryCount: peerInfo.connectionRetryCount,
      });
      return;
    }

    peerInfo.connectionRetryCount++;

    // Exponential backoff: 1s, 2s, 4s, max 10s
    const delay = Math.min(
      this.INITIAL_RETRY_DELAY * Math.pow(2, peerInfo.connectionRetryCount - 1),
      10000
    );

    this.log('info', `Attempting connection recovery for ${targetUserId}`, {
      retryCount: peerInfo.connectionRetryCount,
      delay,
    });

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Try ICE restart first
      if (pc.restartIce) {
        pc.restartIce();
        this.log('info', `ICE restart initiated for ${targetUserId}`);
      } else {
        // Fallback: recreate connection
        this.log('warn', `ICE restart not available, recreating connection for ${targetUserId}`);
        this.closePeerConnection(targetUserId);
        this.emit('connection-recreate-needed', { userId: targetUserId });
      }
    } catch (error: any) {
      this.log('error', `Connection recovery failed for ${targetUserId}`, {
        error: error.message,
      });
      // Fallback: recreate connection
      this.closePeerConnection(targetUserId);
      this.emit('connection-recreate-needed', { userId: targetUserId });
    }
  }

  /**
   * Handle ICE restart
   */
  private async handleIceRestart(targetUserId: string): Promise<void> {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) {
      throw new Error(`Peer connection not found for ${targetUserId}`);
    }

    const pc = peerInfo.connection;

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      if (this.socket && pc.localDescription) {
        this.emitSocketEvent('media:offer', {
          roomId: this.meetingId,
          targetUserId,
          offer: pc.localDescription,
        });
      }

      this.log('info', `ICE restart offer sent for ${targetUserId}`);
    } catch (error: any) {
      this.log('error', `Failed to handle ICE restart`, {
        targetUserId,
        error: error.message,
      });
      throw error;
    }
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

    // Close connection (if not already closed)
    const connectionState = peerInfo.connection.connectionState;
    if (connectionState !== 'closed' && connectionState !== 'failed') {
      peerInfo.connection.close();
    }

    // Stop stream tracks
    if (peerInfo.stream) {
      peerInfo.stream.getTracks().forEach(track => track.stop());
    }

    this.peers.delete(targetUserId);
    this.log('info', `Peer connection closed for ${targetUserId}`);
  }

  /**
   * Add track to peer connection
   */
  addTrackToPeer(targetUserId: string, track: MediaStreamTrack, stream: MediaStream): void {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) return;

    peerInfo.connection.addTrack(track, stream);
    this.log('info', `Added ${track.kind} track to peer ${targetUserId}`);
  }

  /**
   * Remove track from peer connection
   */
  removeTrackFromPeer(targetUserId: string, track: MediaStreamTrack): void {
    const peerInfo = this.peers.get(targetUserId);
    if (!peerInfo) return;

    const sender = peerInfo.connection.getSenders().find(s => s.track === track);
    if (sender) {
      peerInfo.connection.removeTrack(sender);
      this.log('info', `Removed ${track.kind} track from peer ${targetUserId}`);
    }
  }

  /**
   * Get all peer connections
   */
  getAllPeerConnections(): Map<string, RTCPeerConnection> {
    const connections = new Map<string, RTCPeerConnection>();
    this.peers.forEach((peerInfo, userId) => {
      const state = peerInfo.connection.connectionState;
      if (state !== 'closed' && state !== 'failed') {
        connections.set(userId, peerInfo.connection);
      }
    });
    return connections;
  }

  /**
   * Get peer connection info
   */
  getPeerConnectionInfo(targetUserId: string): PeerConnectionInfo | null {
    return this.peers.get(targetUserId) || null;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    // Close all peer connections
    this.peers.forEach((peerInfo, userId) => {
      this.closePeerConnection(userId);
    });
    this.peers.clear();
    this.negotiationDebounceTimer.clear();
    
    this.cleanupTrackedListeners();
    this.isInitialized = false;
    this.log('info', 'P2PPeerConnectionManager cleaned up');
  }
}

