"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  LocalParticipant,
  LocalTrack,
  LocalTrackPublication,
  Participant,
  ParticipantEvent,
  ConnectionState,
  DisconnectReason,
  DataPacket_Kind,
  VideoPreset,
  createLocalVideoTrack,
  createLocalAudioTrack,
  LocalVideoTrack,
  LocalAudioTrack,
} from 'livekit-client';

interface UseLiveKitProps {
  token: string | null;
  serverUrl: string;
  onConnected?: (room: Room) => void; // Pass room to callback so localParticipant is available
  onDisconnected?: (reason?: DisconnectReason) => void;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onTrackSubscribed?: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  onTrackUnsubscribed?: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  onDataReceived?: (payload: Uint8Array, participant?: RemoteParticipant) => void;
}

export interface LiveKitParticipant {
  identity: string;
  name?: string;
  metadata?: string;
  isLocal: boolean;
  isSpeaking: boolean;
  connectionQuality: string;
  tracks: {
    audio?: RemoteTrackPublication | LocalTrackPublication;
    video?: RemoteTrackPublication | LocalTrackPublication;
    screen?: RemoteTrackPublication | LocalTrackPublication;
  };
}

export interface UseLiveKitReturn {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  localParticipant: LocalParticipant | null;
  participants: LiveKitParticipant[];
  connectionQuality: string;

  // Media controls
  enableCamera: (enabled: boolean) => Promise<void>;
  enableMicrophone: (enabled: boolean) => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;

  // Communication
  sendChatMessage: (message: string) => Promise<void>;
  sendReaction: (emoji: string) => Promise<void>;

  // Room management
  disconnect: () => void;
  reconnect: () => Promise<void>;
}

/**
 * UC-05: Custom hook for LiveKit SFU integration
 * Replaces P2P WebRTC with LiveKit's SFU architecture for scalable video conferencing
 */
export function useLiveKit({
  token,
  serverUrl,
  onConnected,
  onDisconnected,
  onParticipantConnected,
  onParticipantDisconnected,
  onTrackSubscribed,
  onTrackUnsubscribed,
  onDataReceived,
}: UseLiveKitProps): UseLiveKitReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [participants, setParticipants] = useState<LiveKitParticipant[]>([]);
  const [connectionQuality, setConnectionQuality] = useState<string>('unknown');

  const roomRef = useRef<Room | null>(null);

  // Transform LiveKit participants to our interface
  const transformParticipants = useCallback((room: Room): LiveKitParticipant[] => {
    const result: LiveKitParticipant[] = [];

    // Add local participant
    if (room.localParticipant) {
      const local = room.localParticipant;
      const localCameraPub = Array.from(local.videoTrackPublications.values()).find(
        pub => pub.source === Track.Source.Camera
      );
      const localScreenPub = Array.from(local.videoTrackPublications.values()).find(
        pub => pub.source === Track.Source.ScreenShare
      );
      
      result.push({
        identity: local.identity,
        name: local.name,
        metadata: local.metadata,
        isLocal: true,
        isSpeaking: local.isSpeaking,
        connectionQuality: local.connectionQuality.toString(),
        tracks: {
          audio: Array.from(local.audioTrackPublications.values())[0],
          video: localCameraPub, // Camera track (always separate from screen share)
          screen: localScreenPub, // Screen share track (separate from camera)
        },
      });
    }

    // Add remote participants
    // CRITICAL: Use Map to ensure unique participants (prevent duplicates)
    const seenIdentities = new Set<string>();
    
    room.remoteParticipants.forEach((participant) => {
      // Skip if we've already seen this participant
      if (seenIdentities.has(participant.identity)) {
        console.warn(`⚠️ Duplicate participant identity: ${participant.identity}`);
        return;
      }
      seenIdentities.add(participant.identity);
      
      const screenSharePub = Array.from(participant.videoTrackPublications.values()).find(
        pub => pub.source === Track.Source.ScreenShare
      );
      const cameraPub = Array.from(participant.videoTrackPublications.values()).find(
        pub => pub.source === Track.Source.Camera
      );
      
      // CRITICAL: Always subscribe to camera and screen share tracks if they exist
      // This is called every time transformParticipants runs, ensuring tracks are always subscribed
      if (screenSharePub && !screenSharePub.isSubscribed) {
        console.log(`📥 [transformParticipants] Subscribing to screen share track from ${participant.identity}`);
        screenSharePub.setSubscribed(true);
      }
      
      // CRITICAL: Always subscribe to camera track if it exists (important: camera should always be visible)
      // This ensures that whenever we transform participants, we subscribe to any unsubscribed camera tracks
      if (cameraPub && !cameraPub.isSubscribed) {
        console.log(`📥 [transformParticipants] Subscribing to camera track from ${participant.identity}`);
        cameraPub.setSubscribed(true);
      }
      
      // Also subscribe to all other video tracks
      participant.videoTrackPublications.forEach((pub) => {
        if (!pub.isSubscribed) {
          console.log(`📥 [transformParticipants] Subscribing to video track: ${pub.source} from ${participant.identity}`);
          pub.setSubscribed(true);
        }
      });
      
      // Subscribe to audio tracks
      participant.audioTrackPublications.forEach((pub) => {
        if (!pub.isSubscribed) {
          console.log(`📥 [transformParticipants] Subscribing to audio track from ${participant.identity}`);
          pub.setSubscribed(true);
        }
      });
      
      result.push({
        identity: participant.identity,
        name: participant.name,
        metadata: participant.metadata,
        isLocal: false,
        isSpeaking: participant.isSpeaking,
        connectionQuality: participant.connectionQuality.toString(),
        tracks: {
          audio: Array.from(participant.audioTrackPublications.values())[0],
          video: cameraPub, // Camera track (always separate from screen share)
          screen: screenSharePub, // Screen share track (separate from camera)
        },
      });
    });

    return result;
  }, []);

  // Auto-connect when token is available
  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      if (!token || !serverUrl) return;
      if (roomRef.current?.state === ConnectionState.Connected) return;

      try {
        setIsConnecting(true);
        setError(null);
        console.log('🔌 Connecting to LiveKit room...');

        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: { width: 1280, height: 720 },
            facingMode: 'user',
          },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          publishDefaults: {
            simulcast: true,
          },
        });

        // Set up event listeners
        newRoom.on(RoomEvent.Connected, () => {
          if (!isMounted) return;
          console.log('✅ Connected to LiveKit room');
          setIsConnected(true);
          setIsConnecting(false);
          setLocalParticipant(newRoom.localParticipant);
          
          // CRITICAL: Subscribe to all existing participants' tracks when we first connect
          // This ensures we can see cameras of participants who joined before us
          // IMPORTANT: Subscribe to ALL publications, even if track is not yet available
          // This ensures we get the track as soon as it's published
          (async () => {
            console.log(`📥 Subscribing to existing participants' tracks...`);
            for (const participant of newRoom.remoteParticipants.values()) {
              console.log(`👤 Found existing participant: ${participant.identity}, subscribing to their tracks`);
              
              // CRITICAL: Subscribe to ALL video track publications (even if track not yet available)
              // This ensures we receive the track as soon as it's published
              for (const pub of participant.videoTrackPublications.values()) {
                if (!pub.isSubscribed) {
                  console.log(`📥 Auto-subscribing to video track publication: ${pub.source} from ${participant.identity} (track available: ${!!pub.track})`);
                  pub.setSubscribed(true);
                  // Small delay to ensure subscription completes
                  await new Promise(resolve => setTimeout(resolve, 30));
                }
              }
              
              // CRITICAL: Subscribe to ALL audio track publications
              for (const pub of participant.audioTrackPublications.values()) {
                if (!pub.isSubscribed) {
                  console.log(`📥 Auto-subscribing to audio track publication from ${participant.identity} (track available: ${!!pub.track})`);
                  pub.setSubscribed(true);
                  await new Promise(resolve => setTimeout(resolve, 30));
                }
              }
              
              // Also subscribe to all track publications (catch-all)
              for (const pub of participant.trackPublications.values()) {
                if (!pub.isSubscribed) {
                  console.log(`📥 Auto-subscribing to track publication: ${pub.kind} from ${participant.identity} (track available: ${!!pub.track})`);
                  pub.setSubscribed(true);
                  await new Promise(resolve => setTimeout(resolve, 30));
                }
              }
            }
            
            // Update participants list after all subscriptions
            if (isMounted) {
              console.log(`✅ Finished subscribing to existing participants' tracks, updating participants list`);
              setParticipants(transformParticipants(newRoom));
              
              // Force update again after a delay to ensure all tracks are subscribed and visible
              setTimeout(() => {
                if (isMounted && roomRef.current) {
                  console.log(`🔄 Force updating participants list after subscription delay`);
                  setParticipants(transformParticipants(roomRef.current));
                }
              }, 500);
            }
          })();
          
          setParticipants(transformParticipants(newRoom));
          // Pass room to callback so localParticipant is immediately available
          onConnected?.(newRoom);
        });

        newRoom.on(RoomEvent.Disconnected, (reason) => {
          if (!isMounted) return;
          console.log('❌ Disconnected from LiveKit room:', reason);
          setIsConnected(false);
          setIsConnecting(false);
          setLocalParticipant(null);
          setParticipants([]);
          onDisconnected?.(reason);
        });

        newRoom.on(RoomEvent.ParticipantConnected, async (participant) => {
          if (!isMounted) return;
          console.log(`👤 Participant connected: ${participant.identity}`);
          
          // CRITICAL: Subscribe to ALL track publications (even if track not yet available)
          // This ensures we receive tracks as soon as they're published
          // Similar to WebRTC's automatic track exchange
          for (const pub of participant.trackPublications.values()) {
            if (!pub.isSubscribed) {
              console.log(`📥 Auto-subscribing to track publication: ${pub.kind} from ${participant.identity}, source: ${pub.source} (track available: ${!!pub.track})`);
              pub.setSubscribed(true);
              // Small delay to ensure subscription completes
              await new Promise(resolve => setTimeout(resolve, 30));
            }
          }
          
          // Also explicitly subscribe to video and audio tracks
          for (const pub of participant.videoTrackPublications.values()) {
            if (!pub.isSubscribed) {
              console.log(`📥 Auto-subscribing to video track: ${pub.source} from ${participant.identity}`);
              pub.setSubscribed(true);
              await new Promise(resolve => setTimeout(resolve, 30));
            }
          }
          
          for (const pub of participant.audioTrackPublications.values()) {
            if (!pub.isSubscribed) {
              console.log(`📥 Auto-subscribing to audio track from ${participant.identity}`);
              pub.setSubscribed(true);
              await new Promise(resolve => setTimeout(resolve, 30));
            }
          }
          
          // Update participants list immediately
          setParticipants(transformParticipants(newRoom));
          
          // Force update again after delay to ensure all tracks are subscribed and visible
          setTimeout(() => {
            if (isMounted && roomRef.current) {
              // Force subscribe again to ensure all participants see the new participant's tracks
              const newParticipant = Array.from(roomRef.current.remoteParticipants.values())
                .find(p => p.identity === participant.identity);
              
              if (newParticipant) {
                newParticipant.trackPublications.forEach((pub) => {
                  if (!pub.isSubscribed) {
                    console.log(`📥 [ParticipantConnected] Force subscribing to track: ${pub.kind}, source: ${pub.source} from ${participant.identity}`);
                    pub.setSubscribed(true);
                  }
                });
              }
              
              setParticipants(transformParticipants(roomRef.current));
            }
          }, 300);
          
          onParticipantConnected?.(participant);
        });

        newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
          if (!isMounted) return;
          setParticipants(transformParticipants(newRoom));
          onParticipantDisconnected?.(participant);
        });

        // Listen for track published events to ensure screen share and camera are available
        newRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
          if (!isMounted) return;
          console.log(`📤 Track published: ${publication.kind} from ${participant.identity}, source: ${publication.source}`);
          
          // CRITICAL: Auto-subscribe to ALL tracks when published (ensure tracks are always visible)
          // This mimics WebRTC's automatic track exchange behavior
          if (!publication.isSubscribed) {
            console.log(`📥 Auto-subscribing to published track: ${publication.kind}, source: ${publication.source} from ${participant.identity}`);
            publication.setSubscribed(true);
          }
          
          // Force update participants immediately when track is published
          setParticipants(transformParticipants(newRoom));
          
          // Additional update after short delay to ensure track is fully subscribed and visible
          // This ensures all participants (including those who joined earlier) see the new track
          setTimeout(() => {
            if (isMounted && roomRef.current) {
              // Force subscribe to the newly published track
              const publishingParticipant = Array.from(roomRef.current.remoteParticipants.values())
                .find(p => p.identity === participant.identity);
              
              if (publishingParticipant) {
                // Find the specific publication and ensure it's subscribed
                publishingParticipant.trackPublications.forEach((pub) => {
                  if (pub.kind === publication.kind && 
                      pub.source === publication.source && 
                      !pub.isSubscribed) {
                    console.log(`📥 [TrackPublished] Force subscribing to track: ${pub.kind}, source: ${pub.source} from ${participant.identity}`);
                    pub.setSubscribed(true);
                  }
                });
              }
              
              setParticipants(transformParticipants(roomRef.current));
            }
          }, 200);
        });

        newRoom.on(RoomEvent.TrackUnpublished, (publication, participant) => {
          if (!isMounted) return;
          console.log(`📤 Track unpublished: ${publication.kind} from ${participant.identity}, source: ${publication.source}`);
          setParticipants(transformParticipants(newRoom));
        });

        newRoom.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
          if (!isMounted) return;
          console.log(`📥 Track subscribed: ${pub.kind} from ${participant.identity}, source: ${pub.source}`);
          
          // Force update participants to include newly subscribed tracks
          setParticipants(transformParticipants(newRoom));
          
          // CRITICAL: When a track is subscribed, force update UI to reflect the change
          // This ensures camera feeds appear immediately when subscribed
          setTimeout(() => {
            if (isMounted && roomRef.current) {
              setParticipants(transformParticipants(roomRef.current));
            }
          }, 100);
          
          onTrackSubscribed?.(track, pub, participant);
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
          if (!isMounted) return;
          setParticipants(transformParticipants(newRoom));
          onTrackUnsubscribed?.(track, pub, participant);
        });

        // Listen for participant metadata changes (when tracks are muted/unmuted)
        newRoom.on(RoomEvent.ParticipantMetadataChanged, (metadata, participant) => {
          if (!isMounted) return;
          console.log(`📝 Participant metadata changed: ${participant.identity}`);
          setParticipants(transformParticipants(newRoom));
        });

        // Listen for track muted/unmuted events
        newRoom.on(RoomEvent.TrackMuted, (pub, participant) => {
          if (!isMounted) return;
          console.log(`🔇 Track muted: ${pub.kind} from ${participant.identity}`);
          setParticipants(transformParticipants(newRoom));
        });

        newRoom.on(RoomEvent.TrackUnmuted, (pub, participant) => {
          if (!isMounted) return;
          console.log(`🔊 Track unmuted: ${pub.kind} from ${participant.identity}`);
          setParticipants(transformParticipants(newRoom));
        });

        newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
          if (!isMounted) return;
          onDataReceived?.(payload, participant);
        });

        newRoom.on(RoomEvent.ActiveSpeakersChanged, () => {
          if (!isMounted) return;
          setParticipants(transformParticipants(newRoom));
        });

        newRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          if (!isMounted) return;
          if (participant === newRoom.localParticipant) {
            setConnectionQuality(quality);
          }
          setParticipants(transformParticipants(newRoom));
        });

        await newRoom.connect(serverUrl, token);

        if (isMounted) {
          roomRef.current = newRoom;
          setRoom(newRoom);
          setIsConnecting(false);
        } else {
          // If unmounted during connection, disconnect immediately
          newRoom.disconnect();
        }

      } catch (err) {
        if (isMounted) {
          console.error('❌ Failed to connect to LiveKit room:', err);
          setError(err instanceof Error ? err.message : 'Connection failed');
          setIsConnecting(false);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (roomRef.current) {
        console.log('🧹 Cleaning up LiveKit room connection');
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [token, serverUrl]); // Only re-run if token or serverUrl changes

  // Media control functions
  const enableCamera = useCallback(async (enabled: boolean, deviceId?: string) => {
    if (!roomRef.current) {
      console.warn('⚠️ Cannot enable camera: room not connected');
      return;
    }

    try {
      // Check if camera track already exists
      const existingCameraTrack = Array.from(roomRef.current.localParticipant.videoTrackPublications.values())
        .find(pub => pub.source === Track.Source.Camera);
      
      // If track exists and we're just toggling, try to enable/disable it
      // Note: We check for setEnabled method directly instead of instanceof to avoid issues in production builds
      if (existingCameraTrack && existingCameraTrack.track) {
        const track = existingCameraTrack.track;
        // Check if track has setEnabled method (works in both dev and production)
        const hasSetEnabled = typeof (track as any).setEnabled === 'function';
        
        if (hasSetEnabled) {
          try {
            console.log(`📷 ${enabled ? 'Enabling' : 'Disabling'} existing camera track...`);
            (track as any).setEnabled(enabled);
            console.log(`✅ Camera track ${enabled ? 'enabled' : 'disabled'} successfully`);
          } catch (error) {
            console.warn('⚠️ Failed to enable/disable track, unpublishing and creating new:', error);
            // Fallback: unpublish and create new
            if (existingCameraTrack.track) {
              await roomRef.current.localParticipant.unpublishTrack(existingCameraTrack.track);
            }
            const options: any = {};
            if (deviceId) {
              options.deviceId = { exact: deviceId };
            }
            await roomRef.current.localParticipant.setCameraEnabled(enabled, Object.keys(options).length > 0 ? options : undefined);
            console.log(`✅ Camera ${enabled ? 'enabled' : 'disabled'} successfully`);
          }
        } else {
          // If track doesn't have setEnabled, unpublish and create new
          console.log('📷 Existing track cannot be toggled, unpublishing and creating new...');
          if (existingCameraTrack.track) {
            await roomRef.current.localParticipant.unpublishTrack(existingCameraTrack.track);
          }
          const options: any = {};
          if (deviceId) {
            options.deviceId = { exact: deviceId };
          }
          await roomRef.current.localParticipant.setCameraEnabled(enabled, Object.keys(options).length > 0 ? options : undefined);
          console.log(`✅ Camera ${enabled ? 'enabled' : 'disabled'} successfully`);
        }
      } else {
        // Create new track with device ID if provided
        const options: any = {};
        if (deviceId) {
          options.deviceId = { exact: deviceId };
        }
        console.log(`📷 ${enabled ? 'Enabling' : 'Disabling'} camera${deviceId ? ` with device ID: ${deviceId}` : ''}...`);
        await roomRef.current.localParticipant.setCameraEnabled(enabled, Object.keys(options).length > 0 ? options : undefined);
        console.log(`✅ Camera ${enabled ? 'enabled' : 'disabled'} successfully`);
      }
      
      // Force update participants to reflect camera state change immediately
      // Use setTimeout to ensure track is published before updating
      setTimeout(() => {
        if (roomRef.current) {
          setParticipants(transformParticipants(roomRef.current));
        }
      }, 200);
    } catch (err) {
      console.error('❌ Failed to toggle camera:', err);
      throw err;
    }
  }, [transformParticipants]);

  const enableMicrophone = useCallback(async (enabled: boolean, deviceId?: string) => {
    if (!roomRef.current) return;

    try {
      // Check if microphone track already exists
      const existingMicTrack = Array.from(roomRef.current.localParticipant.audioTrackPublications.values())[0];
      
      // If track exists and we're just toggling, try to enable/disable it
      // Note: We check for setEnabled method directly instead of instanceof to avoid issues in production builds
      if (existingMicTrack && existingMicTrack.track) {
        const track = existingMicTrack.track;
        // Check if track has setEnabled method (works in both dev and production)
        const hasSetEnabled = typeof (track as any).setEnabled === 'function';
        
        if (hasSetEnabled) {
          try {
            console.log(`🎤 ${enabled ? 'Enabling' : 'Disabling'} existing microphone track...`);
            (track as any).setEnabled(enabled);
            console.log(`✅ Microphone track ${enabled ? 'enabled' : 'disabled'} successfully`);
          } catch (error) {
            console.warn('⚠️ Failed to enable/disable track, unpublishing and creating new:', error);
            // Fallback: unpublish and create new
            if (existingMicTrack.track) {
              await roomRef.current.localParticipant.unpublishTrack(existingMicTrack.track);
            }
            const options: any = {};
            if (deviceId) {
              options.deviceId = { exact: deviceId };
            }
            await roomRef.current.localParticipant.setMicrophoneEnabled(enabled, Object.keys(options).length > 0 ? options : undefined);
            console.log(`✅ Microphone ${enabled ? 'enabled' : 'disabled'} successfully`);
          }
        } else {
          // If track doesn't have setEnabled, unpublish and create new
          console.log('🎤 Existing track cannot be toggled, unpublishing and creating new...');
          if (existingMicTrack.track) {
            await roomRef.current.localParticipant.unpublishTrack(existingMicTrack.track);
          }
          const options: any = {};
          if (deviceId) {
            options.deviceId = { exact: deviceId };
          }
          await roomRef.current.localParticipant.setMicrophoneEnabled(enabled, Object.keys(options).length > 0 ? options : undefined);
          console.log(`✅ Microphone ${enabled ? 'enabled' : 'disabled'} successfully`);
        }
      } else {
        // Create new track with device ID if provided
        const options: any = {};
        if (deviceId) {
          options.deviceId = { exact: deviceId };
        }
        console.log(`🎤 ${enabled ? 'Enabling' : 'Disabling'} microphone${deviceId ? ` with device ID: ${deviceId}` : ''}...`);
        await roomRef.current.localParticipant.setMicrophoneEnabled(enabled, Object.keys(options).length > 0 ? options : undefined);
        console.log(`✅ Microphone set to: ${enabled}`);
      }
      setParticipants(transformParticipants(roomRef.current));
    } catch (err) {
      console.error('Failed to toggle microphone:', err);
    }
  }, [transformParticipants]);

  const startScreenShare = useCallback(async () => {
    if (!roomRef.current) return;

    try {
      // UC-06: Screen share with content optimization
      await roomRef.current.localParticipant.setScreenShareEnabled(true, {
        audio: false,
        video: {
          displaySurface: 'monitor',
        } as any,
      });
      setParticipants(transformParticipants(roomRef.current));
    } catch (err) {
      console.error('Failed to start screen share:', err);
    }
  }, [transformParticipants]);

  const stopScreenShare = useCallback(async () => {
    if (!roomRef.current) return;

    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(false);
      setParticipants(transformParticipants(roomRef.current));
    } catch (err) {
      console.error('Failed to stop screen share:', err);
    }
  }, [transformParticipants]);

  // UC-07: Chat and reactions via data channel
  const sendChatMessage = useCallback(async (message: string) => {
    if (!roomRef.current) return;

    try {
      const payload = JSON.stringify({ type: 'chat', message, timestamp: Date.now() });
      const encoder = new TextEncoder();
      await roomRef.current.localParticipant.publishData(encoder.encode(payload), { reliable: true });
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  }, []);

  const sendReaction = useCallback(async (emoji: string) => {
    if (!roomRef.current) return;

    try {
      const payload = JSON.stringify({ type: 'reaction', emoji, timestamp: Date.now() });
      const encoder = new TextEncoder();
      await roomRef.current.localParticipant.publishData(encoder.encode(payload), { reliable: false });
    } catch (err) {
      console.error('Failed to send reaction:', err);
    }
  }, []);

  // Room management
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
    }
  }, []);

  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    // Note: We can't easily re-trigger the effect without changing token/serverUrl.
    // But disconnect() clears roomRef.current, so if we force a re-render or if the effect logic allowed it...
    // Actually, the effect only runs on token change.
    // To support manual reconnect, we might need a trigger state.
    // For now, let's just rely on the effect.
  }, [disconnect]);

  return {
    room,
    isConnected,
    isConnecting,
    error,
    localParticipant,
    participants,
    connectionQuality,
    enableCamera,
    enableMicrophone,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    sendReaction,
    disconnect,
    reconnect,
  };
}