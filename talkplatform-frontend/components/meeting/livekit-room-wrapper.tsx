"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useLiveKit, LiveKitParticipant } from '@/hooks/use-livekit';
import { useMeetingSocket } from '@/hooks/use-meeting-socket';
import { useMeetingMedia } from '@/hooks/use-meeting-media';
import { useMeetingJoin } from '@/hooks/use-meeting-join';
import { WaitingRoomHostPanel } from './waiting-room-host-panel';
import { GreenRoom, DeviceSettings } from './green-room';
import { MeetingControls } from './meeting-controls';
import { useReactions } from './reaction-overlay';
import { MeetingChat } from '../../section/meetings/meeting-chat';
import { LiveKitBandwidthMonitor } from './livekit-bandwidth-monitor';
import { YouTubePlayer, YouTubePlayerHandle } from '../../section/meetings/youtube-player';
import { YouTubeSearchModal } from '../youtube-search-modal';
import { MeetingDialogs } from './meeting-dialogs';
import { useMeetingYouTube } from '@/hooks/use-meeting-youtube';
import { useMeetingChat } from '@/hooks/use-meeting-chat';
import { useMeetingParticipants } from '@/hooks/use-meeting-participants';
import { useYouTubeControls } from '@/hooks/use-youtube-controls';
import {
  IMeetingChatMessage,
  MessageType,
  IMeetingParticipant,
  ParticipantRole,
  joinMeetingApi,
  joinPublicMeetingApi,
  leaveMeetingApi,
  leavePublicMeetingApi,
  lockMeetingApi,
  unlockMeetingApi,
  lockPublicMeetingApi,
  unlockPublicMeetingApi
} from '@/api/meeting.rest';
import { generateLiveKitTokenApi } from '@/api/livekit.rest';
import {
  VideoOff,
  MicOff,
  MessageSquare,
  X,
  Play,
  Users,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Crown,
  Shield,
  UserX,
  Smile,
  Send,
  Loader2,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Pause,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Video,
  Mic,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface LiveKitRoomWrapperProps {
  meetingId: string;
  meetingTitle?: string; // Optional meeting title - if not provided, will use meetingId
  user: {
    id: string;
    username: string;
    email: string;
  };
  onLeave: () => void;
  isHost?: boolean;
  isPublicMeeting?: boolean;
  classroomId?: string;
}

interface WaitingParticipant {
  userId: string;
  username: string;
  email: string;
  waitingTime: number;
  isConnected: boolean;
}

/**
 * UC-05: Main LiveKit SFU Room Component
 * Integrates Green Room, Waiting Room, LiveKit video conferencing, Socket.IO for chat/YouTube sync
 */
export function LiveKitRoomWrapper({
  meetingId,
  meetingTitle,
  user,
  onLeave,
  isHost = false,
  isPublicMeeting = true,
  classroomId,
}: LiveKitRoomWrapperProps) {
  // State management
  const [phase, setPhase] = useState<'green-room' | 'waiting' | 'meeting'>('green-room');
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitWsUrl, setLivekitWsUrl] = useState<string>('');
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings | null>(null);
  const [waitingMessage, setWaitingMessage] = useState<string>('');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const [isWaitingRoomEnabled, setIsWaitingRoomEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showPlayControls, setShowPlayControls] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(true);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [participantsRefreshKey, setParticipantsRefreshKey] = useState(0); // Force re-render key
  const [bandwidth, setBandwidth] = useState({
    inbound: 0,
    outbound: 0,
    latency: 0,
    quality: 'good' as 'excellent' | 'good' | 'poor',
  });

  // YouTube Player state
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [youtubeVolume, setYoutubeVolume] = useState(50);
  const youtubePlayerRef = useRef<YouTubePlayerHandle | null>(null);

  // Dialog states
  const [confirmKickOpen, setConfirmKickOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [targetParticipant, setTargetParticipant] = useState<{ id: string; userId?: string; name: string } | null>(null);

  // Chat input state (for MeetingChatPanel)
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // isJoining is now managed by useMeetingJoin hook

  const { toast } = useToast();
  const { addReaction, ReactionOverlay: ReactionComponent } = useReactions();

  // Socket.IO connection for chat, YouTube sync, and participant management
  // Note: isOnline will be calculated after participants hook
  const [isOnline, setIsOnline] = useState(false);

  // Use shared participants hook - MUST be declared before useMemo that uses participants
  const {
    participants,
    setParticipants,
    participantsFetched,
    setParticipantsFetched,
    fetchParticipants,
    handleKickParticipant: handleKickParticipantApi,
    handleBlockParticipant: handleBlockParticipantApi,
    handleMuteParticipant: handleMuteParticipantApi,
  } = useMeetingParticipants({
    meetingId,
    isPublicMeeting,
    classroomId,
  });

  // Check if user is online participant - MUST be after participants hook
  const currentParticipant = useMemo(() => {
    return participants.find(p => {
      const participantUserId = p.user?.id || (p.user as any)?.user_id;
      return participantUserId === user.id;
    });
  }, [participants, user.id]);

  // Update isOnline when currentParticipant changes
  useEffect(() => {
    setIsOnline(currentParticipant ? (currentParticipant.is_online !== false) : false);
  }, [currentParticipant]);

  // Meeting join hook
  const { joinMeeting, isJoining } = useMeetingJoin({
    meetingId,
    isPublicMeeting,
    classroomId,
    onJoinSuccess: (token, wsUrl, deviceSettings) => {
      console.log('✅ Join success, setting token (phase will be set when LiveKit connects)');
      setLivekitToken(token);
      setLivekitWsUrl(wsUrl);
      setDeviceSettings(deviceSettings);
      // Don't set phase here - let onConnected set it when LiveKit actually connects
    },
    onJoinError: (error) => {
      console.error('❌ Join error:', error);
      // Phase stays as 'green-room' on error
    },
  });

  // Socket.IO connection - MUST be after isOnline is set
  const { socket, isConnected: isSocketConnected, connectionError: socketError } = useMeetingSocket({
    meetingId: meetingId,
    userId: user.id,
    isOnline,
  });

  // Use shared chat hook
  const {
    chatMessages,
    setChatMessages,
    handleSendMessage: handleSendChatMessage,
    fetchChatMessages,
  } = useMeetingChat({
    socket,
    meetingId,
    isPublicMeeting,
    classroomId,
    isOnline,
  });

  // Use shared YouTube hook
  const {
    youtubeVideoId,
    youtubeIsPlaying,
    youtubeCurrentTime,
    setYoutubeVideoId,
    setYoutubeIsPlaying,
    setYoutubeCurrentTime,
  } = useMeetingYouTube({
    socket,
  });

  // LiveKit hook
  const {
    room,
    isConnected: isLiveKitConnected,
    isConnecting,
    error: livekitError,
    localParticipant,
    participants: livekitParticipants,
    enableCamera,
    enableMicrophone,
    startScreenShare,
    stopScreenShare,
    sendChatMessage: sendLiveKitChatMessage,
    sendReaction,
    disconnect,
  } = useLiveKit({
    token: livekitToken,
    serverUrl: livekitWsUrl,
    onConnected: async (connectedRoom) => {
      setPhase('meeting');
      toast({
        title: "Connected",
        description: "You have joined the meeting",
      });

      // Enable camera and microphone IMMEDIATELY based on deviceSettings from green-room
      // Use connectedRoom.localParticipant directly (guaranteed to be available)
      setTimeout(async () => {
        // Priority: deviceSettings (from green-room) > database state
        let shouldEnableCamera = deviceSettings?.videoEnabled ?? true;
        let shouldEnableMic = deviceSettings?.audioEnabled ?? true;

        // Override with database state if available (for rejoin scenarios)
        if (currentParticipant) {
          const dbIsMuted = (currentParticipant as any).is_muted ?? false;
          const dbIsVideoOff = (currentParticipant as any).is_video_off ?? false;
          shouldEnableCamera = !dbIsVideoOff;
          shouldEnableMic = !dbIsMuted;
        }

        // Use connectedRoom.localParticipant directly - it's guaranteed to be available
        const roomLocalParticipant = connectedRoom?.localParticipant;

        console.log('🎥 Enabling camera/mic on room connect:', {
          deviceSettings,
          shouldEnableCamera,
          shouldEnableMic,
          hasLocalParticipant: !!roomLocalParticipant,
          hasRoom: !!connectedRoom,
          hasMediaStream: !!deviceSettings?.mediaStream
        });

        if (roomLocalParticipant) {
          try {
            // 🔥 FIX: Reuse stream from green-room to avoid duplicate permission requests
            if (deviceSettings?.mediaStream) {
              console.log('🔄 Reusing media stream from green-room to avoid duplicate permission requests');
              const stream = deviceSettings.mediaStream;

              // Create LocalTracks from existing stream
              const videoTrack = stream.getVideoTracks()[0];
              const audioTrack = stream.getAudioTracks()[0];

              if (videoTrack && shouldEnableCamera) {
                // Enable camera (device selection handled by LiveKit)
                await enableCamera(true);
                setIsCameraEnabledState(true);
              } else if (!shouldEnableCamera) {
                await enableCamera(false);
                setIsCameraEnabledState(false);
              }

              if (audioTrack && shouldEnableMic) {
                // Enable microphone (device selection handled by LiveKit)
                await enableMicrophone(true);
                setIsMicEnabledState(true);
              } else if (!shouldEnableMic) {
                await enableMicrophone(false);
                setIsMicEnabledState(false);
              }
            } else {
              // Fallback: Create new tracks if no stream available
              if (shouldEnableCamera) {
                await enableCamera(true);
                setIsCameraEnabledState(true);
                console.log('✅ Camera enabled on room connect (new track)');
              } else {
                await enableCamera(false);
                setIsCameraEnabledState(false);
                console.log('✅ Camera disabled on room connect');
              }

              if (shouldEnableMic) {
                await enableMicrophone(true);
                setIsMicEnabledState(true);
                console.log('✅ Microphone enabled on room connect (new track)');
              } else {
                await enableMicrophone(false);
                setIsMicEnabledState(false);
                console.log('✅ Microphone disabled on room connect');
              }
            }
          } catch (error) {
            console.error('❌ Failed to enable camera/mic on room connect:', error);
          }
        } else {
          console.error('❌ localParticipant not available in connectedRoom');
        }
      }, 100); // Small delay to ensure everything is ready
    },
    onDisconnected: () => {
      onLeave();
    },
    onDataReceived: (payload, participant) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));

        if (data.type === 'chat') {
          // Skip LiveKit data channel chat messages - we only use Socket.IO for chat
          // This prevents duplicate messages
          return;
        } else if (data.type === 'reaction') {
          addReaction(data.emoji, user.id);
        }
      } catch (e) {
        console.error('Failed to parse received data:', e);
      }
    }
  });

  // Use meeting media hook for camera/mic state management
  // MUST be after currentParticipant and useLiveKit (for enableCamera, enableMicrophone, localParticipant)
  const {
    isMicEnabledState,
    isCameraEnabledState,
    handleToggleCamera: handleToggleCameraFromHook,
    handleToggleMicrophone: handleToggleMicrophoneFromHook,
    forceCameraState,
    forceMicState,
    setIsMicEnabledState,
    setIsCameraEnabledState,
  } = useMeetingMedia({
    currentParticipant,
    enableCamera,
    enableMicrophone,
    localParticipant,
  });

  // fetchParticipants and fetchChatMessages are now provided by hooks

  // Join meeting API - now handled by useMeetingJoin hook
  // This is only used for auto-join scenarios
  const handleJoinMeeting = useCallback(async () => {
    if (currentParticipant?.is_online || isJoining) return;

    try {
      // Use default device settings for auto-join
      const defaultSettings: DeviceSettings = {
        audioInput: '',
        videoInput: '',
        audioOutput: '',
        audioEnabled: true,
        videoEnabled: true,
        virtualBackground: false,
        backgroundBlur: 0,
        audioLevel: 0,
      };
      await joinMeeting(defaultSettings);
      await fetchParticipants();
    } catch (error: any) {
      console.error("Failed to join meeting:", error);
      // Error is already handled by useMeetingJoin hook
    }
  }, [currentParticipant, isJoining, joinMeeting, fetchParticipants]);

  // Initial data fetch
  useEffect(() => {
    fetchParticipants();
    fetchChatMessages();

    const interval = setInterval(() => {
      fetchParticipants();
      fetchChatMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchParticipants, fetchChatMessages]);

  // Auto-join when participant is fetched
  useEffect(() => {
    if (participantsFetched && !currentParticipant?.is_online && !isJoining && phase === 'meeting') {
      handleJoinMeeting();
    }
  }, [participantsFetched, currentParticipant, isJoining, phase, handleJoinMeeting]);

  // YouTube and Chat handlers are now in shared hooks - no need for duplicate code

  // Socket.IO: Participant updates
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data: { userId: string; userName?: string }) => {
      setParticipants(prev => {
        return prev.map(p => {
          const pid = p.user?.id || (p.user as any)?.user_id;
          if (pid === data.userId) {
            return { ...p, is_online: true } as IMeetingParticipant;
          }
          return p;
        });
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setParticipants(prev => prev.map(p => {
        const pid = p.user?.id || (p.user as any)?.user_id;
        if (pid === data.userId) {
          return { ...p, is_online: false } as IMeetingParticipant;
        }
        return p;
      }));
    };

    socket.on('meeting:user-joined', handleUserJoined);
    socket.on('meeting:user-left', handleUserLeft);

    return () => {
      socket.off('meeting:user-joined', handleUserJoined);
      socket.off('meeting:user-left', handleUserLeft);
    };
  }, [socket]);

  // Socket.IO: Host moderation enforcement
  // Use refs to prevent duplicate toast notifications
  const lastMuteEventRef = useRef<{ userId: string; isMuted: boolean; timestamp: number } | null>(null);
  const lastVideoEventRef = useRef<{ userId: string; isVideoOff: boolean; timestamp: number } | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleForceMute = (data: { userId: string; isMuted: boolean }) => {
      // Prevent duplicate events within 1 second
      const now = Date.now();
      const lastEvent = lastMuteEventRef.current;
      if (lastEvent &&
        lastEvent.userId === data.userId &&
        lastEvent.isMuted === data.isMuted &&
        (now - lastEvent.timestamp) < 1000) {
        console.log('⚠️ Duplicate mute event ignored:', data);
        return;
      }
      lastMuteEventRef.current = { ...data, timestamp: now };

      // If it's the current user, enforce the mute state
      if (data.userId === user.id) {
        // Update UI state immediately using hook
        forceMicState(!data.isMuted);

        // Always enforce the state from server (don't check current state)
        if (data.isMuted) {
          enableMicrophone(false);
          toast({
            title: "You have been muted by the host",
            description: "Your microphone has been turned off.",
            variant: "default"
          });
        } else {
          enableMicrophone(true);
          toast({
            title: "You have been unmuted by the host",
            description: "Your microphone has been turned on.",
            variant: "default"
          });
        }
      }

      // If host, refresh participants to update UI
      if (isHost) {
        console.log('🔄 Host: Participant mute state changed, refreshing UI', data);
        fetchParticipants();
        setParticipantsRefreshKey(prev => prev + 1); // Force re-render
      }
    };

    const handleForceVideoOff = (data: { userId: string; isVideoOff: boolean }) => {
      // Prevent duplicate events within 1 second
      const now = Date.now();
      const lastEvent = lastVideoEventRef.current;
      if (lastEvent &&
        lastEvent.userId === data.userId &&
        lastEvent.isVideoOff === data.isVideoOff &&
        (now - lastEvent.timestamp) < 1000) {
        console.log('⚠️ Duplicate video event ignored:', data);
        return;
      }
      lastVideoEventRef.current = { ...data, timestamp: now };

      // If it's the current user, enforce the video state
      if (data.userId === user.id) {
        const videoTracks = Array.from(localParticipant?.videoTrackPublications.values() || []);
        // Filter out screen share tracks, only check camera tracks
        const cameraTracks = videoTracks.filter(pub => pub.source !== 'screen_share');
        const hasVideoTrack = cameraTracks.length > 0 && cameraTracks[0].track !== undefined;
        // Check if video track is enabled (not muted and track exists)
        const isCurrentlyEnabled = hasVideoTrack && cameraTracks[0].track && !cameraTracks[0].track.isMuted;

        // Update UI state immediately using hook
        forceCameraState(!data.isVideoOff);

        console.log('🎥 Force video state check:', {
          userId: data.userId,
          isVideoOff: data.isVideoOff,
          hasVideoTrack,
          isCurrentlyEnabled,
          trackMuted: cameraTracks[0]?.track?.isMuted,
          uiStateUpdated: !data.isVideoOff
        });

        // Only change if state is different
        if (data.isVideoOff && isCurrentlyEnabled) {
          enableCamera(false);
          toast({
            title: "Your camera has been turned off",
            description: "The host has disabled your camera.",
            variant: "default"
          });
        } else if (!data.isVideoOff && !isCurrentlyEnabled) {
          enableCamera(true);
          toast({
            title: "Your camera has been turned on",
            description: "The host has enabled your camera.",
            variant: "default"
          });
        }
      }

      // If host, refresh participants to update UI
      if (isHost) {
        console.log('🔄 Host: Participant video state changed, refreshing UI', data);
        fetchParticipants();
        setParticipantsRefreshKey(prev => prev + 1); // Force re-render
      }
    };

    const handleForceStopShare = (data: { userId: string; isSharing: boolean }) => {
      if (data.userId === user.id && !data.isSharing) {
        const isSharing = Array.from(localParticipant?.videoTrackPublications.values() || [])
          .some(pub => pub.source === 'screen_share');
        if (isSharing) {
          stopScreenShare();
          toast({
            title: "Screen sharing stopped",
            description: "The host has stopped your screen sharing.",
            variant: "default"
          });
        }
      }
    };

    const handleKicked = (data: { userId: string; reason: string }) => {
      if (data.userId === user.id) {
        toast({
          title: "You have been kicked",
          description: data.reason,
          variant: "destructive",
        });
        setTimeout(() => {
          disconnect();
          onLeave();
        }, 3000);
      }
    };

    const handleBlocked = (data: { userId: string; reason: string }) => {
      if (data.userId === user.id) {
        toast({
          title: "You have been blocked",
          description: data.reason + ". You cannot rejoin this meeting.",
          variant: "destructive",
        });
        setTimeout(() => {
          disconnect();
          onLeave();
        }, 3000);
      }
    };

    socket.on('media:user-muted', handleForceMute);
    socket.on('media:user-video-off', handleForceVideoOff);
    socket.on('media:user-screen-share', handleForceStopShare);
    socket.on('user:kicked', handleKicked);
    socket.on('user:blocked', handleBlocked);

    return () => {
      socket.off('media:user-muted', handleForceMute);
      socket.off('media:user-video-off', handleForceVideoOff);
      socket.off('media:user-screen-share', handleForceStopShare);
      socket.off('user:kicked', handleKicked);
      socket.off('user:blocked', handleBlocked);
    };
  }, [socket, user.id, localParticipant, enableMicrophone, enableCamera, stopScreenShare, disconnect, onLeave, toast, isHost, fetchParticipants]);

  // Bandwidth monitoring
  useEffect(() => {
    if (!room || !isLiveKitConnected) return;

    // Bandwidth is now updated via LiveKitBandwidthMonitor callback
    // No need for mock data interval
  }, [room, isLiveKitConnected]);

  const handleJoin = async (settings: DeviceSettings) => {
    try {
      // Use join hook which handles both API join and token generation
      await joinMeeting(settings);
      // Refresh participants after successful join
      await fetchParticipants();
    } catch (error) {
      // Error is already handled by useMeetingJoin hook
      console.error('❌ Failed to join meeting:', error);
    }
  };

  const handleLeave = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeave = async () => {
    try {
      if (isPublicMeeting) {
        await leavePublicMeetingApi(meetingId);
      } else {
        await leaveMeetingApi(classroomId!, meetingId);
      }
    } catch (error) {
      console.error("Failed to leave meeting:", error);
    }
    disconnect();
    onLeave();
  };

  // Use handlers from hook
  const handleToggleCamera = handleToggleCameraFromHook;
  const handleToggleMicrophone = handleToggleMicrophoneFromHook;

  const handleToggleScreenShare = async () => {
    if (localParticipant) {
      const isSharing = Array.from(localParticipant.videoTrackPublications.values())
        .some(pub => pub.source === 'screen_share');
      if (isSharing) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    }
  };

  // handleSendChatMessage is now provided by useMeetingChat hook

  const handleSendReaction = async (emoji: string) => {
    await sendReaction(emoji);
    if (socket?.connected) {
      socket.emit('chat:reaction', { emoji });
    }
    addReaction(emoji, user.id);
  };

  // YouTube handlers - using shared hook
  const {
    handleYoutubeSelectVideo,
    handleYoutubeTogglePlay,
    handleYoutubeClear,
    handleYoutubeMute: handleYoutubeMuteBase,
  } = useYouTubeControls({
    socket,
    isHost,
    youtubePlayerRef,
    youtubeVideoId,
    youtubeIsPlaying,
    youtubeCurrentTime,
    setYoutubeVideoId,
    setYoutubeIsPlaying,
    setYoutubeCurrentTime,
    setShowVideoGrid,
  });

  const handleYoutubeMute = () => {
    handleYoutubeMuteBase();
    setYoutubeVolume(prev => (prev === 0 ? 50 : 0));
  };

  // Toggle video grid / YouTube player
  const handleToggleVideoGrid = () => {
    setShowVideoGrid(prev => !prev);
  };

  // Toggle lock room (host only)
  const handleToggleLockRoom = async () => {
    if (!isHost) return;
    try {
      if (isRoomLocked) {
        if (isPublicMeeting) {
          await unlockPublicMeetingApi(meetingId);
        } else {
          await unlockMeetingApi(classroomId!, meetingId);
        }
        setIsRoomLocked(false);
        toast({ title: "Success", description: "Meeting unlocked" });
      } else {
        if (isPublicMeeting) {
          await lockPublicMeetingApi(meetingId);
        } else {
          await lockMeetingApi(classroomId!, meetingId);
        }
        setIsRoomLocked(true);
        toast({ title: "Success", description: "Meeting locked" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to toggle lock",
        variant: "destructive",
      });
    }
  };

  // Refresh/reconnect LiveKit without resetting to green-room
  const handleRefresh = async () => {
    try {
      console.log('🔄 Refreshing LiveKit connection (preserving state)...');

      // Save current device settings to preserve state
      const currentSettings = deviceSettings || {
        audioInput: '',
        videoInput: '',
        audioOutput: '',
        audioEnabled: isMicEnabledState,
        videoEnabled: isCameraEnabledState,
        virtualBackground: false,
        backgroundBlur: 0,
        audioLevel: 0,
      };

      // Disconnect current LiveKit connection
      if (room) {
        console.log('🔌 Disconnecting current LiveKit connection...');
        await disconnect();
      }

      // Clear current token to force reconnection
      setLivekitToken(null);
      setLivekitWsUrl('');

      // Small delay to ensure disconnect completes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Request new token (will trigger reconnection)
      console.log('🔐 Requesting new LiveKit token...');
      const data = await generateLiveKitTokenApi(meetingId);

      if (!data || !data.token || !data.wsUrl) {
        throw new Error('Invalid token response from server');
      }

      console.log('✅ New LiveKit token received, reconnecting...');
      setLivekitToken(data.token);
      setLivekitWsUrl(data.wsUrl);

      // Restore device settings so camera/mic state is preserved
      setDeviceSettings(currentSettings);

      // Note: useLiveKit hook will automatically reconnect when token changes
      // Camera/mic state will be restored from deviceSettings in onConnected callback

      toast({
        title: "Reconnecting",
        description: "Refreshing connection while preserving your settings...",
      });
    } catch (error: any) {
      console.error("❌ Failed to refresh connection:", error);
      toast({
        title: "Error",
        description: "Failed to refresh connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Host participant management
  // UI handlers for opening dialogs
  const handleKickParticipant = (participantUserId: string, participantName: string) => {
    // Find participant by user_id to get participant.id (needed for API)
    const participant = participants.find(p => {
      const pid = p.user?.id || (p.user as any)?.user_id;
      return pid === participantUserId;
    });
    
    if (!participant) {
      console.error('❌ Participant not found for kick:', participantUserId);
      toast({
        title: "Error",
        description: "Participant not found",
        variant: "destructive",
      });
      return;
    }
    
    // Use participant.id (database ID) for API call, but user_id for socket
    setTargetParticipant({ 
      id: participant.id, // participant.id for API
      userId: participantUserId, // user_id for socket
      name: participantName 
    });
    setConfirmKickOpen(true);
  };

  const confirmKickParticipant = async () => {
    if (!targetParticipant) return;
    
    // Emit socket event for real-time notification
    if (socket?.connected && targetParticipant.userId) {
      socket.emit('admin:kick-user', {
        targetUserId: targetParticipant.userId,
        reason: 'Kicked by host'
      });
    }
    
    // Call API to actually kick (using participant.id, not user_id)
    try {
      await handleKickParticipantApi(targetParticipant.id, targetParticipant.name);
      setConfirmKickOpen(false);
      setTargetParticipant(null);
      
      // Refresh participants list
      await fetchParticipants();
      setParticipantsRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('❌ Error kicking participant:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to kick participant",
        variant: "destructive",
      });
    }
  };

  const handleBlockParticipant = (participantId: string, participantName: string) => {
    setTargetParticipant({ id: participantId, name: participantName });
    setConfirmBlockOpen(true);
  };

  const confirmBlockParticipant = async () => {
    if (!targetParticipant) return;
    // Emit socket event for real-time notification
    if (socket?.connected) {
      socket.emit('admin:block-user', {
        targetUserId: targetParticipant.id,
        reason: 'Blocked by host'
      });
    }
    // Call API to actually block
    await handleBlockParticipantApi(targetParticipant.id, targetParticipant.name);
    setConfirmBlockOpen(false);
    setTargetParticipant(null);
  };

  const handleMuteParticipant = async (participantUserId: string) => {
    try {
      // Find participant from database state (source of truth)
      const participant = participants.find(p => {
        const pid = p.user?.id || (p.user as any)?.user_id;
        return pid === participantUserId;
      });
      if (!participant) {
        console.error('❌ Participant not found for mute:', participantUserId);
        toast({
          title: "Error",
          description: "Participant not found",
          variant: "destructive",
        });
        return;
      }

      // Get current mute state from database (source of truth)
      const currentIsMuted = (participant as any).is_muted ?? false;
      const shouldMute = !currentIsMuted; // Toggle: if not muted, mute it; if muted, unmute it

      console.log('🔇 Muting participant:', {
        participantUserId,
        currentIsMuted,
        shouldMute,
        socketConnected: socket?.connected
      });

      // Emit socket event for real-time notification and database update
      // Socket event will handle both database update and broadcast
      if (socket?.connected) {
        socket.emit('admin:mute-user', {
          targetUserId: participantUserId,
          mute: shouldMute
        });

        toast({
          title: shouldMute ? `Muted participant` : `Unmuted participant`
        });
      } else {
        toast({
          title: "Error",
          description: "Socket not connected",
          variant: "destructive",
        });
        return;
      }

      // Force refresh participants to get updated state from database
      // Small delay to ensure database update is complete
      setTimeout(async () => {
        await fetchParticipants();
        setParticipantsRefreshKey(prev => prev + 1);
      }, 300);
    } catch (error) {
      console.error('❌ Error muting participant:', error);
      toast({
        title: "Error",
        description: "Failed to toggle mute",
        variant: "destructive",
      });
    }
  };

  const handleVideoOffParticipant = async (participantUserId: string) => {
    try {
      // Find participant from database state (source of truth)
      const participant = participants.find(p => {
        const pid = p.user?.id || (p.user as any)?.user_id;
        return pid === participantUserId;
      });
      if (!participant) {
        console.error('❌ Participant not found for video off:', participantUserId);
        toast({
          title: "Error",
          description: "Participant not found",
          variant: "destructive",
        });
        return;
      }

      // Get current video state from database (source of truth)
      const currentIsVideoOff = (participant as any).is_video_off ?? false;
      const shouldTurnOff = !currentIsVideoOff; // Toggle: if video on, turn off; if video off, turn on

      console.log('🎥 Toggling video for participant:', {
        participantUserId,
        currentIsVideoOff,
        shouldTurnOff,
        participantId: participant.id,
        socketConnected: socket?.connected
      });

      // Emit socket event for real-time notification and database update
      if (socket?.connected) {
        socket.emit('admin:video-off-user', {
          targetUserId: participantUserId,
          videoOff: shouldTurnOff
        });

        toast({
          title: shouldTurnOff ? `Turned off participant's camera` : `Turned on participant's camera`
        });
      } else {
        console.error('❌ Socket not connected');
        toast({
          title: "Error",
          description: "Socket not connected. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      // Force refresh participants to get updated state
      // Small delay to ensure database update is complete
      setTimeout(async () => {
        await fetchParticipants();
        setParticipantsRefreshKey(prev => prev + 1);
      }, 300);
    } catch (error) {
      console.error('❌ Error toggling camera:', error);
      toast({
        title: "Error",
        description: "Failed to toggle camera",
        variant: "destructive",
      });
    }
  };

  const handleStopScreenShareParticipant = async (participantUserId: string) => {
    try {
      if (socket?.connected) {
        // Use correct event name: admin:stop-share-user (not admin:stop-screen-share)
        socket.emit('admin:stop-share-user', {
          targetUserId: participantUserId
        });
        toast({ title: `Stopped participant's screen share` });
      } else {
        toast({
          title: "Error",
          description: "Socket not connected",
          variant: "destructive",
        });
        return;
      }
      
      // Force refresh participants to get updated state
      setTimeout(async () => {
        await fetchParticipants();
        setParticipantsRefreshKey(prev => prev + 1);
      }, 200);
    } catch (error) {
      console.error('❌ Error stopping screen share:', error);
      toast({
        title: "Error",
        description: "Failed to stop screen share",
        variant: "destructive",
      });
    }
  };

  // Host functions (placeholders)
  const handleAdmitParticipant = (userId: string) => { };
  const handleAdmitAllParticipants = () => { };
  const handleDenyParticipant = (userId: string) => { };
  const handleToggleWaitingRoom = () => setIsWaitingRoomEnabled(!isWaitingRoomEnabled);

  // Chat input handlers
  const handleChatInputSend = useCallback(async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !isOnline || isSending) return;

    try {
      setIsSending(true);
      await handleSendChatMessage(trimmedMessage);
      setNewMessage('');
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isOnline, isSending, handleSendChatMessage]);

  const handleChatInputKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatInputSend();
    }
  }, [handleChatInputSend]);

  const handleEmojiClick = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
    chatInputRef.current?.focus();
  }, []);

  // Get role icon
  const getRoleIcon = (role: ParticipantRole) => {
    if (role === ParticipantRole.HOST) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role === ParticipantRole.MODERATOR) return <Shield className="w-4 h-4 text-blue-500" />;
    return null;
  };

  if (phase === 'green-room') {
    return (
      <GreenRoom
        meetingTitle={meetingTitle || `Meeting ${meetingId}`}
        onJoinMeeting={handleJoin}
        onCancel={onLeave}
      />
    );
  }

  if (phase === 'waiting') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Waiting for Host</h2>
          <p>{waitingMessage || "The host will let you in shortly."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white relative flex">
      <ReactionComponent />

      {isHost && (
        <WaitingRoomHostPanel
          isHost={isHost}
          waitingParticipants={waitingParticipants}
          onAdmitParticipant={handleAdmitParticipant}
          onAdmitAllParticipants={handleAdmitAllParticipants}
          onDenyParticipant={handleDenyParticipant}
          onToggleWaitingRoom={handleToggleWaitingRoom}
          isWaitingRoomEnabled={isWaitingRoomEnabled}
          isVisible={showHostControls}
          onToggleVisibility={() => setShowHostControls(!showHostControls)}
        />
      )}

      <div className="flex-1 flex flex-col">
        {/* Header - Like image 1 */}
        <div className="px-4 py-2 bg-gray-800 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">Meeting {meetingId}</h1>

            {/* LiveKit Connection Status - Rounded rectangle like image 1 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg border border-gray-600">
              <span className="text-xs text-gray-300">LiveKit Connection</span>
              <div className={`w-2 h-2 rounded-full ${isSocketConnected && isLiveKitConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-white">
                Status: {isSocketConnected && isLiveKitConnected ? 'connected' : 'connecting'}
              </span>
            </div>
          </div>

          {/* Header Tabs */}
          <div className="flex items-center">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showParticipants ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={() => {
                setShowParticipants(true);
                setShowChat(false);
                setShowYouTubeSearch(false);
                // Auto-open sidebar if collapsed
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
            >
              <Users className="w-4 h-4 mr-1 inline" />
              Participants
            </button>
            <div className="w-px h-4 bg-gray-600"></div>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showChat ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={() => {
                setShowChat(true);
                setShowParticipants(false);
                setShowYouTubeSearch(false);
                // Auto-open sidebar if collapsed
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
            >
              <MessageSquare className="w-4 h-4 mr-1 inline" />
              Chat
            </button>
            <div className="w-px h-4 bg-gray-600"></div>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showYouTubeSearch ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={() => {
                setShowYouTubeSearch(!showYouTubeSearch);
                setShowParticipants(false);
                setShowChat(false);
                // Auto-open sidebar if collapsed
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
            >
              <Play className="w-4 h-4 mr-1 inline" />
              Play
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Video/YouTube Area */}
          <div className="flex-1 bg-gray-900 flex flex-col">
            {livekitError ? (
              <div className="flex-1 flex items-center justify-center">
                <Card className="p-6 text-center bg-gray-800 border-gray-700">
                  <p className="text-red-500 mb-4">Connection Error: {livekitError}</p>
                  <Button onClick={() => window.location.reload()}>Reload</Button>
                </Card>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                {/* Video Grid */}
                <div className={showVideoGrid ? "h-full flex" : "hidden"}>
                  {(() => {
                    // Find screen share participant - check tracks.screen (separate from camera video)
                    // Check both local and remote participants for screen share
                    const screenShareParticipant = livekitParticipants.find(p => {
                      const screenTrack = p.tracks.screen;
                      const hasScreenTrack = screenTrack && screenTrack.track;
                      if (hasScreenTrack) {
                        console.log(`🖥️ Found screen share from ${p.identity}, track subscribed: ${screenTrack.isSubscribed}`);
                      }
                      return hasScreenTrack && screenTrack.isSubscribed;
                    });
                    const hasScreenShare = !!screenShareParticipant;
                    // Regular participants are all participants (screen share is shown separately)
                    const regularParticipants = livekitParticipants;

                    if (hasScreenShare) {
                      // Layout with screen share: Screen share left, participants right of screen share
                      // Include ALL participants in the grid (camera tracks), screen share is shown separately
                      // This ensures camera is always visible, even when sharing screen

                      return (
                        <div className="flex-1 flex h-full gap-2 p-2">
                          {/* Screen Share - Full size on left */}
                          <div className={`flex-1 min-w-0 transition-all duration-300`}>
                            <div className="h-full w-full">
                              <ParticipantTile
                                key={`screen-${screenShareParticipant.identity}`}
                                participant={screenShareParticipant}
                                isScreenShare={true}
                              />
                            </div>
                          </div>

                          {/* Participants Grid - Vertical on right of screen share */}
                          {/* Show ALL participants including the one sharing screen (their camera will show) */}
                          {regularParticipants.length > 0 && (
                            <div className={`flex-shrink-0 flex flex-col gap-2 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed
                              ? 'w-80' // Expand when sidebar is collapsed
                              : 'w-64' // Normal width when sidebar is open
                              }`}>
                              {regularParticipants.map((participant) => (
                                <div key={participant.identity} className="flex-shrink-0">
                                  <ParticipantTile
                                    participant={participant}
                                    isCompact={true}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Normal grid layout when no screen share
                      // CRITICAL: Filter out duplicate participants (same identity)
                      // This prevents showing multiple tiles for the same participant
                      const uniqueParticipants = regularParticipants.filter((p, index, self) =>
                        index === self.findIndex(pp => pp.identity === p.identity)
                      );

                      return (
                        <div className="h-full overflow-auto p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {uniqueParticipants.map((participant) => (
                              <ParticipantTile
                                key={participant.identity}
                                participant={participant}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* YouTube Player */}
                <div className={showVideoGrid ? "hidden" : "h-full"}>
                  <YouTubePlayer
                    ref={youtubePlayerRef}
                    socket={socket}
                    isHost={isHost}
                    initialVideoId={youtubeVideoId || undefined}
                    initialCurrentTime={youtubeCurrentTime}
                    initialIsPlaying={youtubeIsPlaying}
                    volume={youtubeVolume}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {(showChat || showParticipants || showYouTubeSearch) && (
            <>
              {/* Sidebar Toggle Button - Positioned between content and sidebar */}
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-gray-700 hover:bg-gray-600 border border-gray-600 shadow-lg ${isSidebarCollapsed
                  ? 'right-2'
                  : 'right-[320px]' // 80 * 4 = 320px (w-80)
                  } transition-all duration-300`}
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              >
                {isSidebarCollapsed ? (
                  <ChevronLeft className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </Button>

              <div className={`bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
                } h-full`}>
                {/* Participants Panel */}
                {showParticipants && (
                  <ScrollArea className="flex-1 p-4 min-h-0">
                    <div className="space-y-2">
                      {participants.map((participant) => {
                        const participantUserId = participant.user?.id || (participant.user as any)?.user_id;
                        const isCurrentUser = participantUserId === user.id;
                        const canManageParticipant = isHost && !isCurrentUser && participant.role !== ParticipantRole.HOST;

                        return (
                          <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                            <div className="flex items-center gap-2 flex-1">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={(participant.user as any)?.avatar_url} />
                                <AvatarFallback>{(participant.user as any)?.name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-1">
                                  {getRoleIcon(participant.role)}
                                  <span className="text-sm text-white">{(participant.user as any)?.name || 'Unknown'}</span>
                                  {isCurrentUser && <span className="text-xs text-gray-400">(You)</span>}
                                </div>
                                <Badge variant={participant.is_online ? "default" : "secondary"} className="text-xs">
                                  {participant.is_online ? "Online" : "Offline"}
                                </Badge>
                              </div>
                            </div>

                            {/* Host actions */}
                            {canManageParticipant && participant.is_online && (() => {
                              // Get LiveKit participant for real-time state - identity format is "user-{userId}"
                              const livekitParticipant = livekitParticipants.find(p => {
                                // Match identity like "user-123" with userId "123"
                                const identityUserId = p.identity?.replace('user-', '');
                                return identityUserId === participantUserId || p.identity === `user-${participantUserId}` || p.identity === participantUserId;
                              });

                              // Get real-time states from LiveKit
                              const isMicMuted = livekitParticipant?.tracks.audio?.track?.isMuted ?? false;
                              const isVideoEnabled = !!livekitParticipant?.tracks.video?.track;
                              const isScreenSharing = !!livekitParticipant?.tracks.screen?.track;

                              // Also check database state as fallback (for when LiveKit hasn't updated yet)
                              // Database state from participant object
                              const dbIsMuted = (participant as any).is_muted ?? false;
                              const dbIsVideoOff = (participant as any).is_video_off ?? false;

                              // Use database state as source of truth (for host controls)
                              // LiveKit state is for display only, but host actions should be based on database
                              const finalIsMicMuted = dbIsMuted;
                              const finalIsVideoEnabled = !dbIsVideoOff;

                              console.log('🔍 Participant state check:', {
                                participantUserId,
                                livekitIdentity: livekitParticipant?.identity,
                                isMicMuted: finalIsMicMuted,
                                isVideoEnabled: finalIsVideoEnabled,
                                isScreenSharing,
                                dbIsMuted,
                                dbIsVideoOff,
                                refreshKey: participantsRefreshKey
                              });

                              return (
                                <div className="flex items-center gap-1">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-600"
                                        title="Manage participant"
                                      >
                                        <Shield className="w-4 h-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2 bg-gray-800 border-gray-700" align="end">
                                      <div className="flex flex-col gap-1">
                                        {/* Toggle Mic - shows opposite action */}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="w-full justify-start text-orange-400 hover:text-orange-300 hover:bg-gray-700"
                                          onClick={() => handleMuteParticipant(participantUserId)}
                                        >
                                          {finalIsMicMuted ? (
                                            <>
                                              <Mic className="w-4 h-4 mr-2" />
                                              Unmute mic
                                            </>
                                          ) : (
                                            <>
                                              <MicOff className="w-4 h-4 mr-2" />
                                              Mute mic
                                            </>
                                          )}
                                        </Button>

                                        {/* Toggle Camera - shows opposite action */}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="w-full justify-start text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                                          onClick={() => handleVideoOffParticipant(participantUserId)}
                                        >
                                          {finalIsVideoEnabled ? (
                                            <>
                                              <VideoOff className="w-4 h-4 mr-2" />
                                              Turn off camera
                                            </>
                                          ) : (
                                            <>
                                              <Video className="w-4 h-4 mr-2" />
                                              Turn on camera
                                            </>
                                          )}
                                        </Button>

                                        {/* Stop Screen Share - only show if sharing */}
                                        {isScreenSharing && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="w-full justify-start text-purple-400 hover:text-purple-300 hover:bg-gray-700"
                                            onClick={() => handleStopScreenShareParticipant(participantUserId)}
                                          >
                                            <MonitorOff className="w-4 h-4 mr-2" />
                                            Stop screen share
                                          </Button>
                                        )}

                                        <div className="h-px bg-gray-600 my-1" />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="w-full justify-start text-yellow-400 hover:text-yellow-300 hover:bg-gray-700"
                                          onClick={() => handleKickParticipant(participantUserId, (participant.user as any)?.name || 'Unknown')}
                                        >
                                          <UserX className="w-4 h-4 mr-2" />
                                          Kick
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-gray-700"
                                          onClick={() => handleBlockParticipant(participantUserId, (participant.user as any)?.name || 'Unknown')}
                                        >
                                          <VolumeX className="w-4 h-4 mr-2" />
                                          Block
                                        </Button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}

                {/* Chat Panel */}
                {showChat && (
                  <div className="flex-1 flex flex-col h-full min-h-0 relative z-10">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                      <h3 className="font-semibold">Meeting Chat</h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden relative">
                      <MeetingChat
                        messages={chatMessages}
                        isOnline={isOnline}
                        currentUserId={user.id}
                        onSendMessage={handleSendChatMessage}
                        onSendReaction={handleSendReaction}
                      />
                    </div>
                  </div>
                )}

                {/* YouTube Search Panel */}
                {showYouTubeSearch && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">
                    {/* Player Controls */}
                    {youtubeVideoId && (
                      <div className="p-4 border-b border-gray-800 bg-[#0f0f0f] flex-shrink-0">
                        <div className="flex flex-col gap-3">
                          {isHost && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleYoutubeTogglePlay}
                                className="flex-1 bg-[#272727] hover:bg-[#3f3f3f] text-white border-0"
                              >
                                {youtubeIsPlaying ? (
                                  <>
                                    <Pause className="w-4 h-4 mr-2" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Play
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleYoutubeClear}
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          <div className="flex items-center gap-3 bg-[#272727] rounded-lg px-3 py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleYoutubeMute}
                              className="text-gray-300 hover:text-white p-0 h-auto"
                            >
                              {youtubeVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </Button>
                            <Slider
                              value={[youtubeVolume]}
                              onValueChange={(v) => setYoutubeVolume(v[0])}
                              min={0}
                              max={100}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-xs text-gray-300 min-w-[36px] text-right">{youtubeVolume}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* YouTube Search Content */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <YouTubeSearchModal
                        open={true}
                        onClose={() => { }}
                        onSelectVideo={handleYoutubeSelectVideo}
                        isHost={isHost}
                        currentVideoId={youtubeVideoId}
                        isPlaying={youtubeIsPlaying}
                        volume={youtubeVolume}
                        onTogglePlay={handleYoutubeTogglePlay}
                        onClear={handleYoutubeClear}
                        onVolumeChange={setYoutubeVolume}
                        onMute={handleYoutubeMute}
                        embedded={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="p-4 bg-gray-800">
          <MeetingControls
            isCameraEnabled={isCameraEnabledState}
            isMicEnabled={isMicEnabledState}
            isScreenSharing={Array.from(localParticipant?.videoTrackPublications.values() || [])
              .some(pub => pub.source === 'screen_share')}
            onToggleCamera={handleToggleCamera}
            onToggleMicrophone={handleToggleMicrophone}
            onToggleScreenShare={handleToggleScreenShare}
            onLeave={handleLeave}
            onToggleVideoGrid={handleToggleVideoGrid}
            showVideoGrid={showVideoGrid}
            onToggleLockRoom={handleToggleLockRoom}
            isRoomLocked={isRoomLocked}
            isHost={isHost}
            onRefresh={handleRefresh}
            bandwidth={bandwidth}
            disabled={!isLiveKitConnected}
          />
        </div>
      </div>

      {/* Shared Dialogs Component */}
      <MeetingDialogs
        confirmLeaveOpen={showLeaveDialog}
        setConfirmLeaveOpen={setShowLeaveDialog}
        onConfirmLeave={confirmLeave}
        confirmKickOpen={confirmKickOpen}
        setConfirmKickOpen={setConfirmKickOpen}
        targetParticipant={targetParticipant}
        onConfirmKick={confirmKickParticipant}
        setTargetParticipant={setTargetParticipant}
        confirmBlockOpen={confirmBlockOpen}
        setConfirmBlockOpen={setConfirmBlockOpen}
        onConfirmBlock={confirmBlockParticipant}
        showRoomFullDialog={false}
        setShowRoomFullDialog={() => { }}
        onlineParticipantsCount={participants.filter(p => p.is_online).length}
        maxParticipants={100}
        isPublicMeeting={isPublicMeeting}
        blockedModalOpen={false}
        blockedMessage=""
        setBlockedModalOpen={() => { }}
      />
    </div>
  );
}

/**
 * Individual participant video tile component
 */
function ParticipantTile({ participant, isScreenShare = false, isCompact = false }: { participant: LiveKitParticipant; isScreenShare?: boolean; isCompact?: boolean }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [hasVideo, setHasVideo] = React.useState(false);

  // Determine which track to use: screen share track or camera video track
  const trackPublication = isScreenShare
    ? participant.tracks.screen  // Use screen share track when isScreenShare=true
    : participant.tracks.video;  // Use camera video track otherwise

  // Attach video track to video element
  // CRITICAL: Similar to WebRTC's RemoteVideo - attach track when it becomes available
  useEffect(() => {
    if (!videoRef.current || !trackPublication) {
      setHasVideo(false);
      return;
    }

    // Check if track is subscribed and has track object
    const isSubscribed = trackPublication.isSubscribed;
    const track = trackPublication.track;

    console.log(`🎥 [ParticipantTile] ${participant.identity} - Track state:`, {
      isSubscribed,
      hasTrack: !!track,
      source: trackPublication.source,
      isScreenShare
    });

    // If track is subscribed but track object not yet available, wait for it
    if (isSubscribed && track) {
      try {
        track.attach(videoRef.current);
        setHasVideo(true);
        console.log(`✅ Attached ${isScreenShare ? 'screen share' : 'video'} track for ${participant.identity}`);
      } catch (error) {
        console.error(`Failed to attach ${isScreenShare ? 'screen share' : 'video'} track for ${participant.identity}:`, error);
        setHasVideo(false);
      }

      return () => {
        if (track && videoRef.current) {
          try {
            track.detach(videoRef.current);
          } catch (error) {
            console.error(`Failed to detach ${isScreenShare ? 'screen share' : 'video'} track for ${participant.identity}:`, error);
          }
        }
      };
    } else {
      setHasVideo(false);
      if (isSubscribed && !track) {
        console.log(`⏳ Track subscribed but track object not yet available for ${participant.identity}, waiting...`);
      } else if (!isSubscribed) {
        console.log(`⚠️ Track not subscribed for ${participant.identity}`);
        // Force subscribe if not subscribed
        // Note: setSubscribed may not be available on all track publication types
        if (trackPublication && !trackPublication.isSubscribed) {
          const hasSetSubscribed = typeof (trackPublication as any).setSubscribed === 'function';
          if (hasSetSubscribed) {
            try {
              console.log(`📥 Force subscribing to track for ${participant.identity}`);
              (trackPublication as any).setSubscribed(true);
            } catch (error) {
              console.warn(`⚠️ Failed to subscribe to track for ${participant.identity}:`, error);
            }
          } else {
            console.warn(`⚠️ Track publication for ${participant.identity} does not support setSubscribed`);
          }
        }
      }
    }
  }, [trackPublication, trackPublication?.track, trackPublication?.isSubscribed, participant.identity, isScreenShare]);

  // Attach audio track to audio element
  useEffect(() => {
    const audioPublication = participant.tracks.audio;
    if (audioRef.current && audioPublication?.track) {
      try {
        audioPublication.track.attach(audioRef.current);
      } catch (error) {
        console.error(`Failed to attach audio track for ${participant.identity}:`, error);
      }

      return () => {
        if (audioPublication.track && audioRef.current) {
          try {
            audioPublication.track.detach(audioRef.current);
          } catch (error) {
            console.error(`Failed to detach audio track for ${participant.identity}:`, error);
          }
        }
      };
    }
  }, [participant.tracks.audio, participant.identity]);

  return (
    <Card className={`relative overflow-hidden bg-gray-800 border-gray-700 ${isScreenShare ? 'h-full w-full' : isCompact ? 'aspect-video w-full' : 'aspect-video'
      }`}>
      <CardContent className="p-0 h-full flex items-center justify-center relative">
        {/* Video Element */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${hasVideo ? 'block' : 'hidden'}`}
          playsInline
          autoPlay
          muted={participant.isLocal}
        />

        {/* Audio Element (hidden) */}
        <audio ref={audioRef} autoPlay />

        {/* Placeholder if no video */}
        {!hasVideo && (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-white">
                {participant.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <span className="text-sm">{participant.name || 'Unknown'}</span>
          </div>
        )}

        {/* Participant Info Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
          <div className="bg-black/50 px-2 py-1 rounded text-xs text-white flex items-center gap-2">
            <span>{participant.name || participant.identity} {participant.isLocal && '(You)'}</span>
            {participant.tracks.audio?.track?.isMuted ? (
              <MicOff className="w-3 h-3 text-red-400" />
            ) : (
              <div className={`w-2 h-2 rounded-full ${participant.isSpeaking ? 'bg-green-500' : 'bg-gray-400'}`} />
            )}
          </div>

          <Badge variant={participant.connectionQuality === 'excellent' ? 'default' : 'destructive'} className="text-[10px] h-5">
            {participant.connectionQuality}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
