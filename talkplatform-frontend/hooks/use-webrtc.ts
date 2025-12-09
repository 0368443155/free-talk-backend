import { useEffect, useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useFeatureFlag } from './use-feature-flag';

interface UseWebRTCProps {
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

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  peers: Map<string, PeerConnection>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  remoteScreenShares: Map<string, MediaStream>; // 🔥 NEW: Remote screen shares
  localScreenStream: MediaStream | null; // 🔥 NEW: Local screen stream
  startLocalStream: () => Promise<void>;
  stopLocalStream: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  getFirstPeerConnection: () => RTCPeerConnection | null;
}

// ICE servers configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC({ socket, meetingId, userId, isOnline }: UseWebRTCProps): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenShares, setRemoteScreenShares] = useState<Map<string, MediaStream>>(new Map()); // 🔥 NEW: Remote screen shares
  
  // Check if new gateway is enabled
  const useNewGateway = useFeatureFlag('use_new_gateway');

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const screenStreamRef = useRef<MediaStream | null>(null);
  const processingOffers = useRef<Set<string>>(new Set()); // 🔥 NEW: Track offers being processed
  const lastCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const isReplacingTracksRef = useRef(false);
  const remoteScreenSharesRef = useRef<Map<string, MediaStream>>(new Map()); // 🔥 NEW: Ref for remote screen shares

  // Start local media stream
  const startLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      console.log('📹 Local stream already exists');
      return;
    }

    try {
      console.log('📹 Requesting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('✅ Got local stream:', stream.id);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 🔥 FIX: Sync initial hardware state with database
      // When user starts stream, emit current hardware state to ensure database matches reality
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      const hardwareIsMuted = audioTrack ? !audioTrack.enabled : false;
      const hardwareIsVideoOff = videoTrack ? !videoTrack.enabled : false;
      
      // Update local state to match hardware
      setIsMuted(hardwareIsMuted);
      setIsVideoOff(hardwareIsVideoOff);

      // 🔥 FIX: Notify other peers AND update existing peer connections
      if (socket && isOnline) {
        // Support both old and new events based on feature flag
        if (useNewGateway) {
          socket.emit('media:ready', { roomId: meetingId, userId });
          // Sync initial state with database
          socket.emit('media:toggle-mic', { isMuted: hardwareIsMuted });
          socket.emit('media:toggle-video', { isVideoOff: hardwareIsVideoOff });
        } else {
          socket.emit('webrtc:ready', { userId });
          // Sync initial state with database (old events)
          socket.emit('toggle-audio', { enabled: !hardwareIsMuted });
          socket.emit('toggle-video', { enabled: !hardwareIsVideoOff });
        }

        // 🔥 NEW: Add tracks to existing peer connections in consistent order
        peersRef.current.forEach((peer, targetUserId) => {
          console.log(`➕ Adding new tracks to existing peer: ${targetUserId}`);
          
          const tracks = stream.getTracks();
          
          // Process audio tracks first
          tracks.filter(track => track.kind === 'audio').forEach(track => {
            const sender = peer.connection.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) {
              sender.replaceTrack(track);
              console.log(`🔄 Replaced audio track for ${targetUserId}`);
            } else {
              peer.connection.addTrack(track, stream);
              console.log(`➕ Added audio track for ${targetUserId}`);
            }
          });
          
          // Process video tracks second
          tracks.filter(track => track.kind === 'video').forEach(track => {
            const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(track);
              console.log(`🔄 Replaced video track for ${targetUserId}`);
            } else {
              peer.connection.addTrack(track, stream);
              console.log(`➕ Added video track for ${targetUserId}`);
            }
          });
        });
      }
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      throw error;
    }
  }, [socket, userId, isOnline, useNewGateway, meetingId]);

  // Stop local media stream
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      console.log('🛑 Stopping local stream');
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        // Notify server - support both old and new events
        if (socket) {
          if (useNewGateway) {
            socket.emit('media:toggle-mic', { isMuted: !audioTrack.enabled });
          } else {
            socket.emit('toggle-audio', { enabled: audioTrack.enabled });
          }
        }
        
        console.log('🎤 Audio', audioTrack.enabled ? 'unmuted' : 'muted');
      }
    }
  }, [socket]);

  // 🔥 FIX: Toggle video with proper track replacement
  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    const willBeOff = !isVideoOff;

    if (willBeOff) {
      // Turning video OFF
      videoTrack.enabled = false;
      setIsVideoOff(true);
      console.log('📹 Video turned OFF');
    } else {
      // Turning video ON - need to get fresh track
      try {
        console.log('📹 Getting fresh video track...');
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false, // Only get video
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        
        // Replace old video track with new one
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        
        localStreamRef.current.addTrack(newVideoTrack);

        // 🔥 CRITICAL: Replace track in ALL peer connections with async handling
        isReplacingTracksRef.current = true;
        
        const videoReplacePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, peer]) => {
          try {
            const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              console.log(`🔄 Replacing video track for peer: ${targetUserId}`);
              await sender.replaceTrack(newVideoTrack);
              console.log(`✅ Video track replaced for ${targetUserId}`);
            }
          } catch (error) {
            console.error(`❌ Failed to replace video track for ${targetUserId}:`, error);
          }
        });

        // Wait for all video track replacements to complete
        await Promise.all(videoReplacePromises);
        
        // Clear the flag after all replacements are done
        setTimeout(() => {
          isReplacingTracksRef.current = false;
        }, 500);

        // Update state
        setLocalStream(new MediaStream([
          ...localStreamRef.current.getAudioTracks(),
          newVideoTrack
        ]));
        
        setIsVideoOff(false);
        console.log('✅ Video turned ON with fresh track');
      } catch (error) {
        console.error('❌ Failed to get new video track:', error);
        // Fallback: just enable the existing track
        videoTrack.enabled = true;
        setIsVideoOff(false);
      }
    }

    // Notify server - support both old and new events
    if (socket) {
      if (useNewGateway) {
        socket.emit('media:toggle-video', { isVideoOff: willBeOff });
      } else {
        socket.emit('toggle-video', { enabled: !willBeOff });
      }
    }

    // Force UI update
    setPeers(new Map(peersRef.current));
  }, [socket, isVideoOff, useNewGateway]);

  // Toggle screen share: ADD screen track without replacing camera
  const toggleScreenShare = useCallback(async () => {
    // If turning OFF screen share
    if (isScreenSharing) {
      try {
        // Stop screen tracks
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;

        // 🔥 NEW: Remove screen share track from peers (don't replace, just remove)
        isReplacingTracksRef.current = true;
        
        const removeScreenSharePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, { connection }]) => {
          try {
            // Find and remove screen share track sender
            const senders = connection.getSenders();
            const screenShareSender = senders.find(s => {
              const track = s.track;
              return track && track.kind === 'video' && (
                track.label.toLowerCase().includes('screen') ||
                track.label.toLowerCase().includes('display') ||
                track.label.toLowerCase().includes('window') ||
                track.label.toLowerCase().includes('monitor')
              );
            });
            
            if (screenShareSender) {
              // 🔥 FIX: Stop the track first to notify receivers and prevent frozen video
              if (screenShareSender.track) {
                screenShareSender.track.stop();
                console.log(`🛑 Stopped screen share track for ${targetUserId}`);
              }
              await screenShareSender.replaceTrack(null);
              console.log(`🖥️ Removed screen share track for ${targetUserId}`);
            }
            
            // Restore camera track if we have one
            const videoSender = senders.find(s => s.track?.kind === 'video' && s.track !== screenShareSender?.track);
            if (videoSender && lastCameraTrackRef.current && lastCameraTrackRef.current.readyState === 'live') {
              await videoSender.replaceTrack(lastCameraTrackRef.current);
              console.log(`📹 Restored camera track for ${targetUserId}`);
            } else if (!videoSender && lastCameraTrackRef.current && lastCameraTrackRef.current.readyState === 'live') {
              // No video sender exists, add camera track
              connection.addTrack(lastCameraTrackRef.current, new MediaStream([lastCameraTrackRef.current]));
              console.log(`📹 Added camera track for ${targetUserId}`);
            }
          } catch (error) {
            console.error(`❌ Failed to remove screen share for ${targetUserId}:`, error);
          }
        });

        await Promise.all(removeScreenSharePromises);
        
        setTimeout(() => {
          isReplacingTracksRef.current = false;
        }, 500);

        // 🔥 FIX: Restore camera BEFORE clearing screen share state
        const audio = localStreamRef.current?.getAudioTracks() || [];
        let cameraTrack: MediaStreamTrack | null = null;
        
        if (lastCameraTrackRef.current && lastCameraTrackRef.current.readyState === 'live') {
          cameraTrack = lastCameraTrackRef.current;
          console.log('📹 Restoring cached camera track');
        } else {
          // Get fresh camera track if cached one is not available
          try {
            const freshCamera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            cameraTrack = freshCamera.getVideoTracks()[0];
            if (cameraTrack) {
              lastCameraTrackRef.current = cameraTrack;
              console.log('📹 Got fresh camera track');
            }
          } catch (error) {
            console.warn('Could not restore camera after screen share:', error);
          }
        }
        
        // Update local stream with camera (remove any screen tracks)
        if (cameraTrack) {
          localStreamRef.current = new MediaStream([...audio, cameraTrack]);
        } else {
          localStreamRef.current = new MediaStream(audio);
        }
        setLocalStream(localStreamRef.current);
        
        // Clear screen share state
        setIsScreenSharing(false);
        screenStreamRef.current = null;
        
        // Notify server
        if (socket) {
          if (useNewGateway) {
            socket.emit('media:screen-share', { isSharing: false });
          } else {
            socket.emit('screen-share', { enabled: false });
          }
        }
        
        // Force rerender peers state
        setPeers(new Map(peersRef.current));
      } catch (e) {
        console.error('❌ Failed to stop screen share:', e);
      }
      return;
    }

    // Turn ON screen share - ADD track instead of replace
    try {
      // 🔥 NEW: Check if someone else is already sharing (via socket event)
      // This will be handled by backend, but we can show a better error message
      
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      // Cache current camera track (keep it for simultaneous sharing)
      const currentCamera = localStreamRef.current?.getVideoTracks()[0] || null;
      lastCameraTrackRef.current = currentCamera;

      // Set flag to prevent negotiation during track addition
      isReplacingTracksRef.current = true;
      
      // 🔥 NEW: Add screen share track as SEPARATE transceiver (not replacing video)
      // This allows participants to see both camera and screen share
      const addScreenSharePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, { connection }]) => {
        try {
          // Create a new stream for screen share to ensure it's detected separately
          const screenShareStream = new MediaStream([screenTrack]);
          
          // Use addTransceiver to add screen share as a separate track
          // This ensures it's treated as a different media stream
          const transceiver = connection.addTransceiver(screenTrack, {
            direction: 'sendrecv',
            streams: [screenShareStream],
          });
          
          console.log(`🖥️ Added screen share track (separate transceiver) for ${targetUserId}`, {
            trackLabel: screenTrack.label,
            streamId: screenShareStream.id,
            transceiverDirection: transceiver.direction,
          });
        } catch (error) {
          console.error(`❌ Failed to add screen share track to ${targetUserId}:`, error);
          // Fallback: try addTrack if addTransceiver fails
          try {
            const screenShareStream = new MediaStream([screenTrack]);
            connection.addTrack(screenTrack, screenShareStream);
            console.log(`🖥️ Added screen share track (fallback addTrack) for ${targetUserId}`);
          } catch (fallbackError) {
            console.error(`❌ Fallback addTrack also failed for ${targetUserId}:`, fallbackError);
          }
        }
      });

      await Promise.all(addScreenSharePromises);
      
      // 🔥 NEW: Trigger renegotiation for all peers to ensure screen share track is sent
      const renegotiatePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, { connection }]) => {
        try {
          // Create offer to trigger renegotiation
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          
          if (socket) {
            if (useNewGateway) {
              socket.emit('media:offer', {
                roomId: meetingId,
                targetUserId,
                offer: connection.localDescription,
              });
            } else {
              socket.emit('webrtc:offer', {
                targetUserId,
                offer: connection.localDescription,
              });
            }
          }
          console.log(`🔄 Triggered renegotiation for ${targetUserId} to send screen share`);
        } catch (error) {
          console.error(`❌ Failed to trigger renegotiation for ${targetUserId}:`, error);
        }
      });
      
      await Promise.all(renegotiatePromises);
      
      setTimeout(() => {
        isReplacingTracksRef.current = false;
      }, 500);

      // 🔥 FIX: Keep camera in localStream, screen share is separate
      // Don't replace camera track in localStream - keep it for the video feed
      // Screen share will be shown separately via screenStreamRef
      const audio = localStreamRef.current?.getAudioTracks() || [];
      
      // Get camera track (filter out any screen tracks that might be there)
      const allVideoTracks = localStreamRef.current?.getVideoTracks() || [];
      const cameraTrack = allVideoTracks.find(t => {
        const label = t.label.toLowerCase();
        return !label.includes('screen') &&
               !label.includes('display') &&
               !label.includes('window') &&
               !label.includes('monitor') &&
               !label.includes('desktop');
      }) || lastCameraTrackRef.current;
      
      // Store screen share stream separately
      screenStreamRef.current = new MediaStream([screenTrack]);
      
      // Keep localStream with camera + audio ONLY (don't add screen track here)
      // This ensures LocalVideo component only shows camera, not screen share
      if (cameraTrack && cameraTrack.readyState === 'live') {
        localStreamRef.current = new MediaStream([...audio, cameraTrack]);
        console.log('📹 LocalStream updated with camera track only (screen share is separate)');
      } else {
        localStreamRef.current = new MediaStream(audio);
        console.log('⚠️ No camera track available, localStream has audio only');
      }
      setLocalStream(localStreamRef.current);
      setIsScreenSharing(true);
      
      if (socket) {
        if (useNewGateway) {
          socket.emit('media:screen-share', { isSharing: true });
        } else {
          socket.emit('screen-share', { enabled: true });
        }
      }

      // Auto-stop when user clicks "Stop sharing" in browser notification
      screenTrack.onended = () => {
        console.log('🖥️ Screen share ended by user (browser notification)');
        // Immediately stop screen share and restore camera
        setTimeout(async () => {
          if (isScreenSharing) {
            try {
              // Stop screen tracks
              screenStreamRef.current?.getTracks().forEach(t => t.stop());
              screenStreamRef.current = null;

              // 🔥 NEW: Remove screen share track from peers
              isReplacingTracksRef.current = true;
              
              const removeScreenSharePromises3 = Array.from(peersRef.current.entries()).map(async ([targetUserId, { connection }]) => {
                try {
                  const senders = connection.getSenders();
                  const screenShareSender = senders.find(s => {
                    const track = s.track;
                    return track && track.kind === 'video' && (
                      track.label.toLowerCase().includes('screen') ||
                      track.label.toLowerCase().includes('display') ||
                      track.label.toLowerCase().includes('window') ||
                      track.label.toLowerCase().includes('monitor')
                    );
                  });
                  
                  if (screenShareSender) {
                    // 🔥 FIX: Stop the track first to notify receivers and prevent frozen video
                    if (screenShareSender.track) {
                      screenShareSender.track.stop();
                      console.log(`🛑 Stopped screen share track for ${targetUserId} (from notification)`);
                    }
                    await screenShareSender.replaceTrack(null);
                    console.log(`🖥️ Removed screen share track for ${targetUserId}`);
                  }
                  
                  // Restore camera track if we have one
                  const videoSender = senders.find(s => s.track?.kind === 'video' && s.track !== screenShareSender?.track);
                  if (videoSender && lastCameraTrackRef.current && lastCameraTrackRef.current.readyState === 'live') {
                    await videoSender.replaceTrack(lastCameraTrackRef.current);
                    console.log(`📹 Restored camera track for ${targetUserId}`);
                  } else if (!videoSender && lastCameraTrackRef.current && lastCameraTrackRef.current.readyState === 'live') {
                    connection.addTrack(lastCameraTrackRef.current, new MediaStream([lastCameraTrackRef.current]));
                    console.log(`📹 Added camera track for ${targetUserId}`);
                  }
                } catch (error) {
                  console.error(`❌ Failed to remove screen share for ${targetUserId}:`, error);
                }
              });

              await Promise.all(removeScreenSharePromises3);
              
              setTimeout(() => {
                isReplacingTracksRef.current = false;
              }, 500);

              // 🔥 FIX: Restore camera BEFORE clearing screen share state
              const audio = localStreamRef.current?.getAudioTracks() || [];
              let cameraTrack: MediaStreamTrack | null = null;
              
              if (lastCameraTrackRef.current && lastCameraTrackRef.current.readyState === 'live') {
                cameraTrack = lastCameraTrackRef.current;
                console.log('📹 Restoring cached camera track (from notification)');
              } else {
                try {
                  const freshCamera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                  cameraTrack = freshCamera.getVideoTracks()[0];
                  if (cameraTrack) {
                    lastCameraTrackRef.current = cameraTrack;
                    console.log('📹 Got fresh camera track (from notification)');
                  }
                } catch (error) {
                  console.warn('Could not restore camera after screen share (from notification):', error);
                }
              }
              
              // Update local stream with camera (remove any screen tracks)
              if (cameraTrack) {
                localStreamRef.current = new MediaStream([...audio, cameraTrack]);
              } else {
                localStreamRef.current = new MediaStream(audio);
              }
              setLocalStream(localStreamRef.current);
              
              // Clear screen share state
              setIsScreenSharing(false);
              screenStreamRef.current = null;
              
              // Notify server
              if (socket) {
                if (useNewGateway) {
                  socket.emit('media:screen-share', { isSharing: false });
                } else {
                  socket.emit('screen-share', { enabled: false });
                }
              }
              
              setPeers(new Map(peersRef.current));
            } catch (e) {
              console.error('❌ Failed to stop screen share:', e);
            }
          }
        }, 100);
      };

      // Force rerender peers
      setPeers(new Map(peersRef.current));
    } catch (e) {
      console.error('❌ Failed to start screen share:', e);
    }
  }, [isScreenSharing, socket]);

  // Create peer connection
  const createPeerConnection = useCallback((targetUserId: string): RTCPeerConnection => {
    console.log(`🔗 Creating peer connection for ${targetUserId}`);

    const pc = new RTCPeerConnection({
      ...ICE_SERVERS,
      // unified-plan is now the default, no need to specify
    });

    // 🔥 CRITICAL FIX: Add tracks in consistent order (audio first, then video)
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      
      // Add audio tracks first
      tracks.filter(track => track.kind === 'audio').forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
        console.log(`🎵 Added audio track to peer connection`);
      });
      
      // Add video tracks second (camera only, filter out screen tracks)
      tracks.filter(track => {
        if (track.kind !== 'video') return false;
        const label = track.label.toLowerCase();
        return !label.includes('screen') &&
               !label.includes('display') &&
               !label.includes('window') &&
               !label.includes('monitor') &&
               !label.includes('desktop');
      }).forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
        console.log(`📹 Added camera track to peer connection`);
      });
    }

    // 🔥 NEW: If currently screen sharing, add screen share track to new peer connection
    // This ensures new participants receive the screen share immediately
    // Use ref to get latest value since createPeerConnection might be called before state updates
    const currentScreenStream = screenStreamRef.current;
    const currentIsScreenSharing = isScreenSharing;
    
    if (currentIsScreenSharing && currentScreenStream) {
      const screenTrack = currentScreenStream.getVideoTracks()[0];
      if (screenTrack && screenTrack.readyState === 'live') {
        try {
          const screenShareStream = new MediaStream([screenTrack]);
          // Use addTransceiver to ensure it's a separate track
          const transceiver = pc.addTransceiver(screenTrack, {
            direction: 'sendrecv',
            streams: [screenShareStream],
          });
          console.log(`🖥️ Added existing screen share track to new peer connection for ${targetUserId}`, {
            trackLabel: screenTrack.label,
            streamId: screenShareStream.id,
            transceiverDirection: transceiver.direction,
            transceiverMid: transceiver.mid,
          });
        } catch (error) {
          console.error(`❌ Failed to add screen share track to new peer ${targetUserId}:`, error);
          // Fallback: try addTrack
          try {
            const screenShareStream = new MediaStream([screenTrack]);
            pc.addTrack(screenTrack, screenShareStream);
            console.log(`🖥️ Added screen share track (fallback addTrack) to new peer ${targetUserId}`);
          } catch (fallbackError) {
            console.error(`❌ Fallback also failed:`, fallbackError);
          }
        }
      } else {
        console.warn(`⚠️ Screen share track not available or not live for new peer ${targetUserId}`, {
          hasScreenStream: !!currentScreenStream,
          hasScreenTrack: !!screenTrack,
          trackState: screenTrack?.readyState,
          isScreenSharing: currentIsScreenSharing,
        });
      }
    } else {
      console.log(`ℹ️ Not adding screen share to new peer ${targetUserId}`, {
        isScreenSharing: currentIsScreenSharing,
        hasScreenStream: !!currentScreenStream,
      });
    }

    // Handle ICE candidates - support both old and new events
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        if (useNewGateway) {
          socket.emit('media:ice-candidate', {
            roomId: meetingId,
            targetUserId,
            candidate: event.candidate,
          });
        } else {
          socket.emit('webrtc:ice-candidate', {
            targetUserId,
            candidate: event.candidate,
          });
        }
      }
    };

    // Handle incoming stream
    pc.ontrack = (event) => {
      console.log(`📥 Received ${event.track.kind} track from ${targetUserId}`, {
        trackId: event.track.id,
        trackKind: event.track.kind,
        trackLabel: event.track.label,
        streamId: event.streams[0]?.id,
        streams: event.streams.length,
      });
      
      const [remoteStream] = event.streams;
      
      // 🔥 NEW: Check if this is a screen share track
      // Method 1: Check track label (most reliable)
      const labelLower = event.track.label.toLowerCase();
      const isScreenShareByLabel = labelLower.includes('screen') || 
                                   labelLower.includes('display') ||
                                   labelLower.includes('window') ||
                                   labelLower.includes('monitor') ||
                                   labelLower.includes('desktop');
      
      // Method 2: If we already have a video track from this peer, this might be screen share
      const existingPeer = peersRef.current.get(targetUserId);
      const hasExistingVideo = existingPeer?.stream?.getVideoTracks().length ? existingPeer.stream.getVideoTracks().length > 0 : false;
      
      // Method 3: Check if stream has only video track (screen share usually has no audio)
      const hasOnlyVideo = remoteStream.getVideoTracks().length > 0 && remoteStream.getAudioTracks().length === 0;
      
      const isScreenShare = isScreenShareByLabel || (hasExistingVideo && hasOnlyVideo && event.track.kind === 'video');
      
      if (isScreenShare && event.track.kind === 'video') {
        console.log(`🖥️ Detected screen share track from ${targetUserId}`, {
          byLabel: isScreenShareByLabel,
          hasExistingVideo,
          hasOnlyVideo,
        });
        // Store screen share stream separately
        remoteScreenSharesRef.current.set(targetUserId, remoteStream);
        setRemoteScreenShares(new Map(remoteScreenSharesRef.current));
        
        // 🔥 NEW: Listen for track ended/removed to clear screen share
        const handleTrackEnded = () => {
          console.log(`🖥️ Screen share track ended from ${targetUserId}`);
          // Stop all tracks in the stream
          const streamToStop = remoteScreenSharesRef.current.get(targetUserId);
          if (streamToStop) {
            streamToStop.getTracks().forEach(track => track.stop());
          }
          // Clear from map
          remoteScreenSharesRef.current.delete(targetUserId);
          setRemoteScreenShares(new Map(remoteScreenSharesRef.current));
        };
        
        event.track.onended = handleTrackEnded;
        
        // Also listen for track removed from stream
        remoteStream.addEventListener('removetrack', (e) => {
          if (e.track && e.track.kind === 'video') {
            console.log(`🖥️ Screen share track removed from stream for ${targetUserId}`);
            handleTrackEnded();
          }
        });
      } else if (event.track.kind === 'video' && !isScreenShare) {
        // Regular video track - update peer stream (camera)
        setPeers(prev => {
          const newPeers = new Map(prev);
          const existingPeer = newPeers.get(targetUserId);
          if (existingPeer) {
            existingPeer.stream = remoteStream;
            newPeers.set(targetUserId, existingPeer);
          }
          return newPeers;
        });

        peersRef.current.forEach((peer, id) => {
          if (id === targetUserId && peer.connection === pc) {
            peer.stream = remoteStream;
          }
        });
      } else if (event.track.kind === 'audio') {
        // Audio track - merge with existing stream if needed
        const existingPeer = peersRef.current.get(targetUserId);
        if (existingPeer && existingPeer.stream) {
          // Audio track might come in a separate stream, merge it
          const audioTracks = remoteStream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTracks.forEach(track => {
              if (!existingPeer.stream!.getAudioTracks().find(t => t.id === track.id)) {
                existingPeer.stream!.addTrack(track);
              }
            });
            setPeers(new Map(peersRef.current));
          }
        } else {
          // First track from this peer
          setPeers(prev => {
            const newPeers = new Map(prev);
            const existingPeer = newPeers.get(targetUserId);
            if (existingPeer) {
              existingPeer.stream = remoteStream;
              newPeers.set(targetUserId, existingPeer);
            }
            return newPeers;
          });
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state for ${targetUserId}:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.log(`❌ Connection failed for ${targetUserId}, attempting to restart`);
        // Attempt ICE restart
        if (pc.restartIce) {
          pc.restartIce();
        }
      }
    };

    // 🔥 FIXED: Handle negotiation needed with consistent m-line order
    pc.onnegotiationneeded = async () => {
      try {
        console.log(`🔄 Negotiation needed for ${targetUserId}`);
        
        // Prevent negotiation during track replacement
        if (isReplacingTracksRef.current) {
          console.log(`⏸️ Skipping negotiation - replacing tracks`);
          return;
        }
        
        // Prevent negotiation during signaling state changes
        if (pc.signalingState !== 'stable') {
          console.log(`⏸️ Skipping negotiation - state: ${pc.signalingState}`);
          return;
        }
        
        // Wait a bit to let any pending state changes complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check state after delay
        if (pc.signalingState !== 'stable' || isReplacingTracksRef.current) {
          console.log(`⏸️ State still not stable or replacing tracks after delay`);
          return;
        }
        
        // Create offer with consistent options to maintain m-line order
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          iceRestart: false, // Prevent ICE restart unless necessary
        });
        
        await pc.setLocalDescription(offer);
        
        if (socket) {
          socket.emit('webrtc:offer', {
            targetUserId,
            offer: pc.localDescription,
          });
        }
        
        console.log(`📤 Offer sent to ${targetUserId}`);
      } catch (error) {
        console.error(`❌ Negotiation failed for ${targetUserId}:`, error);
        
        // If failed, try to restart ICE connection
        if (pc.connectionState === 'failed') {
          console.log(`🔄 Attempting ICE restart for ${targetUserId}`);
          try {
            if (pc.restartIce) {
              pc.restartIce();
            }
          } catch (restartError) {
            console.error(`❌ ICE restart failed:`, restartError);
          }
        }
      }
    };

    return pc;
  }, [socket, useNewGateway, meetingId, isScreenSharing]); // 🔥 FIX: Add isScreenSharing to dependencies

  // Handle WebRTC signaling
  useEffect(() => {
    if (!socket || !isOnline) return;

    // Handle offer
    const handleOffer = async (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      console.log(`📨 Received offer from ${data.fromUserId}`);

      // 🔥 FIX: Prevent processing the same offer multiple times
      if (processingOffers.current.has(data.fromUserId)) {
        console.warn(`⚠️ Already processing offer from ${data.fromUserId}, skipping...`);
        return;
      }

      processingOffers.current.add(data.fromUserId);

      try {
        let pc = peersRef.current.get(data.fromUserId)?.connection;
        
        if (!pc) {
          pc = createPeerConnection(data.fromUserId);
          const peerConnection: PeerConnection = {
            userId: data.fromUserId,
            connection: pc,
          };
          peersRef.current.set(data.fromUserId, peerConnection);
          setPeers(new Map(peersRef.current));
        }

        // 🔥 FIX: Check current state before setting remote description
        const currentState = pc.signalingState;
        console.log(`🔍 Current signaling state for ${data.fromUserId}:`, currentState);
        
        // If already stable or have-local-offer, we might need to handle this differently
        if (currentState === 'stable') {
          // Normal case - can proceed
        } else if (currentState === 'have-local-offer') {
          // We already sent an offer, this is a race condition
          console.warn(`⚠️ Race condition: already have local offer from ${data.fromUserId}, closing and recreating connection`);
          pc.close();
          pc = createPeerConnection(data.fromUserId);
          const peerConnection: PeerConnection = {
            userId: data.fromUserId,
            connection: pc,
          };
          peersRef.current.set(data.fromUserId, peerConnection);
          setPeers(new Map(peersRef.current));
        } else if (currentState === 'have-remote-offer' || currentState === 'have-local-pranswer') {
          // Already processing an offer, skip this one
          console.warn(`⚠️ Already processing offer from ${data.fromUserId} in state ${currentState}, skipping...`);
          processingOffers.current.delete(data.fromUserId);
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Process pending ICE candidates
        const pending = pendingCandidates.current.get(data.fromUserId) || [];
        for (const candidate of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log(`✅ Added pending ICE candidate from ${data.fromUserId}`);
          } catch (error) {
            console.error(`❌ Error adding pending ICE candidate:`, error);
          }
        }
        pendingCandidates.current.delete(data.fromUserId);

        // 🔥 FIX: Check connection state before creating answer
        const connectionState = pc.signalingState;
        console.log(`🔍 PeerConnection signaling state for ${data.fromUserId} after setRemoteDescription:`, connectionState);
        
        // Only create answer if in correct state
        if (connectionState !== 'have-remote-offer' && connectionState !== 'have-local-pranswer') {
          console.warn(`⚠️ Cannot create answer in state: ${connectionState}. Skipping...`);
          processingOffers.current.delete(data.fromUserId);
          return;
        }

        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(answer);

        // Support both old and new events
        if (useNewGateway) {
          socket.emit('media:answer', {
            roomId: meetingId,
            targetUserId: data.fromUserId,
            answer: pc.localDescription,
          });
        } else {
          socket.emit('webrtc:answer', {
            targetUserId: data.fromUserId,
            answer: pc.localDescription,
          });
        }

        console.log(`📤 Sent answer to ${data.fromUserId}`);
      } catch (error) {
        console.error(`❌ Error handling offer from ${data.fromUserId}:`, error);
      } finally {
        // Always remove from processing set
        processingOffers.current.delete(data.fromUserId);
      }
    };

    // Handle answer
    const handleAnswer = async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      console.log(`📨 Received answer from ${data.fromUserId}`);

      try {
        const peer = peersRef.current.get(data.fromUserId);
        if (peer) {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log(`✅ Set remote description for ${data.fromUserId}`);

          // Process pending ICE candidates
          const pending = pendingCandidates.current.get(data.fromUserId) || [];
          for (const candidate of pending) {
            try {
              await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
              console.log(`✅ Added pending ICE candidate from ${data.fromUserId}`);
            } catch (error) {
              console.error(`❌ Error adding pending ICE candidate:`, error);
            }
          }
          pendingCandidates.current.delete(data.fromUserId);
        }
      } catch (error) {
        console.error(`❌ Error handling answer from ${data.fromUserId}:`, error);
      }
    };

    // Handle ICE candidate
    const handleIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      try {
        const peer = peersRef.current.get(data.fromUserId);
        if (peer && peer.connection.remoteDescription && data.candidate) {
          await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          if (!pendingCandidates.current.has(data.fromUserId)){
            pendingCandidates.current.set(data.fromUserId, []);
          }
          pendingCandidates.current.get(data.fromUserId)!.push(data.candidate);
        }
      } catch (error) {
        console.error(`❌ Error adding ICE candidate from ${data.fromUserId}:`, error);
      }
    };

    // Handle new peer ready
    const handlePeerReady = async (data: { userId: string }) => {
      if (data.userId === userId) return; // Ignore self

      console.log(`👤 Peer ready: ${data.userId}`);

      try {
        const pc = createPeerConnection(data.userId);
        const peerConnection: PeerConnection = {
          userId: data.userId,
          connection: pc,
        };
        peersRef.current.set(data.userId, peerConnection);
        setPeers(new Map(peersRef.current));

        // 🔥 NEW: Wait a bit to ensure screen share track is added before creating offer
        // This ensures the offer includes the screen share track
        if (isScreenSharing && screenStreamRef.current) {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Verify screen share track was added
          const senders = pc.getSenders();
          const hasScreenShareSender = senders.some(s => {
            const track = s.track;
            return track && track.kind === 'video' && (
              track.label.toLowerCase().includes('screen') ||
              track.label.toLowerCase().includes('display') ||
              track.label.toLowerCase().includes('window') ||
              track.label.toLowerCase().includes('monitor') ||
              track.label.toLowerCase().includes('desktop')
            );
          });
          console.log(`🔍 Screen share track verification for new peer ${data.userId}:`, {
            hasScreenShareSender,
            totalSenders: senders.length,
            senderTracks: senders.map(s => ({ kind: s.track?.kind, label: s.track?.label })),
          });
          
          // If screen share track wasn't added, try to add it again
          if (!hasScreenShareSender) {
            console.warn(`⚠️ Screen share track not found in senders, attempting to add again...`);
            const screenTrack = screenStreamRef.current.getVideoTracks()[0];
            if (screenTrack && screenTrack.readyState === 'live') {
              try {
                const screenShareStream = new MediaStream([screenTrack]);
                pc.addTransceiver(screenTrack, {
                  direction: 'sendrecv',
                  streams: [screenShareStream],
                });
                console.log(`🖥️ Re-added screen share track for ${data.userId}`);
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (error) {
                console.error(`❌ Failed to re-add screen share track:`, error);
              }
            }
          }
        }

        // Create and send offer with consistent options
        // The offer will include all tracks (camera, audio, and screen share if sharing)
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        
        // Check if offer SDP contains screen share track
        const sdpLines = offer.sdp?.split('\n') || [];
        const videoMLines = sdpLines.filter(line => line.startsWith('m=video'));
        console.log(`📤 Created offer for new peer ${data.userId}`, {
          hasScreenShare: isScreenSharing && !!screenStreamRef.current,
          videoMLinesCount: videoMLines.length,
          expectedVideoMLines: isScreenSharing && screenStreamRef.current ? 2 : 1, // 1 for camera, 1 for screen share
          offerSdpPreview: offer.sdp?.substring(0, 300), // Log first 300 chars of SDP
        });

        // Support both old and new events
        if (useNewGateway) {
          socket.emit('media:offer', {
            roomId: meetingId,
            targetUserId: data.userId,
            offer: pc.localDescription,
          });
        } else {
          socket.emit('webrtc:offer', {
            targetUserId: data.userId,
            offer: pc.localDescription,
          });
        }

        console.log(`📤 Sent offer to ${data.userId}`);
      } catch (error) {
        console.error(`❌ Error creating offer for ${data.userId}:`, error);
      }
    };

    const handleUserLeft = (data: { userId: string }) => {
      console.log(`👋 User left: ${data.userId}`);
      
      const peer = peersRef.current.get(data.userId);
      if (peer) {
        peer.connection.close();
        peersRef.current.delete(data.userId);
        pendingCandidates.current.delete(data.userId);
        setPeers(new Map(peersRef.current));
      }
      
      // 🔥 NEW: Remove screen share when user leaves
      remoteScreenSharesRef.current.delete(data.userId);
      setRemoteScreenShares(new Map(remoteScreenSharesRef.current));
    };

    // 🔥 NEW: Listen for screen share events to clear remote screen shares
    const handleRemoteScreenShare = (data: { userId: string; isSharing: boolean }) => {
      if (!data.isSharing) {
        // User stopped sharing - clear their screen share immediately
        console.log(`🖥️ User ${data.userId} stopped screen sharing, clearing remote screen share`);
        
        // Stop tracks in the stream to prevent frozen video (before clearing)
        const screenShareStreamToStop = remoteScreenSharesRef.current.get(data.userId);
        if (screenShareStreamToStop) {
          screenShareStreamToStop.getTracks().forEach(track => {
            track.stop();
            console.log(`🛑 Stopped screen share track from ${data.userId}`);
          });
        }
        
        // Clear from ref and state immediately
        remoteScreenSharesRef.current.delete(data.userId);
        setRemoteScreenShares(new Map(remoteScreenSharesRef.current));
      }
    };

    // Support both old and new events based on feature flag
    if (useNewGateway) {
      // New events
      socket.on('media:offer', (data: { fromUserId: string; roomId: string; offer: RTCSessionDescriptionInit }) => {
        handleOffer({ fromUserId: data.fromUserId, offer: data.offer });
      });
      socket.on('media:user-screen-share', handleRemoteScreenShare);
      socket.on('media:answer', (data: { fromUserId: string; roomId: string; answer: RTCSessionDescriptionInit }) => {
        handleAnswer({ fromUserId: data.fromUserId, answer: data.answer });
      });
      socket.on('media:ice-candidate', (data: { fromUserId: string; roomId: string; candidate: RTCIceCandidateInit }) => {
        handleIceCandidate({ fromUserId: data.fromUserId, candidate: data.candidate });
      });
      socket.on('media:ready', (data: { userId: string; roomId: string }) => {
        handlePeerReady({ userId: data.userId });
      });
    } else {
      // Old events
      socket.on('webrtc:offer', handleOffer);
      socket.on('webrtc:answer', handleAnswer);
      socket.on('webrtc:ice-candidate', handleIceCandidate);
      socket.on('webrtc:peer-ready', handlePeerReady);
    }
    
    socket.on('meeting:user-left', handleUserLeft);

    // Request existing peers when we join
    console.log('📡 Requesting existing peers...');
    socket.emit('meeting:request-peers');
    
    return () => {
      // Cleanup based on feature flag
      if (useNewGateway) {
        socket.off('media:offer');
        socket.off('media:answer');
        socket.off('media:ice-candidate');
        socket.off('media:ready');
        socket.off('media:user-screen-share', handleRemoteScreenShare);
      } else {
        socket.off('webrtc:offer', handleOffer);
        socket.off('webrtc:answer', handleAnswer);
        socket.off('webrtc:ice-candidate', handleIceCandidate);
        socket.off('webrtc:peer-ready', handlePeerReady);
      }
      socket.off('meeting:user-left', handleUserLeft);
    };
  }, [socket, userId, isOnline, createPeerConnection, useNewGateway, meetingId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up WebRTC...');
      stopLocalStream();
      peersRef.current.forEach((peer) => {
        peer.connection.close();
      });
      peersRef.current.clear();
      setPeers(new Map());
    };
  }, [stopLocalStream]);

  // Helper to get first peer connection for bandwidth monitoring
  const getFirstPeerConnection = (): RTCPeerConnection | null => {
    const firstPeer = Array.from(peersRef.current.values())[0];
    return firstPeer?.connection || null;
  };

  return {
    localStream,
    peers,
    isMuted,
    isVideoOff,
    isScreenSharing,
    remoteScreenShares, // 🔥 NEW: Return remote screen shares
    localScreenStream: screenStreamRef.current, // 🔥 NEW: Return local screen stream
    startLocalStream,
    stopLocalStream,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    getFirstPeerConnection,
  };
}