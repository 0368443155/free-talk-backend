'use client';

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useSyncExternalStore } from 'react'; // React 18+ hook for external stores
import { Socket } from 'socket.io-client';
import { P2PMediaManager, P2PStreamManager, P2PTrackStateSync, P2PPeerConnectionManager } from '@/services/p2p/core';
import { MediaManagerConfig } from '@/services/p2p/types';
import { toast } from 'sonner';

interface UseWebRTCV2Props {
  socket: Socket | null;
  meetingId: string;
  userId: string;
  isOnline: boolean;
}

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface UseWebRTCV2Return {
  localStream: MediaStream | null;
  screenStream: MediaStream | null; // 🔥 NEW: Separate screen stream
  peers: Map<string, PeerConnection>;
  connectionStates: Map<string, RTCPeerConnectionState>; // 🔥 FIX 1: Connection states
  connectedPeersCount: number; // 🔥 FIX 1: Connected peers count
  reconnectingPeers: Set<string>; // 🔥 FIX 2: Reconnecting peers
  remoteScreenShares: Map<string, MediaStream>; // 🔥 FIX: Remote screen shares
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  startLocalStream: () => Promise<void>;
  stopLocalStream: () => void;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  getFirstPeerConnection: () => RTCPeerConnection | null;
}

/**
 * CRITICAL: Use useSyncExternalStore to safely bind class manager state to React
 * This prevents "tearing" issues in React 18/19 StrictMode and ensures state consistency
 */
export function useWebRTCV2({ socket, meetingId, userId, isOnline }: UseWebRTCV2Props): UseWebRTCV2Return {
  // Managers - stored in ref to persist across renders
  const mediaManagerRef = useRef<P2PMediaManager | null>(null);
  const streamManagerRef = useRef<P2PStreamManager | null>(null);
  const stateSyncRef = useRef<P2PTrackStateSync | null>(null);
  const peerConnectionManagerRef = useRef<P2PPeerConnectionManager | null>(null);

  // Track if cleanup has been called to prevent duplicate cleanup
  const cleanupCalledRef = useRef(false);

  // Track current config to detect changes
  const configRef = useRef<{ socket: Socket; meetingId: string; userId: string } | null>(null);

  // 🔥 FIX 1: State for manager readiness to prevent race conditions
  const [areManagersReady, setAreManagersReady] = useState(false);

  // Cleanup function - must be defined before useEffect
  const cleanupManagers = useCallback(() => {
    // ⚠️ STRICT MODE DOUBLE INVOKE PROTECTION:
    // React 18 Strict Mode (Dev) runs effects twice to detect side effects.
    // cleanupCalledRef ensures cleanup only runs once per actual cleanup cycle.
    // However, if you see "P2PMediaManager initialized" log twice WITHOUT cleanup in between,
    // it means cleanupCalledRef is not being reset properly.
    // 
    // Debug: Watch console for:
    // - Expected: "initialized" → "cleaned up" → "initialized" (Strict Mode cycle)
    // - Problem: "initialized" → "initialized" (no cleanup between, check cleanupCalledRef reset)

    if (cleanupCalledRef.current) {
      console.log('[useWebRTCV2] Cleanup already called, skipping (Strict Mode protection)');
      return;
    }
    cleanupCalledRef.current = true;

    // Log cleanup for debugging Strict Mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[useWebRTCV2] Cleaning up managers (Strict Mode check)');
    }

    if (mediaManagerRef.current) {
      mediaManagerRef.current.cleanup();
      mediaManagerRef.current = null;
      console.log('[useWebRTCV2] P2PMediaManager cleaned up.');
    }
    if (streamManagerRef.current) {
      streamManagerRef.current.cleanup();
      streamManagerRef.current = null;
    }
    if (stateSyncRef.current) {
      stateSyncRef.current.cleanup();
      stateSyncRef.current = null;
    }
    if (peerConnectionManagerRef.current) {
      peerConnectionManagerRef.current.cleanup();
      peerConnectionManagerRef.current = null;
    }

    // Reset config ref
    configRef.current = null;

    // Reset cleanup flag (allows re-initialization if needed)
    cleanupCalledRef.current = false;
  }, []);

  // Initialize or recreate managers when config changes
  useEffect(() => {
    if (!socket) {
      // Cleanup if socket disconnects
      if (mediaManagerRef.current) {
        cleanupManagers();
      }
      return;
    }

    // Check if config changed (socket ID or meetingId/userId)
    const currentConfig = { socket, meetingId, userId };
    const configChanged =
      !configRef.current ||
      configRef.current.socket.id !== socket.id ||
      configRef.current.meetingId !== meetingId ||
      configRef.current.userId !== userId;

    // If config changed, cleanup old managers first (CRITICAL to prevent duplicate listeners)
    // ⚠️ CRITICAL: Cleanup is synchronous - no need for await/delay
    // cleanup() calls socket.off() and track.stop() which are all synchronous operations
    // Adding await setTimeout here is an anti-pattern that can cause:
    // - Component unmount during delay -> "Can't perform React state update on unmounted component"
    // - Memory leaks if component unmounts before initialization completes
    if (configChanged && mediaManagerRef.current) {
      console.log('[useWebRTCV2] Config changed or manager not present, cleaning up old manager.');
      cleanupManagers(); // Synchronous cleanup
      // No delay needed - cleanup is synchronous
      // If cleanup wasn't complete, we wouldn't be able to proceed anyway
    }

    // Initialize managers if not exists or config changed
    if (!mediaManagerRef.current || configChanged) {
      const mediaConfig: MediaManagerConfig = {
        socket,
        meetingId,
        userId,
      };

      const mediaManager = new P2PMediaManager(mediaConfig);
      const streamManager = new P2PStreamManager(mediaConfig);
      const stateSync = new P2PTrackStateSync(mediaConfig, {
        syncInterval: 30000, // 30 seconds
        conflictResolution: 'server-wins',
      });
      const peerConnectionManager = new P2PPeerConnectionManager(mediaConfig);

      // Initialize
      mediaManager.initialize().then(() => {
        mediaManagerRef.current = mediaManager;
        console.log('[useWebRTCV2] P2PMediaManager initialized.');

        streamManager.initialize().then(() => {
          streamManagerRef.current = streamManager;
        });

        stateSync.initialize().then(() => {
          stateSyncRef.current = stateSync;
        });

        peerConnectionManager.initialize().then(() => {
          peerConnectionManagerRef.current = peerConnectionManager;
          console.log('[useWebRTCV2] P2PPeerConnectionManager initialized.');

          // 🔥 FIX 2: Set media manager reference for reconnection
          peerConnectionManager.setMediaManager({
            getLocalStream: () => mediaManagerRef.current?.getLocalStream() || null,
            getScreenStream: () => mediaManagerRef.current?.getScreenStream() || null,
          });

          // Setup peer connection manager event handlers
          peerConnectionManager.on('track-received', (data: { userId: string; stream: MediaStream; track: MediaStreamTrack }) => {
            // Add remote stream to stream manager
            if (streamManagerRef.current) {
              streamManagerRef.current.addRemoteStream(data.userId, data.stream);
            }
          });

          peerConnectionManager.on('connection-failed', (data: { userId: string; retryCount?: number }) => {
            toast.error(`Connection failed for ${data.userId}`, {
              duration: 3000,
            });
          });

          peerConnectionManager.on('rollback-failed', (data: { userId: string; reason: string }) => {
            console.warn(`[useWebRTCV2] Rollback failed for ${data.userId}, may need to recreate connection`);
          });

          // 🔥 FIX 1: Mark managers as ready
          console.log('✅ Managers initialized and ready');
          setAreManagersReady(true);
        });

        // Listen to sync errors for Toast notifications
        mediaManager.on('sync-error', (error: { type: string; error: string; action: string }) => {
          toast.error(`Failed to ${error.action}: ${error.error}`, {
            duration: 3000,
          });
        });

        // Emit initial state change to trigger useSyncExternalStore subscriptions
        mediaManager.emit('stream-changed');
        mediaManager.emit('mic-state-changed', mediaManager.getMicState());
        mediaManager.emit('camera-state-changed', mediaManager.getCameraState());
      });

      // Store current config
      configRef.current = currentConfig;
    }

    // Cleanup on unmount or when dependencies change
    // ⚠️ CRITICAL: This cleanup runs synchronously when effect re-runs or component unmounts
    // No async operations here - all cleanup is synchronous
    return () => {
      console.log('[useWebRTCV2] useEffect cleanup function running.');
      setAreManagersReady(false); // 🔥 FIX 1: Reset ready state
      cleanupManagers(); // Synchronous cleanup on unmount or effect re-run
    };
  }, [socket, meetingId, userId, cleanupManagers]);

  // Use useSyncExternalStore to subscribe to manager state changes
  // This is the React 18+ recommended way to bind external stores (like our class managers)
  const localStream = useSyncExternalStore(
    (callback) => {
      // Subscribe function
      if (!mediaManagerRef.current) return () => { };

      const handleStreamChange = () => {
        callback(); // Trigger re-render
      };

      mediaManagerRef.current.on('stream-changed', handleStreamChange);

      return () => {
        mediaManagerRef.current?.off('stream-changed', handleStreamChange);
      };
    },
    () => {
      // Get snapshot
      return mediaManagerRef.current?.getLocalStream() || null;
    },
    () => null // Server snapshot (not used in client-only)
  );

  /**
   * CRITICAL: Use primitive values for getSnapshot to ensure reference equality
   * If getState() returns a new object each time, React will re-render infinitely.
   * Using getMicState().isMuted (primitive boolean) ensures same value = same reference.
   */
  const isMuted = useSyncExternalStore(
    (callback) => {
      if (!mediaManagerRef.current) return () => { };

      const handleStateChange = () => callback();
      mediaManagerRef.current.on('mic-state-changed', handleStateChange);

      return () => {
        mediaManagerRef.current?.off('mic-state-changed', handleStateChange);
      };
    },
    () => {
      // Use primitive value from getMicState() instead of full state object
      // This ensures reference equality: same value = no re-render
      const micState = mediaManagerRef.current?.getMicState();
      return micState?.isMuted ?? false; // Primitive boolean
    },
    () => false // Server snapshot (SSR not used)
  );

  /**
   * CRITICAL: Same approach - use primitive value for camera state
   */
  const isVideoOff = useSyncExternalStore(
    (callback) => {
      if (!mediaManagerRef.current) return () => { };

      const handleStateChange = () => callback();
      mediaManagerRef.current.on('camera-state-changed', handleStateChange);

      return () => {
        mediaManagerRef.current?.off('camera-state-changed', handleStateChange);
      };
    },
    () => {
      // Use primitive value from getCameraState() instead of full state object
      const cameraState = mediaManagerRef.current?.getCameraState();
      return cameraState?.isVideoOff ?? false; // Primitive boolean
    },
    () => false // Server snapshot (SSR not used)
  );

  /**
   * Screen sharing state
   */
  const isScreenSharing = useSyncExternalStore(
    (callback) => {
      if (!mediaManagerRef.current) return () => { };

      const handleStateChange = () => callback();
      mediaManagerRef.current.on('screen-state-changed', handleStateChange);

      return () => {
        mediaManagerRef.current?.off('screen-state-changed', handleStateChange);
      };
    },
    () => {
      const state = mediaManagerRef.current?.getState();
      return state?.screen.isSharing ?? false; // Primitive boolean
    },
    () => false
  );

  /**
   * Remote peers (from stream manager)
   * 
   * CRITICAL: Cache peers map reference to prevent infinite loop in useSyncExternalStore
   * Only create new Map when actual data changes
   */
  const peersSnapshotRef = useRef<Map<string, PeerConnection>>(new Map());
  const peersDataRef = useRef<string>(''); // Serialized data for comparison

  const peers = useSyncExternalStore(
    (callback) => {
      if (!streamManagerRef.current) return () => { };

      const handleStreamChange = () => callback();
      streamManagerRef.current.on('stream-added', handleStreamChange);
      streamManagerRef.current.on('stream-removed', handleStreamChange);
      streamManagerRef.current.on('stream-updated', handleStreamChange);

      return () => {
        streamManagerRef.current?.off('stream-added', handleStreamChange);
        streamManagerRef.current?.off('stream-removed', handleStreamChange);
        streamManagerRef.current?.off('stream-updated', handleStreamChange);
      };
    },
    () => {
      if (!streamManagerRef.current || !peerConnectionManagerRef.current) {
        if (peersSnapshotRef.current.size === 0) {
          return peersSnapshotRef.current; // Return cached empty map
        }
        peersSnapshotRef.current = new Map<string, PeerConnection>();
        peersDataRef.current = '';
        return peersSnapshotRef.current;
      }

      // Build peers map from stream manager and peer connection manager
      const peersMap = new Map<string, PeerConnection>();
      const allStreams = streamManagerRef.current.getAllRemoteStreamInfos();
      const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();

      allStreams.forEach((streamInfo, userId) => {
        const connection = allConnections.get(userId);
        if (connection) {
          peersMap.set(userId, {
            userId,
            connection,
            stream: streamInfo.mainStream || streamInfo.stream || undefined, // Only main stream here
          });
        }
      });

      // 🔥 FIX 2: Use JSON.stringify for robust comparison of map keys + stream IDs
      const stateObject = Array.from(peersMap.entries()).map(([uid, pc]) => ({
        uid,
        streamId: pc.stream?.id
      }));
      const currentData = JSON.stringify(stateObject);

      // Only create new Map if data actually changed
      if (currentData !== peersDataRef.current) {
        peersSnapshotRef.current = peersMap;
        peersDataRef.current = currentData;
      }

      // Always return cached reference to prevent infinite loop
      return peersSnapshotRef.current;
    },
    () => new Map<string, PeerConnection>()
  );

  /**
   * Screen stream (separate from camera)
   * 🔥 NEW: For displaying screen share in separate tile
   */
  const screenStream = useSyncExternalStore(
    (callback) => {
      if (!mediaManagerRef.current) return () => { };

      const handleChange = () => callback();
      mediaManagerRef.current.on('screen-stream-changed', handleChange);

      return () => {
        mediaManagerRef.current?.off('screen-stream-changed', handleChange);
      };
    },
    () => {
      return mediaManagerRef.current?.getScreenStream() || null;
    },
    () => null
  );

  /**
   * Connection states for all peers
   * 🔥 FIX 1: Track which peers are connected/disconnected/failed
   * 🔥 FIX: Cache snapshot to avoid infinite loop
   */
  const connectionStatesSnapshotRef = useRef<Map<string, RTCPeerConnectionState>>(new Map());
  const connectionStatesDataRef = useRef<string>(''); // Serialized data for comparison

  const connectionStates = useSyncExternalStore(
    (callback) => {
      if (!peerConnectionManagerRef.current) return () => {};
      
      const handleChange = () => callback();
      peerConnectionManagerRef.current.on('connection-state-changed', handleChange);
      
      return () => {
        peerConnectionManagerRef.current?.off('connection-state-changed', handleChange);
      };
    },
    () => {
      if (!peerConnectionManagerRef.current) {
        if (connectionStatesSnapshotRef.current.size === 0) {
          return connectionStatesSnapshotRef.current; // Return cached empty map
        }
        connectionStatesSnapshotRef.current = new Map<string, RTCPeerConnectionState>();
        connectionStatesDataRef.current = '';
        return connectionStatesSnapshotRef.current;
      }

      const statesMap = peerConnectionManagerRef.current.getAllConnectionStates();
      
      // Serialize data for comparison
      const currentData = Array.from(statesMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([userId, state]) => `${userId}:${state}`)
        .join(',') + `|${statesMap.size}`;

      // Only create new Map if data actually changed
      if (currentData !== connectionStatesDataRef.current) {
        connectionStatesSnapshotRef.current = new Map(statesMap);
        connectionStatesDataRef.current = currentData;
      }

      // Always return cached reference to prevent infinite loop
      return connectionStatesSnapshotRef.current;
    },
    () => new Map()
  );

  /**
   * Count of connected peers
   * 🔥 FIX 1: Quick way to check how many peers are connected
   */
  const connectedPeersCount = useSyncExternalStore(
    (callback) => {
      if (!peerConnectionManagerRef.current) return () => {};
      
      const handleChange = () => callback();
      peerConnectionManagerRef.current.on('connection-state-changed', handleChange);
      
      return () => {
        peerConnectionManagerRef.current?.off('connection-state-changed', handleChange);
      };
    },
    () => {
      if (!peerConnectionManagerRef.current) return 0;
      return peerConnectionManagerRef.current.getConnectedPeersCount();
    },
    () => 0
  );

  /**
   * Reconnection state
   * 🔥 FIX 2: Track which peers are reconnecting
   */
  const [reconnectingPeers, setReconnectingPeers] = useState<Set<string>>(new Set());

  /**
   * Remote screen shares
   * 🔥 FIX: Track remote screen shares separately
   */
  const remoteScreenSharesSnapshotRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteScreenSharesDataRef = useRef<string>('');

  const remoteScreenShares = useSyncExternalStore(
    (callback) => {
      if (!streamManagerRef.current) return () => {};
      const handleCheck = () => callback();
      streamManagerRef.current.on('stream-updated', handleCheck);
      return () => streamManagerRef.current?.off('stream-updated', handleCheck);
    },
    () => {
      if (!streamManagerRef.current) {
        if (remoteScreenSharesSnapshotRef.current.size === 0) {
          return remoteScreenSharesSnapshotRef.current;
        }
        remoteScreenSharesSnapshotRef.current = new Map<string, MediaStream>();
        remoteScreenSharesDataRef.current = '';
        return remoteScreenSharesSnapshotRef.current;
      }

      const map = new Map<string, MediaStream>();
      streamManagerRef.current.getAllRemoteStreamInfos().forEach((info, userId) => {
        if (info.screenStream) {
          map.set(userId, info.screenStream);
        }
      });

      // Serialize for comparison
      const stateObject = Array.from(map.entries()).map(([uid, stream]) => ({
        uid,
        streamId: stream.id
      }));
      const currentData = JSON.stringify(stateObject);

      if (currentData !== remoteScreenSharesDataRef.current) {
        remoteScreenSharesSnapshotRef.current = new Map(map);
        remoteScreenSharesDataRef.current = currentData;
      }

      return remoteScreenSharesSnapshotRef.current;
    },
    () => new Map()
  );

  // 🔥 FIX 2: Listen for reconnection events
  useEffect(() => {
    if (!peerConnectionManagerRef.current) return;

    const handleReconnecting = (data: { userId: string }) => {
      setReconnectingPeers(prev => new Set(prev).add(data.userId));
    };

    const handleReconnected = (data: { userId: string; attempts: number }) => {
      setReconnectingPeers(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });

      toast.success(`Reconnected to peer`);
    };

    const handleReconnectFailed = (data: { userId: string; attempts: number }) => {
      setReconnectingPeers(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });

      toast.error(`Failed to reconnect after ${data.attempts} attempts`);
    };

    peerConnectionManagerRef.current.on('reconnecting', handleReconnecting);
    peerConnectionManagerRef.current.on('reconnected', handleReconnected);
    peerConnectionManagerRef.current.on('reconnect-failed', handleReconnectFailed);

    return () => {
      peerConnectionManagerRef.current?.off('reconnecting', handleReconnecting);
      peerConnectionManagerRef.current?.off('reconnected', handleReconnected);
      peerConnectionManagerRef.current?.off('reconnect-failed', handleReconnectFailed);
    };
  }, []);

  // Start local stream
  const startLocalStream = useCallback(async () => {
    if (!mediaManagerRef.current || !socket) return;

    try {
      console.log('📹 [useWebRTCV2] Starting local stream...');
      await mediaManagerRef.current.initializeLocalStream(true, true);
      // State will update automatically via useSyncExternalStore subscription
      mediaManagerRef.current.emit('stream-changed');

      // 🔥 FIX: Emit media:ready with userId (like v1)
      if (socket.connected) {
        socket.emit('media:ready', { roomId: meetingId, userId });
        console.log('✅ [useWebRTCV2] Emitted media:ready');
      }
    } catch (error: any) {
      console.error('❌ [useWebRTCV2] Failed:', error);
      toast.error(`Failed to start local stream: ${error.message}`);
    }
  }, [socket, meetingId, userId]);

  // Stop local stream
  const stopLocalStream = useCallback(() => {
    if (!mediaManagerRef.current) return;

    const stream = mediaManagerRef.current.getLocalStream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      mediaManagerRef.current.emit('stream-changed');
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!mediaManagerRef.current) return;

    try {
      // 🔥 FIX: Check if localStream exists, start it if needed (like v1 hook)
      const currentLocalStream = mediaManagerRef.current.getLocalStream();
      if (!currentLocalStream) {
        console.log('🎤 [toggleMute] Local stream not initialized, starting...');
        await startLocalStream();
        // Wait a bit for stream to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Use getMicState() for primitive value instead of full state
      const micState = mediaManagerRef.current.getMicState();
      await mediaManagerRef.current.enableMicrophone(!micState.enabled);
      // State will update automatically via useSyncExternalStore subscription
      // Manager emits 'mic-state-changed' event which triggers callback()
    } catch (error: any) {
      console.error('❌ [toggleMute] Failed:', error);
      toast.error(`Failed to toggle microphone: ${error.message}`);
    }
  }, [startLocalStream]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!mediaManagerRef.current) return;

    try {
      // 🔥 FIX: Check if localStream exists, start it if needed (like v1 hook)
      const currentLocalStream = mediaManagerRef.current.getLocalStream();
      if (!currentLocalStream) {
        console.log('📹 [toggleVideo] Local stream not initialized, starting...');
        await startLocalStream();
        // Wait a bit for stream to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Use getCameraState() for primitive value instead of full state
      const cameraState = mediaManagerRef.current.getCameraState();
      await mediaManagerRef.current.enableCamera(!cameraState.enabled);
      // State will update automatically via useSyncExternalStore subscription
      // Manager emits 'camera-state-changed' event which triggers callback()
    } catch (error: any) {
      console.error('❌ [toggleVideo] Failed:', error);
      toast.error(`Failed to toggle camera: ${error.message}`);
    }
  }, [startLocalStream]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!mediaManagerRef.current || !peerConnectionManagerRef.current) return;

    const state = mediaManagerRef.current.getState();
    const isCurrentlySharing = state.screen.isSharing;

    try {
      if (isCurrentlySharing) {
        // Stop screen sharing
        const screenTrack = state.screen.track;
        if (screenTrack) {
          screenTrack.stop();
        }

        // 🔥 FIX: Remove ONLY screen track, keep camera
        const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();
        allConnections.forEach((pc) => {
          const senders = pc.getSenders();
          // Find screen sender by label (screen tracks have 'screen' in label)
          const screenSender = senders.find(s =>
            s.track?.kind === 'video' &&
            s.track?.label.includes('screen')
          );
          if (screenSender) {
            pc.removeTrack(screenSender); // Remove only screen, keep camera
          }
        });

        // Clear screen stream
        mediaManagerRef.current.setScreenStream(null);
        mediaManagerRef.current.emit('screen-state-changed');

        if (socket) {
          socket.emit('media:screen-share', {
            roomId: meetingId,
            userId,
            isSharing: false
          });
        }
      } else {
        // Start screen sharing
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: 30,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } as MediaTrackConstraints,
          audio: false,
        });

        const screenTrack = displayStream.getVideoTracks()[0];
        if (!screenTrack) {
          throw new Error('No screen track available');
        }

        // 🔥 FIX: Add screen track WITHOUT replacing camera
        const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();

        allConnections.forEach((pc) => {
          // Add screen track as ADDITIONAL track (don't replace camera)
          pc.addTrack(screenTrack, displayStream);
        });

        // Store screen stream separately (this will also update state.screen.isSharing)
        mediaManagerRef.current.setScreenStream(displayStream);

        // Auto-stop when user clicks "Stop sharing"
        screenTrack.onended = () => {
          // Check current state (may have changed)
          const currentState = mediaManagerRef.current?.getState();
          if (currentState?.screen.isSharing) {
            toggleScreenShare().catch(() => { });
          }
        };

        if (socket) {
          socket.emit('media:screen-share', {
            roomId: meetingId,
            userId,
            isSharing: true
          });
        }
      }
    } catch (error: any) {
      console.error('❌ [Screen Share] Failed:', error);
      toast.error(`Failed to toggle screen share: ${error.message}`);
    }
  }, [socket, meetingId, userId]);

  // 🔥 FIX: AUTO-START local stream when socket connects
  useEffect(() => {
    if (socket?.connected && !localStream && mediaManagerRef.current) {
      console.log('🎥 [useWebRTCV2] Auto-starting local stream...');
      startLocalStream()
        .then(() => {
          console.log('✅ [useWebRTCV2] Stream started');
        })
        .catch((error: any) => {
          console.error('❌ [useWebRTCV2] Failed:', error);
          toast.error(
            error?.message?.includes('permission')
              ? error.message
              : "Failed to access camera/microphone",
            { duration: 5000 }
          );
        });
    }
  }, [socket?.connected, localStream, startLocalStream]);

  // Handle peer connections (offer, answer, ICE candidate)
  // 🔥 FIX 1: Only run when managers are ready to prevent race conditions
  const hasRequestedPeersRef = useRef(false);
  
  useEffect(() => {
    // Guard: Only run if everything is ready
    if (!socket?.connected || !areManagersReady || !peerConnectionManagerRef.current) {
      return;
    }

    // Handle new peer ready
    const handlePeerReady = async (data: { userId: string }) => {
      if (data.userId === userId) return;

      const localStream = mediaManagerRef.current?.getLocalStream();
      if (!localStream) return;

      if (!peerConnectionManagerRef.current) return;

      try {
        const pc = peerConnectionManagerRef.current.getOrCreatePeerConnection({
          targetUserId: data.userId,
          localStream,
        });

        // Add local tracks to peer connection
        localStream.getTracks().forEach(track => {
          peerConnectionManagerRef.current!.addTrackToPeer(data.userId, track, localStream);
        });

        // Sync peer connections to media manager after adding new peer
        if (mediaManagerRef.current) {
          const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();
          mediaManagerRef.current.setPeerConnections(allConnections);
        }
      } catch (error: any) {
        console.error(`Failed to create peer connection for ${data.userId}:`, error);
      }
    };

    // Handle user left
    const handleUserLeft = (data: { userId: string }) => {
      if (peerConnectionManagerRef.current) {
        peerConnectionManagerRef.current.closePeerConnection(data.userId);
      }
      if (streamManagerRef.current) {
        streamManagerRef.current.removeRemoteStream(data.userId);
      }

      // Sync peer connections to media manager after removing peer
      if (mediaManagerRef.current && peerConnectionManagerRef.current) {
        const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();
        mediaManagerRef.current.setPeerConnections(allConnections);
      }
    };

    // 🔥 FIX: Add WebRTC signaling handlers (CRITICAL!)
    const handleOffer = async (data: { fromUserId: string; roomId: string; offer: RTCSessionDescriptionInit }) => {
      if (!peerConnectionManagerRef.current) return;
      console.log(`📨 [useWebRTCV2] Received offer from ${data.fromUserId}`);
      try {
        await peerConnectionManagerRef.current.handleRemoteOffer(data.fromUserId, data.offer);
        console.log(`✅ [useWebRTCV2] Processed offer`);
      } catch (error: any) {
        console.error(`❌ [useWebRTCV2] Failed to handle offer:`, error);
      }
    };

    const handleAnswer = async (data: { fromUserId: string; roomId: string; answer: RTCSessionDescriptionInit }) => {
      if (!peerConnectionManagerRef.current) return;
      console.log(`📨 [useWebRTCV2] Received answer from ${data.fromUserId}`);
      try {
        await peerConnectionManagerRef.current.handleRemoteAnswer(data.fromUserId, data.answer);
        console.log(`✅ [useWebRTCV2] Processed answer`);
      } catch (error: any) {
        console.error(`❌ [useWebRTCV2] Failed to handle answer:`, error);
      }
    };

    const handleIceCandidate = async (data: { fromUserId: string; roomId: string; candidate: RTCIceCandidateInit }) => {
      if (!peerConnectionManagerRef.current) return;
      try {
        await peerConnectionManagerRef.current.handleRemoteIceCandidate(data.fromUserId, data.candidate);
      } catch (error: any) {
        console.error(`❌ [useWebRTCV2] Failed to add ICE candidate:`, error);
      }
    };

    // Backend emits 'meeting:user-joined' when requesting peers
    // Backend emits 'media:peer-ready' when user is ready for WebRTC
    const handleUserJoined = async (data: { userId: string; userName?: string }) => {
      if (data.userId === userId) return;
      // Trigger peer ready handler
      await handlePeerReady({ userId: data.userId });
    };

    // Register all handlers
    socket.on('media:peer-ready', handlePeerReady);
    socket.on('meeting:user-joined', handleUserJoined);
    socket.on('meeting:user-left', handleUserLeft);
    socket.on('media:offer', handleOffer);  // ✅ NEW
    socket.on('media:answer', handleAnswer);  // ✅ NEW
    socket.on('media:ice-candidate', handleIceCandidate);  // ✅ NEW

    // 🔥 FIX 1: Debounce/Guard request-peers - Only request once when effect runs
    if (!hasRequestedPeersRef.current) {
      console.log('📡 Requesting peers (One-time check)...');
      socket.emit('meeting:request-peers');
      hasRequestedPeersRef.current = true;
    }

    return () => {
      // Cleanup
      socket.off('media:peer-ready', handlePeerReady);
      socket.off('meeting:user-joined', handleUserJoined);
      socket.off('meeting:user-left', handleUserLeft);
      socket.off('media:offer', handleOffer);  // ✅ NEW
      socket.off('media:answer', handleAnswer);  // ✅ NEW
      socket.off('media:ice-candidate', handleIceCandidate);  // ✅ NEW
      hasRequestedPeersRef.current = false; // Reset for next run
    };
  }, [socket, userId, areManagersReady]); // 🔥 FIX 1: Stable dependencies

  // 🔥 FIX 3: Handle socket reconnection
  useEffect(() => {
    if (!socket) return;

    const handleSocketReconnect = async () => {
      console.log('🔄 Socket reconnected, syncing states...');

      // 1. Sync media states
      if (mediaManagerRef.current) {
        await mediaManagerRef.current.syncAllStatesToServer();
      }

      // 2. Re-emit media:ready
      if (localStream && socket.connected) {
        console.log('📡 Re-emitting media:ready after reconnect');
        socket.emit('media:ready', {
          roomId: meetingId,
          userId
        });
      }

      // 3. Request peers again
      console.log('📡 Requesting peers after reconnect');
      socket.emit('meeting:request-peers');

      toast.success('Reconnected to server');
    };

    socket.on('connect', handleSocketReconnect);

    return () => {
      socket.off('connect', handleSocketReconnect);
    };
  }, [socket, meetingId, userId, localStream]);

  // 🔥 FIX 4: Track screen share state
  useEffect(() => {
    if (!socket) return;
    
    const handleRemoteScreenShare = (data: { userId: string, isSharing: boolean }) => {
      if (data.isSharing) {
        toast.info(`User started screen sharing`);
      } else {
        // Clean up if needed - stream manager will handle it
      }
    };
    
    socket.on('media:user-screen-share', handleRemoteScreenShare);
    
    return () => {
      socket.off('media:user-screen-share', handleRemoteScreenShare);
    };
  }, [socket]);

  // Helper to get first peer connection for bandwidth monitoring
  const getFirstPeerConnection = useCallback((): RTCPeerConnection | null => {
    if (!peerConnectionManagerRef.current) return null;
    const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();
    const firstConnection = Array.from(allConnections.values())[0];
    return firstConnection || null;
  }, []);

  return {
    localStream,
    screenStream, // 🔥 NEW: Separate screen stream
    peers,
    connectionStates, // 🔥 FIX 1: Connection states
    connectedPeersCount, // 🔥 FIX 1: Connected peers count
    reconnectingPeers, // 🔥 FIX 2: Reconnecting peers
    remoteScreenShares, // 🔥 FIX: Remote screen shares
    isMuted,
    isVideoOff,
    isScreenSharing,
    startLocalStream,
    stopLocalStream,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    getFirstPeerConnection,
  };
}

