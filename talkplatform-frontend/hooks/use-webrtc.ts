import { useEffect, useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

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

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const screenStreamRef = useRef<MediaStream | null>(null);
  const lastCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const isReplacingTracksRef = useRef(false);

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

      // 🔥 FIX: Notify other peers AND update existing peer connections
      if (socket && isOnline) {
        socket.emit('webrtc:ready', { userId });

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
  }, [socket, userId, isOnline]);

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
        
        // Notify server
        if (socket) {
          socket.emit('media:toggle-mic', { isMuted: !audioTrack.enabled });
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

    // Notify server
    if (socket) {
      socket.emit('media:toggle-video', { isVideoOff: willBeOff });
    }

    // Force UI update
    setPeers(new Map(peersRef.current));
  }, [socket, isVideoOff]);

  // Toggle screen share: ADD screen track without replacing camera
  const toggleScreenShare = useCallback(async () => {
    // If turning OFF screen share
    if (isScreenSharing) {
      try {
        // Stop screen tracks
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;

        // Restore camera track to peers (replace screen with camera)
        isReplacingTracksRef.current = true;
        
        const restorePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, { connection }]) => {
          try {
            const sender = connection.getSenders().find(s => s.track?.kind === 'video');
            if (sender && lastCameraTrackRef.current && lastCameraTrackRef.current.readyState === 'live') {
              await sender.replaceTrack(lastCameraTrackRef.current);
              console.log(`📹 Restored camera track for ${targetUserId}`);
            } else if (sender) {
              // If no cached camera, get fresh one
              try {
                const freshCamera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                const freshVideoTrack = freshCamera.getVideoTracks()[0];
                if (freshVideoTrack) {
                  await sender.replaceTrack(freshVideoTrack);
                  console.log(`📹 Added fresh camera track for ${targetUserId}`);
                }
              } catch (error) {
                console.warn(`Could not restore camera for ${targetUserId}:`, error);
                // Remove track if we can't restore camera
                await sender.replaceTrack(null);
              }
            }
          } catch (error) {
            console.error(`❌ Failed to restore camera for ${targetUserId}:`, error);
          }
        });

        await Promise.all(restorePromises);
        
        setTimeout(() => {
          isReplacingTracksRef.current = false;
        }, 500);

        setIsScreenSharing(false);
        if (socket) socket.emit('media:screen-share', { isSharing: false });
        
        // Restore camera after stopping screen share
        const audio = localStreamRef.current?.getAudioTracks() || [];
        
        if (lastCameraTrackRef.current && lastCameraTrackRef.current.readyState === 'live') {
          // Restore cached camera
          localStreamRef.current = new MediaStream([...audio, lastCameraTrackRef.current]);
          setLocalStream(localStreamRef.current);
        } else {
          // Get fresh camera track if cached one is not available
          try {
            const freshCamera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const freshVideoTrack = freshCamera.getVideoTracks()[0];
            
            if (freshVideoTrack) {
              localStreamRef.current = new MediaStream([...audio, freshVideoTrack]);
              setLocalStream(localStreamRef.current);
              lastCameraTrackRef.current = freshVideoTrack;
            }
          } catch (error) {
            console.warn('Could not restore camera after screen share:', error);
            // Fallback: just audio
            localStreamRef.current = new MediaStream(audio);
            setLocalStream(localStreamRef.current);
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
      
      // REPLACE video track with screen (better approach for viewing)
      const replacePromises = Array.from(peersRef.current.entries()).map(async ([targetUserId, { connection }]) => {
        try {
          const sender = connection.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
            console.log(`🖥️ Replaced video with screen track for ${targetUserId}`);
          } else {
            // If no video sender exists, add screen track
            connection.addTrack(screenTrack, displayStream);
            console.log(`➕ Added screen track to ${targetUserId}`);
          }
        } catch (error) {
          console.error(`❌ Failed to send screen track to ${targetUserId}:`, error);
        }
      });

      await Promise.all(replacePromises);
      
      setTimeout(() => {
        isReplacingTracksRef.current = false;
      }, 500);

      // Update local stream to show ONLY screen when sharing (not camera)
      const audio = localStreamRef.current?.getAudioTracks() || [];
      
      screenStreamRef.current = new MediaStream([screenTrack]);
      localStreamRef.current = new MediaStream([...audio, screenTrack]); // Only screen + audio
      setLocalStream(localStreamRef.current);
      setIsScreenSharing(true);
      
      if (socket) socket.emit('media:screen-share', { isSharing: true });

      // Auto-stop when user clicks "Stop sharing"
      screenTrack.onended = () => {
        setTimeout(() => {
          if (isScreenSharing) {
            toggleScreenShare().catch(() => {});
          }
        }, 0);
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
      sdpSemantics: 'unified-plan', // Use unified plan for consistent behavior
    });

    // 🔥 CRITICAL FIX: Add tracks in consistent order (audio first, then video)
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      
      // Add audio tracks first
      tracks.filter(track => track.kind === 'audio').forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
        console.log(`🎵 Added audio track to peer connection`);
      });
      
      // Add video tracks second
      tracks.filter(track => track.kind === 'video').forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
        console.log(`📹 Added video track to peer connection`);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming stream
    pc.ontrack = (event) => {
      console.log(`📥 Received ${event.track.kind} track from ${targetUserId}`);
      const [remoteStream] = event.streams;
      
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
  }, [socket]);

  // Handle WebRTC signaling
  useEffect(() => {
    if (!socket || !isOnline) return;

    // Handle offer
    const handleOffer = async (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      console.log(`📨 Received offer from ${data.fromUserId}`);

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

        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', {
          targetUserId: data.fromUserId,
          answer: pc.localDescription,
        });

        console.log(`📤 Sent answer to ${data.fromUserId}`);
      } catch (error) {
        console.error(`❌ Error handling offer from ${data.fromUserId}:`, error);
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

        // Create and send offer with consistent options
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        socket.emit('webrtc:offer', {
          targetUserId: data.userId,
          offer: pc.localDescription,
        });

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
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:peer-ready', handlePeerReady);
    socket.on('meeting:user-left', handleUserLeft);

    // Request existing peers when we join
    console.log('📡 Requesting existing peers...');
    socket.emit('meeting:request-peers');
    
    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:peer-ready', handlePeerReady);
      socket.off('meeting:user-left', handleUserLeft);
    };
  }, [socket, userId, isOnline, createPeerConnection]);

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
    startLocalStream,
    stopLocalStream,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    getFirstPeerConnection,
  };
}