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
} from 'livekit-client';

interface UseLiveKitProps {
  token: string | null;
  serverUrl: string;
  onConnected?: () => void;
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
      result.push({
        identity: local.identity,
        name: local.name,
        metadata: local.metadata,
        isLocal: true,
        isSpeaking: local.isSpeaking,
        connectionQuality: local.connectionQuality.toString(),
        tracks: {
          audio: Array.from(local.audioTrackPublications.values())[0],
          video: Array.from(local.videoTrackPublications.values())[0],
          screen: Array.from(local.videoTrackPublications.values()).find(
            pub => pub.source === Track.Source.ScreenShare
          ),
        },
      });
    }

    // Add remote participants
    room.remoteParticipants.forEach((participant) => {
      result.push({
        identity: participant.identity,
        name: participant.name,
        metadata: participant.metadata,
        isLocal: false,
        isSpeaking: participant.isSpeaking,
        connectionQuality: participant.connectionQuality.toString(),
        tracks: {
          audio: Array.from(participant.audioTrackPublications.values())[0],
          video: Array.from(participant.videoTrackPublications.values()).find(
            pub => pub.source === Track.Source.Camera
          ),
          screen: Array.from(participant.videoTrackPublications.values()).find(
            pub => pub.source === Track.Source.ScreenShare
          ),
        },
      });
    });

    return result;
  }, []);

  // Connect to LiveKit room
  const connectToRoom = useCallback(async () => {
    if (!token || !serverUrl || isConnecting) return;

    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('🔌 Connecting to LiveKit room...');
      
      const newRoom = new Room({
        // UC-05: Adaptive quality and simulcast
        adaptiveStream: true,
        dynacast: true,
        
        // UC-06: Screen share optimization
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
          },
          facingMode: 'user',
        },
        
        // Audio settings for optimal quality
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        
        // Data channel for chat/reactions (UC-07)
        publishDefaults: {
          simulcast: true,
          videoSimulcastLayers: [
            { scaleResolutionDownBy: 1, maxBitrate: 2_500_000 }, // High
            { scaleResolutionDownBy: 2, maxBitrate: 800_000 },   // Medium  
            { scaleResolutionDownBy: 4, maxBitrate: 200_000 },   // Low
          ],
        },
      });

      // Set up event listeners before connecting
      newRoom.on(RoomEvent.Connected, () => {
        console.log('✅ Connected to LiveKit room');
        setIsConnected(true);
        setIsConnecting(false);
        setLocalParticipant(newRoom.localParticipant);
        setParticipants(transformParticipants(newRoom));
        onConnected?.();
      });

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log('❌ Disconnected from LiveKit room:', reason);
        setIsConnected(false);
        setIsConnecting(false);
        setLocalParticipant(null);
        setParticipants([]);
        onDisconnected?.(reason);
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('👤 Participant connected:', participant.identity);
        setParticipants(transformParticipants(newRoom));
        onParticipantConnected?.(participant);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('👋 Participant disconnected:', participant.identity);
        setParticipants(transformParticipants(newRoom));
        onParticipantDisconnected?.(participant);
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('📺 Track subscribed:', track.kind, 'from', participant.identity);
        setParticipants(transformParticipants(newRoom));
        onTrackSubscribed?.(track, publication, participant);
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('📺 Track unsubscribed:', track.kind, 'from', participant.identity);
        setParticipants(transformParticipants(newRoom));
        onTrackUnsubscribed?.(track, publication, participant);
      });

      // UC-07: Data channel for chat and reactions
      newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        console.log('💬 Data received from:', participant?.identity || 'server');
        onDataReceived?.(payload, participant);
      });

      // UC-05: Active speaker detection
      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        console.log('🎤 Active speakers changed:', speakers.map(s => s.identity));
        setParticipants(transformParticipants(newRoom));
      });

      // Connection quality monitoring
      newRoom.on(RoomEvent.ConnectionQualityChanged, (quality: string, participant?: Participant) => {
        if (participant === newRoom.localParticipant) {
          setConnectionQuality(quality);
        }
        setParticipants(transformParticipants(newRoom));
      });

      // Connect to room
      await newRoom.connect(serverUrl, token);
      
      roomRef.current = newRoom;
      setRoom(newRoom);

    } catch (err) {
      console.error('❌ Failed to connect to LiveKit room:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
    }
  }, [token, serverUrl, isConnecting, transformParticipants, onConnected, onDisconnected, onParticipantConnected, onParticipantDisconnected, onTrackSubscribed, onTrackUnsubscribed, onDataReceived]);

  // Media control functions
  const enableCamera = useCallback(async (enabled: boolean) => {
    if (!roomRef.current) return;
    
    try {
      await roomRef.current.localParticipant.setCameraEnabled(enabled);
      setParticipants(transformParticipants(roomRef.current));
    } catch (err) {
      console.error('Failed to toggle camera:', err);
    }
  }, [transformParticipants]);

  const enableMicrophone = useCallback(async (enabled: boolean) => {
    if (!roomRef.current) return;
    
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
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
          frameRate: 15, // Optimized for text content by default
          displaySurface: 'monitor',
        },
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
      await roomRef.current.localParticipant.publishData(encoder.encode(payload), DataPacket_Kind.RELIABLE);
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  }, []);

  const sendReaction = useCallback(async (emoji: string) => {
    if (!roomRef.current) return;
    
    try {
      const payload = JSON.stringify({ type: 'reaction', emoji, timestamp: Date.now() });
      const encoder = new TextEncoder();
      await roomRef.current.localParticipant.publishData(encoder.encode(payload), DataPacket_Kind.LOSSY);
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
    await connectToRoom();
  }, [disconnect, connectToRoom]);

  // Auto-connect when token is available
  useEffect(() => {
    if (token && serverUrl && !room && !isConnecting) {
      connectToRoom();
    }

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, [token, serverUrl, room, isConnecting, connectToRoom]);

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