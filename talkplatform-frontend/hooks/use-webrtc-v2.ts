'use client';

import { useRef, useCallback, useEffect, useMemo } from 'react';
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
  peers: Map<string, PeerConnection>;
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
    if (!socket || !isOnline) {
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
      cleanupManagers(); // Synchronous cleanup on unmount or effect re-run
    };
  }, [socket, meetingId, userId, isOnline, cleanupManagers]);

  // Use useSyncExternalStore to subscribe to manager state changes
  // This is the React 18+ recommended way to bind external stores (like our class managers)
  const localStream = useSyncExternalStore(
    (callback) => {
      // Subscribe function
      if (!mediaManagerRef.current) return () => {};
      
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
      if (!mediaManagerRef.current) return () => {};
      
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
      if (!mediaManagerRef.current) return () => {};
      
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
      if (!mediaManagerRef.current) return () => {};
      
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
      if (!streamManagerRef.current) return () => {};
      
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
            stream: streamInfo.stream,
          });
        }
      });

      // Serialize data for comparison (simple approach: userIds + stream count)
      const currentData = Array.from(peersMap.keys()).sort().join(',') + `|${peersMap.size}`;
      
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

  // Start local stream
  const startLocalStream = useCallback(async () => {
    if (!mediaManagerRef.current) return;

    try {
      await mediaManagerRef.current.initializeLocalStream(true, true);
      // State will update automatically via useSyncExternalStore subscription
      mediaManagerRef.current.emit('stream-changed');
    } catch (error: any) {
      toast.error(`Failed to start local stream: ${error.message}`);
    }
  }, []);

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
      // Use getMicState() for primitive value instead of full state
      const micState = mediaManagerRef.current.getMicState();
      await mediaManagerRef.current.enableMicrophone(!micState.enabled);
      // State will update automatically via useSyncExternalStore subscription
      // Manager emits 'mic-state-changed' event which triggers callback()
    } catch (error: any) {
      toast.error(`Failed to toggle microphone: ${error.message}`);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!mediaManagerRef.current) return;
    
    try {
      // Use getCameraState() for primitive value instead of full state
      const cameraState = mediaManagerRef.current.getCameraState();
      await mediaManagerRef.current.enableCamera(!cameraState.enabled);
      // State will update automatically via useSyncExternalStore subscription
      // Manager emits 'camera-state-changed' event which triggers callback()
    } catch (error: any) {
      toast.error(`Failed to toggle camera: ${error.message}`);
    }
  }, []);

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

        // Remove screen track from all peer connections
        const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();
        allConnections.forEach((pc, targetUserId) => {
          const senders = pc.getSenders();
          const screenSender = senders.find(s => s.track?.kind === 'video' && s.track?.label.includes('screen'));
          if (screenSender && screenSender.track) {
            pc.removeTrack(screenSender);
          }
        });

        // Restore camera if available
        const cameraTrack = state.camera.track;
        if (cameraTrack && cameraTrack.readyState === 'live') {
          // Re-add camera track to all peers
          const localStream = mediaManagerRef.current.getLocalStream();
          if (localStream) {
            allConnections.forEach((pc) => {
              pc.addTrack(cameraTrack, localStream);
            });
          }
        }

        // Update state
        mediaManagerRef.current.emit('screen-state-changed');
        if (socket) {
          socket.emit('media:screen-share', { roomId: meetingId, isSharing: false });
        }
      } else {
        // Start screen sharing
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 } as MediaTrackConstraints,
          audio: false,
        });

        const screenTrack = displayStream.getVideoTracks()[0];
        if (!screenTrack) {
          throw new Error('No screen track available');
        }

        // Add screen track to all peer connections
        const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();
        const localStream = mediaManagerRef.current.getLocalStream();
        
        if (localStream) {
          // Replace video track with screen track
          allConnections.forEach((pc, targetUserId) => {
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(screenTrack);
            } else {
              pc.addTrack(screenTrack, displayStream);
            }
          });
        }

        // Update local stream to show screen
        const audioTracks = localStream?.getAudioTracks() || [];
        const newLocalStream = new MediaStream([...audioTracks, screenTrack]);
        // Note: P2PMediaManager doesn't have setLocalStream method, so we'll handle this differently
        // For now, emit event to update state
        mediaManagerRef.current.emit('screen-state-changed');
        mediaManagerRef.current.emit('stream-changed');

        // Auto-stop when user clicks "Stop sharing"
        screenTrack.onended = () => {
          if (state.screen.isSharing) {
            toggleScreenShare().catch(() => {});
          }
        };

        if (socket) {
          socket.emit('media:screen-share', { roomId: meetingId, isSharing: true });
        }
      }
    } catch (error: any) {
      toast.error(`Failed to toggle screen share: ${error.message}`);
    }
  }, [socket, meetingId]);

  // Handle peer connections (offer, answer, ICE candidate)
  useEffect(() => {
    if (!socket || !isOnline || !peerConnectionManagerRef.current) return;

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
    };

    socket.on('media:ready', handlePeerReady);
    socket.on('meeting:user-left', handleUserLeft);

    // Request existing peers when we join
    socket.emit('meeting:request-peers');

    return () => {
      socket.off('media:ready', handlePeerReady);
      socket.off('meeting:user-left', handleUserLeft);
    };
  }, [socket, userId, isOnline]);

  // Helper to get first peer connection for bandwidth monitoring
  const getFirstPeerConnection = useCallback((): RTCPeerConnection | null => {
    if (!peerConnectionManagerRef.current) return null;
    const allConnections = peerConnectionManagerRef.current.getAllPeerConnections();
    const firstConnection = Array.from(allConnections.values())[0];
    return firstConnection || null;
  }, []);

  return {
    localStream,
    peers,
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

